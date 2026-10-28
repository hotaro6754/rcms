import { z } from "zod";
import { Prisma, type LibraryKind, type LibraryStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { refusalFor } from "@/lib/cms/screen";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";
import { slugify } from "./core";
import { strings } from "@/lib/json-list";

/**
 * The public library: glossary terms, process walkthroughs, case studies, leadership toolkit
 * items and other resources. Authors edit a draft; a reviewer who did not submit it approves;
 * approval copies the draft into `published`, which is all the public site ever reads. Editing
 * a published entry leaves the approved version live until the edit is approved.
 */

export const LIBRARY_KINDS: LibraryKind[] = ["GLOSSARY", "PROCESS", "CASE_STUDY", "TOOLKIT", "RESOURCE"];
export const LIBRARY_LABEL: Record<LibraryKind, string> = {
  GLOSSARY: "Glossary term",
  PROCESS: "Process",
  CASE_STUDY: "Case study",
  TOOLKIT: "Leadership toolkit",
  RESOURCE: "Resource",
};
export const LIBRARY_PATH: Record<LibraryKind, string> = {
  GLOSSARY: "glossary",
  PROCESS: "processes",
  CASE_STUDY: "case-studies",
  TOOLKIT: "toolkit",
  RESOURCE: "resources",
};

const REVIEW_MONTHS = 12;

export interface PublishedEntry {
  kind: LibraryKind;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  sources: string[];
  levelId: string | null;
}

const lines = z.union([z.array(z.string()), z.string()]).optional().transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(/\n|,/)).map((x) => x.trim()).filter(Boolean)));

const EntryInput = z.object({
  kind: z.enum(["GLOSSARY", "PROCESS", "CASE_STUDY", "TOOLKIT", "RESOURCE"]),
  title: z.string().trim().min(2, "Give the entry a title.").max(160),
  summary: z.string().trim().min(10, "Write a one- or two-sentence summary.").max(600),
  body: z.string().trim().max(40_000).default(""),
  tags: lines.transform((t) => t.slice(0, 12).map((x) => x.slice(0, 40))),
  sources: lines.transform((t) => t.slice(0, 30).map((x) => x.slice(0, 400))),
  levelId: z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional()),
});

function log(actor: Actor, action: Parameters<typeof audit>[0]["action"], id: string, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity: "LibraryEntry", entityId: id, after, before });
}

function screen(d: z.infer<typeof EntryInput>) {
  const refusal = refusalFor([d.title, d.summary, d.body, ...d.sources].join("\n"));
  if (refusal) throw new ServiceError(refusal);
}

