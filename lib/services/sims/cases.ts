import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { refusalFor } from "@/lib/cms/screen";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";
import { slugify } from "@/lib/services/cms/core";
import { CaseDefinition, describeIssues, type Answers } from "@/lib/sim/definition";
import { scoreAttempt } from "@/lib/sim/score";
import { starterDefinition } from "@/lib/sim/seed-cases";

/**
 * Case authoring. Authors edit a draft definition (validated in full on every save); a reviewer
 * who did not submit it approves; approval freezes the definition as a new numbered version.
 * Learners only ever start attempts against a published version, and an attempt keeps the
 * version it started on even if the case is edited and republished.
 */

const json = (v: unknown) => v as Prisma.InputJsonValue;

function log(actor: Actor, action: Parameters<typeof audit>[0]["action"], id: string, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity: "SimCase", entityId: id, after, before });
}

/** Parse and validate a definition, with every problem in one readable message. */
export function validateDefinition(input: unknown) {
  const parsed = CaseDefinition.safeParse(input);
  if (!parsed.success) throw new ServiceError(`The case is not valid yet. ${describeIssues(parsed.error).join(" · ")}`);
  const d = parsed.data;
  const refusal = refusalFor(JSON.stringify(d));
  if (refusal) throw new ServiceError(refusal);
  return d;
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || "case";
  let slug = base;
  for (let i = 2; await prisma.simCase.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

export async function createCase(actor: Actor, title: string) {
  await assertCan(actor, "content.create");
  const t = title.trim();
  if (t.length < 4) throw new ServiceError("Give the case a title of at least four characters.");
  const draft = validateDefinition(starterDefinition(t));
  const c = await prisma.simCase.create({ data: { slug: await uniqueSlug(t), title: t, draft: json(draft), authorId: actor.id } });
  await log(actor, "create", c.id, { title: t });
  return c;
}

export async function updateCase(actor: Actor, id: string, input: { definition: unknown; programId?: string | null }, lockVersion: number) {
  await assertCan(actor, "content.edit", { entity: "SimCase", id });
  const before = await prisma.simCase.findUnique({ where: { id } });
  if (!before) throw new ServiceError("That case no longer exists.");
  if (before.status === "IN_REVIEW") throw new ServiceError("This case is in review. Withdraw it from review to edit.");
  if (before.status === "RETIRED") throw new ServiceError("Restore the case before editing it.");
  const d = validateDefinition(input.definition);
  const programId = input.programId === undefined ? before.programId : input.programId || null;
  if (programId && !(await prisma.program.findUnique({ where: { id: programId }, select: { id: true } }))) throw new ServiceError("That course does not exist.");
  const res = await prisma.simCase.updateMany({
    where: { id, lockVersion },
    data: { draft: json(d), title: d.title, programId, hasDraftChanges: before.status === "PUBLISHED", lockVersion: { increment: 1 } },
  });
  if (!res.count) throw new ServiceError("Someone else saved this case after you opened it. Reload to see their changes.");
  await log(actor, "update", id, { title: d.title, programId }, { title: before.title, programId: before.programId });
}

/** Problems that stop a case being published, beyond schema validity. */
export async function caseReadiness(id: string) {
  const c = await prisma.simCase.findUniqueOrThrow({ where: { id } });
  const problems: string[] = [];
  const parsed = CaseDefinition.safeParse(c.draft);
  if (!parsed.success) return describeIssues(parsed.error);
  const codes = parsed.data.competencyCodes;
  if (codes.length) {
    const found = await prisma.competency.findMany({ where: { code: { in: codes } }, select: { code: true, status: true } });
    for (const code of codes) {
      const f = found.find((x) => x.code === code);
      if (!f) problems.push(`Competency ${code} does not exist.`);
      else if (f.status !== "ACTIVE") problems.push(`Competency ${code} is not active; it must be reviewed and activated first.`);
    }
  } else problems.push("Link at least one competency, so attempts produce evidence.");
  return problems;
}

export async function submitCase(actor: Actor, id: string) {
  await assertCan(actor, "content.submit", { entity: "SimCase", id });
  const c = await prisma.simCase.findUnique({ where: { id } });
  if (!c) throw new ServiceError("That case no longer exists.");
  const ready = c.status === "DRAFT" || (c.status === "PUBLISHED" && c.hasDraftChanges);
  if (!ready) throw new ServiceError(c.status === "PUBLISHED" ? "Nothing has changed since the last approved version." : "Only a draft can be submitted.");
  const problems = await caseReadiness(id);
  if (problems.length) throw new ServiceError(`Fix these first: ${problems.join(" ")}`);
  await prisma.simCase.update({ where: { id }, data: { status: "IN_REVIEW", submittedById: actor.id, reviewNote: null } });
  await log(actor, "submit", id, { title: c.title });
  await notifyPermission("content.review.academic", { kind: "review", title: `Case to review: ${c.title}`, href: `/admin/cases/${id}` }, actor.id);
}

export async function withdrawCase(actor: Actor, id: string) {
  const c = await prisma.simCase.findUnique({ where: { id }, include: { versions: { select: { id: true }, take: 1 } } });
  if (!c || c.status !== "IN_REVIEW") throw new ServiceError("This case is not in review.");
  if (c.submittedById !== actor.id) await assertCan(actor, "content.edit", { entity: "SimCase", id });
  const published = c.versions.length > 0;
  await prisma.simCase.update({ where: { id }, data: { status: published ? "PUBLISHED" : "DRAFT", hasDraftChanges: published } });
  await log(actor, "update", id, { withdrawnFromReview: true });
}

export async function reviewCase(actor: Actor, id: string, approve: boolean, note?: string) {
  if (!can(actor, "content.review.academic")) {
    await audit({ actorId: actor.id, action: "deny", entity: "SimCase", entityId: id, outcome: "denied", after: { permission: "content.review.academic" } });
    throw new AuthorisationError("You do not have permission to review cases.", 403);
  }
  const c = await prisma.simCase.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
  if (!c || c.status !== "IN_REVIEW") throw new ServiceError("This case is not waiting for review.");
  if (c.submittedById === actor.id || c.authorId === actor.id) throw new ServiceError("You wrote or submitted this case. A different reviewer must decide it.");
  if (!approve && !note?.trim()) throw new ServiceError("Say what needs to change.");
  const published = c.versions.length > 0;
  if (approve) {
    const problems = await caseReadiness(id);
    if (problems.length) throw new ServiceError(`It cannot be approved yet: ${problems.join(" ")}`);
    const next = (c.versions[0]?.version ?? 0) + 1;
    await prisma.$transaction(async (tx) => {
      const res = await tx.simCase.updateMany({ where: { id, status: "IN_REVIEW" }, data: { status: "PUBLISHED", hasDraftChanges: false, reviewerId: actor.id, reviewNote: note?.trim() || null } });
      if (!res.count) throw new ServiceError("Someone else decided this case first.");
      await tx.simCaseVersion.create({ data: { caseId: id, version: next, definition: json(c.draft), publishedById: c.submittedById ?? c.authorId, reviewedById: actor.id } });
    });
    await log(actor, "approve", id, { title: c.title, version: next, note: note ?? null });
  } else {
    const res = await prisma.simCase.updateMany({ where: { id, status: "IN_REVIEW" }, data: { status: published ? "PUBLISHED" : "DRAFT", hasDraftChanges: published, reviewerId: actor.id, reviewNote: note!.trim() } });
    if (!res.count) throw new ServiceError("Someone else decided this case first.");
    await log(actor, "reject", id, { title: c.title, note });
  }
  const notify = [c.authorId, c.submittedById].filter((x): x is string => !!x && x !== actor.id);
  await notifyUsers([...new Set(notify)], { kind: "review", title: `${c.title}: ${approve ? "approved and published" : "changes requested"}`, body: note ?? undefined, href: `/admin/cases/${id}` });
}

/** Retire: no new attempts. Attempts already in progress may still be submitted. */
export async function setCaseRetired(actor: Actor, id: string, retired: boolean) {
  await assertCan(actor, "content.archive", { entity: "SimCase", id });
  const c = await prisma.simCase.findUnique({ where: { id }, include: { versions: { select: { id: true }, take: 1 } } });
  if (!c) throw new ServiceError("That case no longer exists.");
  if (retired === (c.status === "RETIRED")) return;
  if (retired) {
    await prisma.$transaction([
      prisma.simCase.update({ where: { id }, data: { status: "RETIRED" } }),
      prisma.simCaseVersion.updateMany({ where: { caseId: id, retiredAt: null }, data: { retiredAt: new Date() } }),
    ]);
  } else {
    // Back to draft: it needs review before learners see it again.
    await prisma.simCase.update({ where: { id }, data: { status: "DRAFT", hasDraftChanges: false } });
  }
  await log(actor, retired ? "archive" : "restore", id, { title: c.title });
}

/** Score answers against the current draft without saving anything: the author's preview. */
export async function previewScore(actor: Actor, id: string, answers: Answers) {
  await assertCan(actor, "content.view");
  const c = await prisma.simCase.findUnique({ where: { id } });
  if (!c) throw new ServiceError("That case no longer exists.");
  return scoreAttempt(validateDefinition(c.draft), answers, { attemptNo: 99 });
}

/** The version new attempts start on: the latest published one that is not retired. */
export async function currentVersion(caseId: string) {
  return prisma.simCaseVersion.findFirst({ where: { caseId, retiredAt: null, case: { status: { in: ["PUBLISHED", "IN_REVIEW"] } } }, orderBy: { version: "desc" } });
}
