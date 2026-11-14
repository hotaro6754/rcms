import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { MAX_BYTES, removeStored, saveBuffer, sniff } from "@/lib/storage";
import { docxToPdf } from "@/lib/documents/docx-to-pdf";
import { pptxToPdf } from "@/lib/documents/pptx-to-pdf";
import { pdfPageCount } from "@/lib/documents/pdf";
import { refusalFor } from "@/lib/cms/screen";
import { courseOfLesson, lockedCheck, markEdited, transaction } from "./core";

/**
 * Lesson materials, presented in the lesson as formats beside the lesson video:
 *
 * - SLIDES  the deck: a PowerPoint (.pptx) or a PDF exported from it, shown slide by slide;
 * - READING the full study material: a PDF or a Word (.docx) file, shown page by page.
 *
 * Everything is view-only (spec LMS-14: no learner downloads at launch). PowerPoint and Word
 * files are converted to PDF on upload; learners are only ever sent server-rendered page
 * images of that PDF, never a file. The original upload is kept for staff as `sourceKey`.
 *
 * Removing a material from the draft archives the row rather than deleting it when a
 * released version lists it, so the released lesson keeps working.
 */

const Input = z.object({
  title: z.string().trim().min(3, "Give the material a title.").max(160),
  format: z.enum(["SLIDES", "READING"], { message: "Choose whether this is the slide deck or the reading material." }),
});

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const ACCEPTS: Record<"SLIDES" | "READING", Set<string>> = { SLIDES: new Set([PPTX, PDF]), READING: new Set([PDF, DOCX]) };

export async function addMaterial(actor: Actor, lessonId: string, input: { title: string; format: string }, file?: File | null) {
  await assertCan(actor, "content.edit");
  const parsed = Input.parse({ title: input.title, format: input.format });
  const refusal = refusalFor(parsed.title);
  if (refusal) throw new ServiceError(refusal);
  if (!(file instanceof File) || file.size === 0) throw new ServiceError(parsed.format === "SLIDES" ? "Choose the PowerPoint (.pptx) or its PDF." : "Choose the PDF or Word (.docx) file.");
  if (file.size > MAX_BYTES) throw new ServiceError(`Files must be ${Math.round(MAX_BYTES / (1024 * 1024))} MB or smaller.`);
  const courseId = await courseOfLesson(prisma, lessonId);
  await lockedCheck(prisma, courseId);

  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniff(bytes, file.name);
  if (!type || !ACCEPTS[parsed.format].has(type)) {
    throw new ServiceError(parsed.format === "SLIDES" ? "Slides must be a PowerPoint (.pptx) file or a PDF." : "Reading material must be a PDF or a Word (.docx) file.");
  }

  // The learner-facing file is always a PDF; Office files are converted and kept as the source.
  let pdf: Buffer = bytes;
  let note: string | null = null;
  if (type === PPTX) {
    try {
      const out = await pptxToPdf(bytes);
      pdf = out.pdf;
      if (out.method === "redrawn") note = "Slides were re-drawn from the deck's text and pictures (LibreOffice is not installed on this server). For an exact copy, export the deck from PowerPoint as a PDF and upload that.";
    } catch {
      throw new ServiceError("That PowerPoint file could not be read. Save it again as .pptx, or export it from PowerPoint as a PDF and upload that.");
    }
  } else if (type === DOCX) {
    try {
      pdf = await docxToPdf(bytes);
    } catch {
      throw new ServiceError("That Word file could not be read. Save it again as .docx, or export it as a PDF and upload that.");
    }
  }
  const pages = await pdfPageCount(pdf).catch(() => 0);
  if (!pages) throw new ServiceError("That file could not be opened as a document. Export it as a PDF and try again.");

  let fileKey: string;
  let sourceKey: string | null = null;
  try {
    fileKey = await saveBuffer("materials", pdf, file.name.replace(/\.(pptx|docx)$/i, ".pdf"));
    if (type !== PDF) sourceKey = await saveBuffer("materials", bytes, file.name);
  } catch {
    throw new ServiceError("The file could not be stored. Try again.");
  }

  const created = await transaction(async (tx) => {
    const r = await tx.resource.create({
      data: { lessonId, title: parsed.title, format: parsed.format, downloadable: false, fileKey, mimeType: PDF, sizeBytes: pdf.length, sourceKey, sourceMime: sourceKey ? type : null },
    });
    await markEdited(tx, courseId);
    return r;
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "Resource", entityId: created.id, after: { lessonId, title: created.title, format: parsed.format, sourceMime: type, pages, sizeBytes: created.sizeBytes } });
  return { ...created, courseId, pages, note };
}

/**
 * Learner downloads are disabled platform-wide (spec LMS-14). Kept so old callers fail with a
 * clear sentence instead of silently changing nothing.
 */
export async function setDownloadable(actor: Actor, resourceId: string, downloadable: boolean) {
  await assertCan(actor, "content.edit");
  if (downloadable) throw new ServiceError("Downloads are switched off: every lesson material is view-only.");
  const res = await prisma.resource.findUnique({ where: { id: resourceId }, select: { lessonId: true } });
  if (!res) throw new ServiceError("That material no longer exists.");
  const courseId = await courseOfLesson(prisma, res.lessonId);
  await prisma.resource.update({ where: { id: resourceId }, data: { downloadable: false } });
  return { courseId };
}

export async function removeMaterial(actor: Actor, resourceId: string) {
  await assertCan(actor, "content.edit");
  const res = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!res) throw new ServiceError("That material no longer exists.");
  const courseId = await courseOfLesson(prisma, res.lessonId);
  await lockedCheck(prisma, courseId);
  const inRelease = (await prisma.courseVersion.findMany({ where: { courseId }, select: { snapshot: true } })).some((v) => JSON.stringify(v.snapshot).includes(`"${resourceId}"`));
  await transaction(async (tx) => {
    if (inRelease) await tx.resource.update({ where: { id: resourceId }, data: { archivedAt: new Date() } });
    else await tx.resource.delete({ where: { id: resourceId } });
    await markEdited(tx, courseId);
  });
  // A stored file is shared by duplicated lessons; remove it only when nothing uses it.
  if (!inRelease) {
    const others = await prisma.resource.count({ where: { fileKey: res.fileKey } });
    if (!others) {
      await removeStored(res.fileKey);
      if (res.sourceKey) await removeStored(res.sourceKey).catch(() => {});
    }
  }
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: inRelease ? "archive" : "delete", entity: "Resource", entityId: resourceId, before: { title: res.title } });
  return { courseId, lessonId: res.lessonId };
}
