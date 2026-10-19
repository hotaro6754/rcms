"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import * as materials from "@/lib/services/cms/materials";

/** Lesson materials, from the CMS lesson editor. Permission is checked in the service. */
export async function addMaterial(lessonId: string, formData: FormData) {
  return attempt(async () => {
    const file = formData.get("file");
    const r = await materials.addMaterial(
      await requireActor(),
      lessonId,
      { title: String(formData.get("title") ?? ""), url: String(formData.get("url") ?? "") || null, downloadable: formData.get("downloadable") === "true" },
      file instanceof File ? file : null,
    );
    revalidatePath(`/admin/content/courses/${r.courseId}`, "layout");
    revalidatePath("/library");
  });
}

export async function deleteMaterial(resourceId: string) {
  return attempt(async () => {
    const r = await materials.removeMaterial(await requireActor(), resourceId);
    revalidatePath(`/admin/content/courses/${r.courseId}`, "layout");
    revalidatePath("/library");
  });
}

export async function setMaterialDownloadable(resourceId: string, downloadable: boolean) {
  return attempt(async () => {
    const r = await materials.setDownloadable(await requireActor(), resourceId, downloadable);
    revalidatePath(`/admin/content/courses/${r.courseId}`, "layout");
    revalidatePath("/library");
  });
}
