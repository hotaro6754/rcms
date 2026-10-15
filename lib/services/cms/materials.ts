import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { ALLOWED_TYPES, LINK_TYPE, removeStored, saveChecked } from "@/lib/storage";
import { refusalFor } from "@/lib/cms/screen";
import { courseOfLesson, lockedCheck, markEdited, transaction } from "./core";

/**
 * Lesson materials: an uploaded file (type-sniffed, 25 MB) or an https link to one held
 * elsewhere. Learners reach them only through the access-checked download route.
 *
 * Removing a material from the draft archives the row rather than deleting it when a
 * released version lists it, so the released lesson's download keeps working.
 */

const Input = z.object({
  title: z.string().trim().min(3, "Give the material a title.").max(160),
  url: z
    .string()
    .trim()
    .url("That link does not look right.")
    .refine((u) => u.startsWith("https://"), "Links must start with https://.")
    .optional(),
});

export async function addMaterial(actor: Actor, lessonId: string, input: { title: string; url?: string | null }, file?: File | null) {
  await assertCan(actor, "content.edit");
  const parsed = Input.parse({ title: input.title, url: input.url || undefined });
  const refusal = refusalFor(parsed.title);
  if (refusal) throw new ServiceError(refusal);
  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile && !parsed.url) throw new ServiceError("Choose a file or paste a link.");
  const courseId = await courseOfLesson(prisma, lessonId);
  await lockedCheck(prisma, courseId);
  let stored: { fileKey: string; mimeType: string; sizeBytes: number | null };
  if (hasFile) {
    try {
      const s = await saveChecked("materials", file!, new Set(Object.keys(ALLOWED_TYPES)));
      stored = { fileKey: s.fileKey, mimeType: s.mimeType, sizeBytes: s.sizeBytes };
    } catch (e) {
      throw new ServiceError(e instanceof Error ? e.message : "That upload was refused.");
    }
  } else {
    stored = { fileKey: parsed.url!, mimeType: LINK_TYPE, sizeBytes: null };
  }
  const created = await transaction(async (tx) => {
    const r = await tx.resource.create({ data: { lessonId, title: parsed.title, ...stored } });
    await markEdited(tx, courseId);
    return r;
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "Resource", entityId: created.id, after: { lessonId, title: created.title, mimeType: created.mimeType, sizeBytes: created.sizeBytes } });
  return { ...created, courseId };
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
    if (!others) await removeStored(res.fileKey);
  }
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: inRelease ? "archive" : "delete", entity: "Resource", entityId: resourceId, before: { title: res.title } });
  return { courseId, lessonId: res.lessonId };
}
