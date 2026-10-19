import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma, type SitePage } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { resolvePage, validatePage, type Fields, type PageDef } from "@/lib/site/fields";
import { builtInPage, BUILT_IN_PAGES, SLUG_PATTERN } from "@/lib/site/registry";
import { customPage } from "@/lib/site/pages/custom";
import { PAGE_CHECKS } from "@/lib/site/checks";
import { designMediaIds, type Design } from "@/lib/design/schema";

/**
 * Editing the public website's copy (blueprint: Super Administrator only).
 *
 * Each page has a draft (work in progress, visible only in preview) and a published state
 * (what visitors see). Publishing records a numbered version; any version can be brought back
 * into the draft. Nothing here stores HTML: content is checked against the page's field
 * definitions (lib/site/fields), so an edit changes what a page says, never what it runs.
 */

export type EditablePage = { def: PageDef; row: SitePage | null };

/** The definition for a page key: a built-in page, or a custom page from its row. */
export function definitionFor(key: string, row: Pick<SitePage, "custom" | "slug" | "title"> | null): PageDef | null {
  if (row?.custom) return customPage(key, row.slug!, row.title ?? "Untitled page");
  return builtInPage(key) ?? null;
}

async function load(key: string): Promise<EditablePage> {
  const row = await prisma.sitePage.findUnique({ where: { key } });
  if (row?.archivedAt) throw new ServiceError("That page has been deleted.");
  const def = definitionFor(key, row);
  if (!def) throw new ServiceError("That page does not exist.");
  return { def, row };
}

/** All pages with their state, for the editor's list. */
export async function listPages(actor: Actor) {
  await assertCan(actor, "site.edit");
  const rows = await prisma.sitePage.findMany({ where: { archivedAt: null } });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const summary = (def: PageDef, row: SitePage | null) => ({
    key: def.key,
    label: def.label,
    path: def.path,
    group: def.group,
    legal: !!def.legal,
    edited: row?.published != null,
    hasDraft: row?.draft != null,
    version: row?.version ?? 0,
    publishedAt: row?.publishedAt ?? null,
    draftUpdatedAt: row?.draftUpdatedAt ?? null,
  });
  return [
    ...BUILT_IN_PAGES.map((def) => summary(def, byKey.get(def.key) ?? null)),
    ...rows
      .filter((r) => r.custom)
      .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""))
      .map((r) => summary(definitionFor(r.key, r)!, r)),
  ];
}

/** Everything the editor needs for one page. */
export async function pageForEditor(actor: Actor, key: string) {
  await assertCan(actor, "site.edit");
  const { def, row } = await load(key);
  const versions = row ? await prisma.sitePageVersion.findMany({ where: { pageKey: key }, orderBy: { version: "desc" }, take: 30 }) : [];
  const people = await prisma.user.findMany({
    where: { id: { in: [...new Set([row?.draftById, row?.publishedById, ...versions.map((v) => v.publishedById)].filter((x): x is string => !!x))] } },
    select: { id: true, name: true },
  });
  const name = (id: string | null | undefined) => people.find((p) => p.id === id)?.name ?? null;
  const published = resolvePage(def.fields, row?.published);
  return {
    def,
    custom: !!row?.custom,
    slug: row?.slug ?? null,
    published,
    draft: row?.draft != null ? resolvePage(def.fields, row.draft) : null,
    lockVersion: row?.lockVersion ?? 0,
    version: row?.version ?? 0,
    publishedAt: row?.publishedAt ?? null,
    publishedBy: name(row?.publishedById),
    draftUpdatedAt: row?.draftUpdatedAt ?? null,
    draftBy: name(row?.draftById),
    versions: versions.map((v) => ({ version: v.version, createdAt: v.createdAt, by: name(v.publishedById), note: v.note, reset: v.content == null })),
  };
}

/** Images on a page must be public, current media-library images (or files shipped with the site). */
async function checkImages(fields: Fields, value: unknown) {
  const ids = new Set<string>();
  const walk = (fs: Fields, v: unknown) => {
    if (!v || typeof v !== "object") return;
    for (const [k, f] of Object.entries(fs)) {
      const x = (v as Record<string, unknown>)[k];
      if (f.kind === "image") {
        const m = /^\/api\/media\/([a-z0-9]+)$/i.exec((x as { src?: string } | undefined)?.src ?? "");
        if (m) ids.add(m[1]);
      } else if (f.kind === "design" && x) for (const id of designMediaIds(x as Design)) ids.add(id);
      else if (f.kind === "group") walk(f.fields, x);
      else if (f.kind === "list" && Array.isArray(x)) for (const item of x) walk(f.fields, item);
    }
  };
  walk(fields, value);
  if (!ids.size) return;
  const ok = await prisma.mediaAsset.count({ where: { id: { in: [...ids] }, kind: "IMAGE", isPublic: true, archivedAt: null } });
  if (ok !== ids.size) throw new ServiceError("An image on this page is not a public image in the media library. Mark it public there, or choose another.");
}

