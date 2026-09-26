"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireTrainer } from "@/lib/rbac";
import { ALLOWED_TYPES, LINK_TYPE, MAX_BYTES, removeStored, saveFile } from "@/lib/storage";

export type MaterialResult = { ok: true } | { ok: false; error: string };

const Input = z.object({
  title: z.string().trim().min(3, "Give the material a title.").max(160),
  url: z
    .string()
    .trim()
    .url("That link does not look right.")
    .refine((u) => u.startsWith("https://"), "Links must start with https://.")
    .optional(),
});

/**
 * Attach a material to a lesson: an uploaded file, or a link to one held elsewhere.
 * Trainer-gated and audited. Students reach it only through the access-checked download
 * route, never by a public URL.
 */
export async function addMaterial(lessonId: string, formData: FormData): Promise<MaterialResult> {
  const trainer = await requireTrainer();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const parsed = Input.safeParse({ title: formData.get("title"), url: formData.get("url") || undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!hasFile && !parsed.data.url) return { ok: false, error: "Choose a file or paste a link." };

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { programId: true } } } });
  if (!lesson) return { ok: false, error: "That lesson no longer exists." };

  let stored: { fileKey: string; mimeType: string; sizeBytes: number | null };
  if (hasFile) {
    if (!ALLOWED_TYPES[file.type]) return { ok: false, error: "Upload a PDF, Word, Excel, PowerPoint, CSV, text, ZIP or image file." };
    if (file.size > MAX_BYTES) return { ok: false, error: "Files must be 25 MB or smaller." };
    stored = await saveFile(file);
  } else {
    stored = { fileKey: parsed.data.url!, mimeType: LINK_TYPE, sizeBytes: null };
  }

  const created = await prisma.resource.create({ data: { lessonId, title: parsed.data.title, ...stored } });
  await audit({
    actorId: trainer.id,
    action: "create",
    entity: "Resource",
    entityId: created.id,
    after: { lessonId, title: created.title, mimeType: created.mimeType, sizeBytes: created.sizeBytes },
  });
  revalidatePath(`/studio/lesson/${lessonId}`);
  revalidatePath("/library");
  return { ok: true };
}

export async function deleteMaterial(resourceId: string): Promise<MaterialResult> {
  const trainer = await requireTrainer();
  const res = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!res) return { ok: false, error: "That material no longer exists." };
  await prisma.resource.delete({ where: { id: resourceId } });
  await removeStored(res.fileKey);
  await audit({ actorId: trainer.id, action: "delete", entity: "Resource", entityId: resourceId, before: { title: res.title } });
  revalidatePath(`/studio/lesson/${res.lessonId}`);
  revalidatePath("/library");
  return { ok: true };
}