async function uniqueEntrySlug(title: string, kind: LibraryKind) {
  const base = slugify(title) || LIBRARY_PATH[kind];
  let slug = base;
  for (let i = 2; await prisma.libraryEntry.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

function canReview(actor: Actor) {
  return can(actor, "content.review.academic") || can(actor, "content.review.compliance");
}

export async function createEntry(actor: Actor, input: unknown) {
  await assertCan(actor, "content.create");
  const d = EntryInput.parse(input);
  screen(d);
  const entry = await prisma.libraryEntry.create({ data: { ...d, levelId: d.levelId ?? null, slug: await uniqueEntrySlug(d.title, d.kind), authorId: actor.id, status: "DRAFT" } });
  await log(actor, "create", entry.id, { kind: entry.kind, title: entry.title });
  return entry;
}

export async function updateEntry(actor: Actor, id: string, input: unknown, lockVersion: number) {
  await assertCan(actor, "content.edit", { entity: "LibraryEntry", id });
  const d = EntryInput.parse(input);
  screen(d);
  const before = await prisma.libraryEntry.findUnique({ where: { id } });
  if (!before) throw new ServiceError("That entry no longer exists.");
  if (before.status === "IN_REVIEW") throw new ServiceError("This entry is in review. Withdraw it from review to edit.");
  if (before.status === "ARCHIVED") throw new ServiceError("Restore the entry before editing it.");
  const res = await prisma.libraryEntry.updateMany({
    where: { id, lockVersion },
    data: { ...d, levelId: d.levelId ?? null, hasDraftChanges: before.status === "PUBLISHED", lockVersion: { increment: 1 } },
  });
  if (!res.count) throw new ServiceError("Someone else saved this entry after you opened it. Reload to see their changes.");
  await log(actor, "update", id, { fields: Object.keys(d) }, { title: before.title, summary: before.summary, body: before.body, sources: before.sources });
}

export async function submitEntry(actor: Actor, id: string) {
  await assertCan(actor, "content.submit", { entity: "LibraryEntry", id });
  const e = await prisma.libraryEntry.findUnique({ where: { id } });
  if (!e) throw new ServiceError("That entry no longer exists.");
  const ready = e.status === "DRAFT" || (e.status === "PUBLISHED" && e.hasDraftChanges);
  if (!ready) throw new ServiceError(e.status === "PUBLISHED" ? "Nothing has changed since it was approved." : "Only a draft can be submitted.");
  if (e.kind !== "GLOSSARY" && e.body.trim().length < 40) throw new ServiceError("Write the body before submitting.");
  await prisma.libraryEntry.update({ where: { id }, data: { status: "IN_REVIEW", submittedById: actor.id, reviewNote: null } });
  await log(actor, "submit", id, { title: e.title });
  await notifyPermission("content.review.academic", { kind: "review", title: `Library entry to review: ${e.title}`, href: `/admin/content/library/${id}` }, actor.id);
}

/** Back from review to editing; the published version (if any) stays live. */
export async function withdrawEntry(actor: Actor, id: string) {
  const e = await prisma.libraryEntry.findUnique({ where: { id } });
  if (!e || e.status !== "IN_REVIEW") throw new ServiceError("This entry is not in review.");
  if (e.submittedById !== actor.id) await assertCan(actor, "content.edit", { entity: "LibraryEntry", id });
  await prisma.libraryEntry.update({ where: { id }, data: { status: e.published ? "PUBLISHED" : "DRAFT", hasDraftChanges: !!e.published } });
  await log(actor, "update", id, { withdrawnFromReview: true });
}

export async function reviewEntry(actor: Actor, id: string, approve: boolean, note?: string) {
  if (!canReview(actor)) {
    await audit({ actorId: actor.id, action: "deny", entity: "LibraryEntry", entityId: id, outcome: "denied", after: { permission: "content.review.*" } });
    throw new AuthorisationError("You do not have permission to review content.", 403);
  }
  const e = await prisma.libraryEntry.findUnique({ where: { id } });
  if (!e || e.status !== "IN_REVIEW") throw new ServiceError("This entry is not waiting for review.");
  if (e.submittedById === actor.id) throw new ServiceError("You submitted this entry. A different reviewer must decide it.");
  if (!approve && !note?.trim()) throw new ServiceError("Say what needs to change.");
  const now = new Date();
  if (approve) {
    const published: PublishedEntry = { kind: e.kind, title: e.title, summary: e.summary, body: e.body, tags: strings(e.tags), sources: strings(e.sources), levelId: e.levelId };
    const next = new Date(now);
    next.setMonth(next.getMonth() + REVIEW_MONTHS);
    // Conditional on still being in review, so two reviewers cannot both decide it.
    const res = await prisma.libraryEntry.updateMany({
      where: { id, status: "IN_REVIEW" },
      data: { status: "PUBLISHED", published: published as unknown as Prisma.InputJsonValue, hasDraftChanges: false, reviewerId: actor.id, reviewNote: note?.trim() || null, lastReviewedAt: now, nextReviewAt: next, publishedAt: e.publishedAt ?? now },
    });
    if (!res.count) throw new ServiceError("Someone else decided this entry first.");
  } else {
    const res = await prisma.libraryEntry.updateMany({ where: { id, status: "IN_REVIEW" }, data: { status: e.published ? "PUBLISHED" : "DRAFT", hasDraftChanges: !!e.published, reviewerId: actor.id, reviewNote: note!.trim() } });
    if (!res.count) throw new ServiceError("Someone else decided this entry first.");
  }
  await log(actor, approve ? "approve" : "reject", id, { title: e.title, note: note ?? null });
  const notify = [e.authorId, e.submittedById].filter((x): x is string => !!x && x !== actor.id);
  await notifyUsers([...new Set(notify)], { kind: "review", title: `${e.title}: ${approve ? "approved and published" : "changes requested"}`, body: note ?? undefined, href: `/admin/content/library/${id}` });
}

export async function setEntryArchived(actor: Actor, id: string, archived: boolean) {
  await assertCan(actor, "content.archive", { entity: "LibraryEntry", id });
  const e = await prisma.libraryEntry.findUnique({ where: { id } });
  if (!e) throw new ServiceError("That entry no longer exists.");
  if (archived === (e.status === "ARCHIVED")) return;
  // A restored entry goes back to draft and needs approval before it is public again.
  await prisma.libraryEntry.update({ where: { id }, data: archived ? { status: "ARCHIVED", archivedAt: new Date() } : { status: "DRAFT", archivedAt: null, hasDraftChanges: false } });
  await log(actor, archived ? "archive" : "restore", id, { title: e.title });
}

// ---------------------------------------------------------------------------
// Public reads: only approved snapshots of entries that are live.
// ---------------------------------------------------------------------------

const LIVE: Prisma.LibraryEntryWhereInput = { status: { in: ["PUBLISHED", "IN_REVIEW"] }, published: { not: Prisma.DbNull } };

function view(r: { slug: string; published: Prisma.JsonValue; lastReviewedAt: Date | null; nextReviewAt: Date | null }) {
  const p = r.published as unknown as PublishedEntry;
  return { slug: r.slug, ...p, lastReviewedAt: r.lastReviewedAt, nextReviewAt: r.nextReviewAt };
}

export async function publicEntries(kind?: LibraryKind, q?: string) {
  const rows = await prisma.libraryEntry.findMany({ where: { ...LIVE, ...(kind ? { kind } : {}) }, select: { slug: true, published: true, lastReviewedAt: true, nextReviewAt: true }, orderBy: { title: "asc" } });
  const items = rows.filter((r) => r.published).map(view);
  const needle = q?.trim().toLowerCase();
  const filtered = needle ? items.filter((i) => `${i.title} ${i.summary} ${i.tags.join(" ")}`.toLowerCase().includes(needle)) : items;
  return filtered.sort((a, b) => a.title.localeCompare(b.title));
}

export async function publicEntry(slug: string) {
  const r = await prisma.libraryEntry.findFirst({ where: { slug, ...LIVE }, select: { slug: true, published: true, lastReviewedAt: true, nextReviewAt: true } });
  return r?.published ? view(r) : null;
}

export async function publicCounts() {
  const rows = await prisma.libraryEntry.groupBy({ by: ["kind"], where: LIVE, _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.kind, r._count._all])) as Partial<Record<LibraryKind, number>>;
}

export type { LibraryKind, LibraryStatus };