function checked(def: PageDef, content: unknown) {
  const r = validatePage(def, content);
  if (!r.ok) throw new ServiceError(r.error, r.path);
  const extra = PAGE_CHECKS[def.key]?.(r.value);
  if (extra) throw new ServiceError(extra);
  return r.value;
}

/** Saves work in progress. Fails if someone else saved since this editor loaded the page. */
export async function saveDraft(actor: Actor, key: string, content: unknown, lockVersion: number) {
  await assertCan(actor, "site.edit");
  const { def, row } = await load(key);
  const value = checked(def, content);
  const now = new Date();
  if (!row) {
    if (lockVersion !== 0) throw new ServiceError("This page changed since you opened it. Reload to see the latest version.");
    try {
      await prisma.sitePage.create({ data: { key, draft: value as Prisma.InputJsonValue, draftUpdatedAt: now, draftById: actor.id, lockVersion: 1 } });
    } catch {
      throw new ServiceError("This page changed since you opened it. Reload to see the latest version.");
    }
  } else {
    const n = await prisma.sitePage.updateMany({
      where: { key, lockVersion },
      data: { draft: value as Prisma.InputJsonValue, draftUpdatedAt: now, draftById: actor.id, lockVersion: { increment: 1 } },
    });
    if (n.count !== 1) throw new ServiceError("This page changed since you opened it. Reload to see the latest version.");
  }
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "SitePage", entityId: key, after: { draft: true } });
  return { lockVersion: lockVersion + 1 };
}

export async function discardDraft(actor: Actor, key: string) {
  await assertCan(actor, "site.edit");
  const { row } = await load(key);
  if (!row?.draft) throw new ServiceError("There is no draft to discard.");
  await prisma.sitePage.update({ where: { key }, data: { draft: Prisma.DbNull, draftUpdatedAt: null, draftById: null, lockVersion: { increment: 1 } } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "delete", entity: "SitePageDraft", entityId: key });
}

async function writePublished(actor: Actor, key: string, content: Record<string, unknown> | null, note: string | null, expectLock?: number) {
  return prisma.$transaction(async (tx) => {
    const cur = await tx.sitePage.findUnique({ where: { key } });
    if (expectLock !== undefined && (cur?.lockVersion ?? 0) !== expectLock) throw new ServiceError("This page changed since you opened it. Reload to see the latest version.");
    const version = (cur?.version ?? 0) + 1;
    const now = new Date();
    const data = {
      published: content === null ? Prisma.DbNull : (content as Prisma.InputJsonValue),
      publishedAt: now,
      publishedById: actor.id,
      version,
      draft: Prisma.DbNull,
      draftUpdatedAt: null,
      draftById: null,
    };
    if (cur) await tx.sitePage.update({ where: { key }, data: { ...data, lockVersion: { increment: 1 } } });
    else await tx.sitePage.create({ data: { key, ...data, lockVersion: 1 } });
    await tx.sitePageVersion.create({ data: { pageKey: key, version, content: content === null ? Prisma.DbNull : (content as Prisma.InputJsonValue), publishedById: actor.id, note } });
    return version;
  });
}

/**
 * Publishes the draft (or, with `content`, the editor's current fields after saving them).
 * Legal pages need `confirmLegal`: the editor asks the person to confirm the text has been
 * checked, because the academy's terms and policies are not ordinary marketing copy.
 */
export async function publish(actor: Actor, key: string, opts: { note?: string | null; confirmLegal?: boolean } = {}) {
  await assertCan(actor, "site.edit");
  const { def, row } = await load(key);
  if (!row?.draft) throw new ServiceError("There are no changes to publish. Save a draft first.");
  if (def.legal && !opts.confirmLegal) throw new ServiceError("Confirm that this legal text has been checked before publishing it.", "confirmLegal");
  const value = checked(def, row.draft);
  await checkImages(def.fields, value);
  const note = opts.note?.trim().slice(0, 300) || null;
  const version = await writePublished(actor, key, value, note, row.lockVersion);
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "publish", entity: "SitePage", entityId: key, after: { version, note } });
  return { version, path: def.path };
}

