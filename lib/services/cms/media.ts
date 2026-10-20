import { z } from "zod";
import type { MediaKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { AUDIO_TYPES, DOCUMENT_TYPES, IMAGE_TYPES, MAX_BYTES, MAX_IMAGE_BYTES, saveBuffer, saveChecked, sniff } from "@/lib/storage";
import { refusalFor } from "@/lib/cms/screen";

/**
 * The media library. Uploads are type-sniffed and size-limited, stored privately, and served
 * by /api/media/[id] only to staff, to learners whose released course references the asset,
 * or to anyone when the asset is marked public (course thumbnails).
 *
 * Media is never deleted while referenced: replacing an image means uploading a new one and
 * pointing the block at it, so released versions keep showing what they were approved with.
 */

const MetaInput = z.object({
  title: z.string().trim().min(2, "Give the file a title.").max(200),
  altText: z.string().trim().max(300).optional().nullable(),
  isPublic: z.coerce.boolean().default(false),
});

export async function uploadMedia(actor: Actor, file: File, input: unknown) {
  await assertCan(actor, "media.manage");
  const meta = MetaInput.parse(input);
  const refusal = refusalFor(`${meta.title}\n${meta.altText ?? ""}`);
  if (refusal) throw new ServiceError(refusal);
  const isImage = file.type.startsWith("image/");
  let stored;
  try {
    stored = await saveChecked("media", file, isImage ? IMAGE_TYPES : new Set([...DOCUMENT_TYPES, ...AUDIO_TYPES]), isImage ? MAX_IMAGE_BYTES : MAX_BYTES);
  } catch (e) {
    throw new ServiceError(e instanceof Error ? e.message : "That upload was refused.");
  }
  const kind: MediaKind = IMAGE_TYPES.has(stored.mimeType) ? "IMAGE" : AUDIO_TYPES.has(stored.mimeType) ? "AUDIO" : "DOCUMENT";
  if (kind === "IMAGE" && !meta.altText) throw new ServiceError("Describe the image (alternative text) so it is accessible.");
  const asset = await prisma.mediaAsset.create({
    data: { kind, title: meta.title, altText: meta.altText ?? null, isPublic: meta.isPublic, fileKey: stored.fileKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, uploadedById: actor.id },
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "MediaAsset", entityId: asset.id, after: { title: asset.title, kind, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes } });
  return asset;
}

/** Stores a PDF that arrived with a document import, as a private document in the library. */
export async function saveDocumentBuffer(actor: Actor, bytes: Uint8Array, fileName: string) {
  await assertCan(actor, "content.edit");
  if (bytes.length > MAX_BYTES) throw new ServiceError(`Files must be ${Math.round(MAX_BYTES / (1024 * 1024))} MB or smaller.`);
  if (sniff(bytes, fileName) !== "application/pdf") throw new ServiceError("Only PDFs can be shown as a view-only document. To use a Word file, add a Design block and start it from the document.");
  const fileKey = await saveBuffer("media", bytes, fileName);
  const title = (fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Document").slice(0, 200);
  const asset = await prisma.mediaAsset.create({ data: { kind: "DOCUMENT", title, fileKey, mimeType: "application/pdf", sizeBytes: bytes.length, isPublic: false, uploadedById: actor.id } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "MediaAsset", entityId: asset.id, after: { title, kind: "DOCUMENT", mimeType: "application/pdf", sizeBytes: bytes.length } });
  return asset;
}

export async function updateMedia(actor: Actor, id: string, input: unknown) {
  await assertCan(actor, "media.manage");
  const meta = MetaInput.parse(input);
  await prisma.mediaAsset.update({ where: { id }, data: { title: meta.title, altText: meta.altText ?? null, isPublic: meta.isPublic } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "MediaAsset", entityId: id, after: meta });
}

/** Where an asset is used: draft blocks, released versions, course thumbnails. */
export async function mediaUsage(id: string) {
  const [blocks, versions, thumbnails] = await Promise.all([
    prisma.contentBlock.findMany({ where: { data: { path: ["mediaId"], equals: id } }, select: { lessonId: true, lesson: { select: { title: true } } } }),
    prisma.courseVersion.count({ where: { mediaIds: { has: id } } }),
    prisma.program.findMany({ where: { thumbnailId: id }, select: { id: true, name: true } }),
  ]);
  return { blocks, releasedVersions: versions, thumbnails };
}

export async function setMediaArchived(actor: Actor, id: string, archived: boolean) {
  await assertCan(actor, "media.manage");
  if (archived) {
    const use = await mediaUsage(id);
    if (use.blocks.length || use.thumbnails.length) {
      throw new ServiceError(`This file is used in ${use.blocks.length} lesson block(s) and ${use.thumbnails.length} course thumbnail(s). Replace it there first.`);
    }
  }
  await prisma.mediaAsset.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: archived ? "archive" : "restore", entity: "MediaAsset", entityId: id });
}
