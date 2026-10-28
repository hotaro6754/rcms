"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireActor } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import { siteTag } from "@/lib/site/content";
import * as site from "@/lib/services/site/pages";
import { str } from "./_form";

/** Refreshes the public page (and its cached copy) after a publish, reset or delete. */
function refresh(key: string, path?: string) {
  revalidateTag(siteTag(key));
  const custom = path && /^\/p\/([a-z0-9-]+)$/.exec(path);
  if (custom) revalidateTag(`site-slug:${custom[1]}`);
  if (path) revalidatePath(path);
  revalidatePath("/admin/site", "layout");
}

export async function saveSiteDraftAction(key: string, content: unknown, lockVersion: number) {
  return attempt(async () => {
    const r = await site.saveDraft(await requireActor(), key, content, lockVersion);
    revalidatePath(`/admin/site/${key}`);
    return r;
  });
}

export async function saveSiteDesignAction(key: string, path: string, design: unknown) {
  return attempt(async () => {
    await site.saveDesignField(await requireActor(), key, path, design);
    revalidatePath(`/admin/site/${key}`);
  });
}

export async function discardSiteDraftAction(key: string) {
  return attempt(async () => {
    await site.discardDraft(await requireActor(), key);
    revalidatePath(`/admin/site/${key}`);
  });
}

export async function publishSiteAction(key: string, opts: { note?: string; confirmLegal?: boolean }) {
  return attempt(async () => {
    const r = await site.publish(await requireActor(), key, opts);
    refresh(key, r.path);
    return r;
  });
}

export async function resetSitePageAction(key: string, opts: { confirmLegal?: boolean }) {
  return attempt(async () => {
    const r = await site.resetToDefault(await requireActor(), key, opts);
    refresh(key, r.path);
    return r;
  });
}

export async function restoreSiteVersionAction(key: string, version: number) {
  return attempt(async () => {
    await site.restoreVersion(await requireActor(), key, version);
    revalidatePath(`/admin/site/${key}`);
  });
}

export async function createCustomPageAction(fd: FormData) {
  return attempt(async () => {
    const r = await site.createCustomPage(await requireActor(), { title: str(fd, "title"), slug: str(fd, "slug") });
    revalidatePath("/admin/site");
    return { href: `/admin/site/${r.key}` };
  });
}

export async function renameCustomPageAction(key: string, title: string) {
  return attempt(async () => {
    await site.renameCustomPage(await requireActor(), key, title);
    revalidatePath(`/admin/site/${key}`);
  });
}

export async function deleteCustomPageAction(key: string) {
  return attempt(async () => {
    const r = await site.deleteCustomPage(await requireActor(), key);
    refresh(key, r.path);
  });
}