/** Publishes the copy that ships with the code again, discarding every edit (kept in history). */
export async function resetToDefault(actor: Actor, key: string, opts: { confirmLegal?: boolean } = {}) {
  await assertCan(actor, "site.edit");
  const { def, row } = await load(key);
  if (row?.custom) throw new ServiceError("Custom pages have no default copy. Edit or delete the page instead.");
  if (row?.published == null) throw new ServiceError("This page already shows its original copy.");
  if (def.legal && !opts.confirmLegal) throw new ServiceError("Confirm that this legal text has been checked before publishing it.", "confirmLegal");
  const version = await writePublished(actor, key, null, "Reset to the original copy");
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "rollback", entity: "SitePage", entityId: key, after: { version } });
  return { version, path: def.path };
}

/**
 * Saves a design from the visual designer into one design field of the page's draft (the
 * rest of the draft is kept). `path` names the field, e.g. "body" or "extra.layout".
 */
export async function saveDesignField(actor: Actor, key: string, path: string, designValue: unknown) {
  await assertCan(actor, "site.edit");
  const { def, row } = await load(key);
  const segs = path.split(".");
  let fields = def.fields;
  for (const [i, seg] of segs.entries()) {
    const f = fields[seg];
    if (!f) throw new ServiceError("That part of the page does not exist.");
    if (i === segs.length - 1) {
      if (f.kind !== "design") throw new ServiceError("That part of the page is not a design.");
    } else if (f.kind === "group") fields = f.fields;
    else throw new ServiceError("That part of the page does not exist.");
  }
  const current = resolvePage(def.fields, row?.draft ?? row?.published) as Record<string, unknown>;
  let target = current;
  for (const seg of segs.slice(0, -1)) target = target[seg] as Record<string, unknown>;
  target[segs[segs.length - 1]] = designValue;
  return saveDraft(actor, key, current, row?.lockVersion ?? 0);
}

/** Copies an earlier published version into the draft, to check and publish again. */
export async function restoreVersion(actor: Actor, key: string, version: number) {
  await assertCan(actor, "site.edit");
  const { def, row } = await load(key);
  const v = await prisma.sitePageVersion.findUnique({ where: { pageKey_version: { pageKey: key, version } } });
  if (!v || !row) throw new ServiceError("That version does not exist.");
  const content = resolvePage(def.fields, v.content);
  await prisma.sitePage.update({ where: { key }, data: { draft: content as Prisma.InputJsonValue, draftUpdatedAt: new Date(), draftById: actor.id, lockVersion: { increment: 1 } } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "restore", entity: "SitePage", entityId: key, after: { version } });
}

// ---------------------------------------------------------------------------
// Custom pages
// ---------------------------------------------------------------------------

const NewPage = z.object({
  title: z.string().trim().min(2, "Give the page a title.").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Choose an address of at least two characters.")
    .max(60, "Keep the address under 60 characters.")
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens, e.g. corporate-training."),
});

export async function createCustomPage(actor: Actor, input: unknown) {
  await assertCan(actor, "site.edit");
  const { title, slug } = NewPage.parse(input);
  if (await prisma.sitePage.findUnique({ where: { slug } })) throw new ServiceError("Another page already uses that address, or used it before it was deleted.", "slug");
  const key = `custom-${randomUUID()}`;
  await prisma.sitePage.create({ data: { key, custom: true, slug, title } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "SitePage", entityId: key, after: { slug, title } });
  return { key };
}

/** Renames a custom page (its address stays, so links to it keep working). */
export async function renameCustomPage(actor: Actor, key: string, title: string) {
  await assertCan(actor, "site.edit");
  const { row } = await load(key);
  if (!row?.custom) throw new ServiceError("Only custom pages can be renamed.");
  const t = z.string().trim().min(2, "Give the page a title.").max(160).parse(title);
  await prisma.sitePage.update({ where: { key }, data: { title: t } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "SitePage", entityId: key, before: { title: row.title }, after: { title: t } });
}

/**
 * Deletes a custom page: it stops being served immediately. The row and its history are kept
 * (for the audit trail), and its address is not reused.
 */
export async function deleteCustomPage(actor: Actor, key: string) {
  await assertCan(actor, "site.edit");
  const { row } = await load(key);
  if (!row?.custom) throw new ServiceError("Built-in pages cannot be deleted. Hide their sections or reset them instead.");
  await prisma.sitePage.update({ where: { key }, data: { archivedAt: new Date(), published: Prisma.DbNull, draft: Prisma.DbNull } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "delete", entity: "SitePage", entityId: key, before: { slug: row.slug, title: row.title } });
  return { path: `/p/${row.slug}` };
}
