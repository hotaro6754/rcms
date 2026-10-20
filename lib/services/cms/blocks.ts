import type { BlockKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { blockText, parseBlock, BLOCK_SCHEMAS } from "@/lib/cms/blocks";
import { refusalFor } from "@/lib/cms/screen";
import { courseOfLesson, lessonSnapshot, lockedCheck, markEdited, nextSortOrder, recordRevision, transaction, type Tx } from "./core";
import { assertSameSet, stepMove } from "./structure";
import { designMediaIds, type Design } from "@/lib/design/schema";
import { readStored } from "@/lib/storage";
import { MAX_PDF_PAGES, PdfError, pdfPageCount } from "@/lib/documents/pdf";

/**
 * Lesson content blocks. Every change validates the block for its kind, screens its text
 * for identifiers that must never be published, and records a Lesson revision carrying the
 * full block list, which is what makes "restore the lesson as it was on Tuesday" possible.
 */

async function validate(tx: Tx, kind: BlockKind, data: unknown) {
  if (!(kind in BLOCK_SCHEMAS)) throw new ServiceError("Unknown block type.");
  const parsed = parseBlock(kind, data);
  if (!parsed.success) throw new ServiceError(parsed.error.issues[0]?.message ?? "Check the block.");
  const refusal = refusalFor(blockText(kind, parsed.data));
  if (refusal) throw new ServiceError(refusal);
  if (kind === "IMAGE") {
    const media = await tx.mediaAsset.findUnique({ where: { id: (parsed.data as { mediaId: string }).mediaId }, select: { kind: true, archivedAt: true } });
    if (!media || media.archivedAt || media.kind !== "IMAGE") throw new ServiceError("Choose an image from the media library.");
  }
  if (kind === "DESIGN") {
    const ids = designMediaIds((parsed.data as { design: Design }).design);
    if (ids.length) {
      const ok = await tx.mediaAsset.count({ where: { id: { in: ids }, kind: "IMAGE", archivedAt: null } });
      if (ok !== ids.length) throw new ServiceError("An image in this design is no longer in the media library. Choose another.");
    }
  }
  if (kind === "DOCUMENT") {
    const d = parsed.data as { mediaId: string };
    const media = await tx.mediaAsset.findUnique({ where: { id: d.mediaId }, select: { kind: true, archivedAt: true, mimeType: true, fileKey: true } });
    if (!media || media.archivedAt || media.mimeType !== "application/pdf") throw new ServiceError("Choose a PDF from the list, or upload a PDF or Word file here.");
    const body = await readStored(media.fileKey).catch(() => null);
    if (!body) throw new ServiceError("That PDF is missing from storage. Upload it again.");
    let pages: number;
    try {
      pages = await pdfPageCount(body);
    } catch (e) {
      throw new ServiceError(e instanceof PdfError ? e.message : "That PDF could not be read.");
    }
    if (pages > MAX_PDF_PAGES) throw new ServiceError(`Documents can have at most ${MAX_PDF_PAGES} pages. Split this one.`);
    return { ...d, pages };
  }
  return parsed.data as object;
}

async function withLesson<T>(actor: Actor, lessonId: string, reason: string, fn: (tx: Tx) => Promise<T>) {
  return transaction(async (tx) => {
    const courseId = await courseOfLesson(tx, lessonId);
    await lockedCheck(tx, courseId);
    const before = await lessonSnapshot(tx, lessonId);
    const out = await fn(tx);
    await tx.lesson.update({ where: { id: lessonId }, data: { lockVersion: { increment: 1 } } });
    await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: "Lesson", entityId: lessonId, courseId, editorId: actor.id, reason, before, after: await lessonSnapshot(tx, lessonId) });
    return out;
  });
}

function log(actor: Actor, action: "create" | "update" | "delete" | "move" | "duplicate", id: string | null, after?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity: "ContentBlock", entityId: id, after });
}

export async function addBlock(actor: Actor, lessonId: string, kind: BlockKind, data: unknown, position?: number) {
  await assertCan(actor, "content.edit");
  const block = await withLesson(actor, lessonId, `Added ${kind.toLowerCase()} block`, async (tx) => {
    const clean = await validate(tx, kind, data);
    const created = await tx.contentBlock.create({ data: { lessonId, kind, data: clean as never, sortOrder: await nextSortOrder(tx, "contentBlock", { lessonId }) } });
    if (position !== undefined) {
      const ids = (await tx.contentBlock.findMany({ where: { lessonId, id: { not: created.id } }, orderBy: { sortOrder: "asc" }, select: { id: true } })).map((b) => b.id);
      ids.splice(Math.max(0, Math.min(ids.length, position)), 0, created.id);
      for (const [i, id] of ids.entries()) await tx.contentBlock.update({ where: { id }, data: { sortOrder: i } });
    }
    return created;
  });
  await log(actor, "create", block.id, { lessonId, kind });
  return block;
}

