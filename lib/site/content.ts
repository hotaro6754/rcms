import { unstable_cache } from "next/cache";
import { draftMode } from "next/headers";
import { prisma } from "@/lib/db";
import { can, getActor } from "@/lib/actor";
import { resolvePage, type PageContent, type PageDef } from "./fields";
import { customPage, type CustomPageDef } from "./pages/custom";

/**
 * Reading a page's copy on the public site.
 *
 * Visitors get the published edits merged over the copy in the code, cached until the next
 * publish (tag `site:<key>`). A Super Administrator who has turned on preview from the editor
 * sees the draft instead. If the database cannot be reached the page shows its original copy
 * rather than failing.
 */

export const siteTag = (key: string) => `site:${key}`;

const published = (key: string) =>
  unstable_cache(
    async () => {
      const row = await prisma.sitePage.findUnique({ where: { key }, select: { published: true, archivedAt: true } });
      return row && !row.archivedAt ? row.published : null;
    },
    ["site-page", key],
    { tags: ["site", siteTag(key)], revalidate: 3600 },
  )();

/** True when the current request is a Super Administrator previewing drafts. */
export async function previewingDrafts() {
  if (!(await draftMode()).isEnabled) return false;
  return can(await getActor().catch(() => null), "site.edit");
}

export async function getPageContent<D extends PageDef>(def: D): Promise<PageContent<D>> {
  try {
    if (await previewingDrafts()) {
      const row = await prisma.sitePage.findUnique({ where: { key: def.key }, select: { draft: true, published: true } });
      return resolvePage(def.fields, row?.draft ?? row?.published) as PageContent<D>;
    }
    return resolvePage(def.fields, await published(def.key)) as PageContent<D>;
  } catch (error) {
    console.error(`[site] content for ${def.key} unavailable; showing the original copy`, error);
    return resolvePage(def.fields, null) as PageContent<D>;
  }
}

/** A custom page by address, or null when there is none (or it has nothing published yet). */
export async function getCustomPage(slug: string): Promise<{ def: CustomPageDef; content: PageContent<CustomPageDef> } | null> {
  const preview = await previewingDrafts();
  const row = preview
    ? await prisma.sitePage.findUnique({ where: { slug } })
    : await unstable_cache(() => prisma.sitePage.findUnique({ where: { slug } }), ["site-custom", slug], { tags: ["site", `site-slug:${slug}`], revalidate: 3600 })();
  if (!row || !row.custom || row.archivedAt) return null;
  const stored = preview ? (row.draft ?? row.published) : row.published;
  if (stored == null) return null;
  const def = customPage(row.key, slug, row.title ?? "");
  return { def, content: resolvePage(def.fields, stored) };
}