/** `expectedUpdatedAt` guards against two editors overwriting each other's block. */
export async function updateBlock(actor: Actor, blockId: string, data: unknown, expectedUpdatedAt?: string) {
  await assertCan(actor, "content.edit");
  const existing = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!existing) throw new ServiceError("That block no longer exists.");
  await withLesson(actor, existing.lessonId, `Edited ${existing.kind.toLowerCase()} block`, async (tx) => {
    const clean = await validate(tx, existing.kind, data);
    const res = await tx.contentBlock.updateMany({
      where: { id: blockId, ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
      data: { data: clean as never },
    });
    if (res.count === 0) throw new ServiceError("Someone else changed this block after you opened it. Reload to see their version.");
  });
  await log(actor, "update", blockId, { lessonId: existing.lessonId, kind: existing.kind });
}

export async function deleteBlock(actor: Actor, blockId: string) {
  await assertCan(actor, "content.edit");
  const existing = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!existing) throw new ServiceError("That block no longer exists.");
  // Removing a block from a draft is an edit: the previous content stays in the lesson's
  // revision history and in any released version, so it is recoverable.
  await withLesson(actor, existing.lessonId, `Removed ${existing.kind.toLowerCase()} block`, async (tx) => {
    await tx.contentBlock.delete({ where: { id: blockId } });
    const ids = (await tx.contentBlock.findMany({ where: { lessonId: existing.lessonId }, orderBy: { sortOrder: "asc" }, select: { id: true } })).map((b) => b.id);
    for (const [i, id] of ids.entries()) await tx.contentBlock.update({ where: { id }, data: { sortOrder: i } });
  });
  await log(actor, "delete", blockId, { lessonId: existing.lessonId, kind: existing.kind });
}

export async function duplicateBlock(actor: Actor, blockId: string) {
  await assertCan(actor, "content.edit");
  const src = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!src) throw new ServiceError("That block no longer exists.");
  const block = await withLesson(actor, src.lessonId, `Duplicated ${src.kind.toLowerCase()} block`, async (tx) => {
    const ids = (await tx.contentBlock.findMany({ where: { lessonId: src.lessonId }, orderBy: { sortOrder: "asc" }, select: { id: true } })).map((b) => b.id);
    const created = await tx.contentBlock.create({ data: { lessonId: src.lessonId, kind: src.kind, data: src.data as never, sortOrder: ids.length } });
    ids.splice(ids.indexOf(blockId) + 1, 0, created.id);
    for (const [i, id] of ids.entries()) await tx.contentBlock.update({ where: { id }, data: { sortOrder: i } });
    return created;
  });
  await log(actor, "duplicate", block.id, { from: blockId });
  return block;
}

export async function reorderBlocks(actor: Actor, lessonId: string, orderedIds: string[]) {
  await assertCan(actor, "content.edit");
  await withLesson(actor, lessonId, "Reordered blocks", async (tx) => {
    const current = await tx.contentBlock.findMany({ where: { lessonId }, select: { id: true } });
    assertSameSet(current.map((b) => b.id), orderedIds);
    for (const [i, id] of orderedIds.entries()) await tx.contentBlock.update({ where: { id }, data: { sortOrder: i } });
  });
  await log(actor, "move", null, { lessonId, order: orderedIds });
}

export async function moveBlockStep(actor: Actor, blockId: string, direction: "up" | "down") {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId }, select: { lessonId: true } });
  if (!block) throw new ServiceError("That block no longer exists.");
  const ids = (await prisma.contentBlock.findMany({ where: { lessonId: block.lessonId }, orderBy: { sortOrder: "asc" }, select: { id: true } })).map((b) => b.id);
  await reorderBlocks(actor, block.lessonId, stepMove(ids, blockId, direction));
}

/**
 * Replaces a lesson's whole content in one step, keeping the lesson's identity (so learner
 * progress and links stay attached). The previous content stays in revision history.
 */
export async function replaceLessonContent(actor: Actor, lessonId: string, blocks: { kind: BlockKind; data: unknown }[], reason: string) {
  await assertCan(actor, "content.edit");
  if (!reason?.trim()) throw new ServiceError("Say why the content is being replaced. It goes into the version history.");
  if (blocks.length > 200) throw new ServiceError("A lesson can hold at most 200 blocks.");
  await withLesson(actor, lessonId, `Replaced content: ${reason.trim()}`, async (tx) => {
    const clean = [];
    for (const b of blocks) clean.push({ kind: b.kind, data: await validate(tx, b.kind, b.data) });
    await tx.contentBlock.deleteMany({ where: { lessonId } });
    if (clean.length) await tx.contentBlock.createMany({ data: clean.map((b, i) => ({ lessonId, kind: b.kind, data: b.data as never, sortOrder: i })) });
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "Lesson", entityId: lessonId, after: { replacedContent: true, blocks: blocks.length, reason } });
}
