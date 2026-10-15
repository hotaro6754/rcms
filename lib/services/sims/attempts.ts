import { Prisma, type SimAttempt } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";
import { activeSubscriptionCovering, enrolmentLive } from "@/lib/services/learning/catalog";
import { Answers, CaseDefinition, learnerView } from "@/lib/sim/definition";
import { evidenceFor, scoreAttempt, type ScoreOverrides, type SimResult } from "@/lib/sim/score";
import { currentVersion } from "./cases";

/**
 * Learner attempts at published cases. The answer key stays on the server: learners get
 * `learnerView` of the version they are working on, answers are saved as they go, and scoring
 * happens here on submit. Each scored attempt records an outcome for every active competency
 * the case is linked to.
 */

const json = (v: unknown) => v as Prisma.InputJsonValue;

function log(actor: Actor, action: Parameters<typeof audit>[0]["action"], id: string, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity: "SimAttempt", entityId: id, after, before });
}

/** Whether this learner may attempt a case linked to a course (unlinked cases are open to signed-in learners). */
async function canAttempt(actor: Actor, programId: string | null) {
  if (!programId) return true;
  const enrolment = await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId } } });
  if (enrolmentLive(enrolment)) return true;
  const p = await prisma.program.findUnique({ where: { id: programId }, select: { levelId: true, includedInSubscription: true } });
  return !!p && !!(await activeSubscriptionCovering(actor.id, p));
}

/** Published cases with this learner's attempt history. */
export async function casesForLearner(actor: Actor) {
  const cases = await prisma.simCase.findMany({
    where: { status: { in: ["PUBLISHED", "IN_REVIEW"] }, versions: { some: { retiredAt: null } } },
    include: {
      versions: { where: { retiredAt: null }, orderBy: { version: "desc" }, take: 1 },
      attempts: { where: { userId: actor.id }, orderBy: { attemptNo: "desc" }, select: { id: true, attemptNo: true, state: true, score: true, passed: true, submittedAt: true } },
    },
    orderBy: { title: "asc" },
  });
  const out = [];
  for (const c of cases) {
    const v = c.versions[0];
    if (!v) continue;
    const d = CaseDefinition.parse(v.definition);
    const used = c.attempts.length;
    out.push({
      id: c.id,
      slug: c.slug,
      title: d.title,
      summary: d.summary,
      difficulty: d.difficulty,
      estimatedMinutes: d.estimatedMinutes,
      maxAttempts: d.rubric.maxAttempts,
      attemptsUsed: used,
      locked: !(await canAttempt(actor, c.programId)),
      attempts: c.attempts,
      best: c.attempts.reduce<number | null>((m, a) => (a.score != null && (m == null || a.score > m) ? a.score : m), null),
      passed: c.attempts.some((a) => a.passed),
    });
  }
  return out;
}

export async function startAttempt(actor: Actor, caseId: string) {
  const c = await prisma.simCase.findUnique({ where: { id: caseId } });
  if (!c || !["PUBLISHED", "IN_REVIEW"].includes(c.status)) throw new ServiceError("That case is not available.");
  const v = await currentVersion(caseId);
  if (!v) throw new ServiceError("That case is not available.");
  if (!(await canAttempt(actor, c.programId))) throw new AuthorisationError("This case is part of a course you do not have access to.", 403);
  const open = await prisma.simAttempt.findFirst({ where: { userId: actor.id, caseId, state: "IN_PROGRESS" } });
  if (open) return open;
  const d = CaseDefinition.parse(v.definition);
  const used = await prisma.simAttempt.count({ where: { userId: actor.id, caseId } });
  if (d.rubric.maxAttempts > 0 && used >= d.rubric.maxAttempts) throw new ServiceError(`You have used all ${d.rubric.maxAttempts} attempts at this case.`);
  try {
    const a = await prisma.simAttempt.create({ data: { userId: actor.id, caseId, versionId: v.id, attemptNo: used + 1 } });
    await log(actor, "create", a.id, { caseId, version: v.version, attemptNo: a.attemptNo });
    return a;
  } catch (e) {
    // Two tabs starting at once: the partial unique index lets only one open attempt exist.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await prisma.simAttempt.findFirst({ where: { userId: actor.id, caseId, state: "IN_PROGRESS" } });
      if (existing) return existing;
    }
    throw e;
  }
}

async function ownAttempt(actor: Actor, id: string) {
  const a = await prisma.simAttempt.findUnique({ where: { id }, include: { version: true, case: { select: { slug: true, title: true } } } });
  if (!a || a.userId !== actor.id) throw new ServiceError("That attempt does not exist.");
  return a;
}

export async function saveAnswers(actor: Actor, id: string, answers: unknown) {
  const a = await ownAttempt(actor, id);
  if (a.state !== "IN_PROGRESS") throw new ServiceError("This attempt has been submitted and can no longer change.");
  const parsed = Answers.parse(answers);
  const res = await prisma.simAttempt.updateMany({ where: { id, state: "IN_PROGRESS" }, data: { answers: json(parsed) } });
  if (!res.count) throw new ServiceError("This attempt has been submitted and can no longer change.");
}

async function recordOutcomes(tx: Prisma.TransactionClient, attempt: Pick<SimAttempt, "id" | "userId">, d: CaseDefinition, result: SimResult, now: Date) {
  const comps = await tx.competency.findMany({ where: { code: { in: d.competencyCodes }, status: "ACTIVE" } });
  for (const comp of comps) {
    const ev = evidenceFor(result, comp.criteria);
    if (ev === null) continue;
    const expiresAt = comp.reassessMonths ? new Date(new Date(now).setMonth(now.getMonth() + comp.reassessMonths)) : null;
    await tx.competencyOutcome.create({
      data: { userId: attempt.userId, competencyId: comp.id, attemptId: attempt.id, demonstrated: result.passed && ev >= comp.threshold, evidenceScore: ev, expiresAt },
    });
  }
}

export async function submitAttempt(actor: Actor, id: string, answers: unknown) {
  const a = await ownAttempt(actor, id);
  if (a.state !== "IN_PROGRESS") throw new ServiceError("This attempt has already been submitted.");
  const parsed = Answers.parse(answers);
  const d = CaseDefinition.parse(a.version.definition);
  if (!parsed.action) throw new ServiceError("Choose a next action before submitting.", "action");
  if (!parsed.issue) throw new ServiceError("Classify the issue before submitting.", "issue");
  if (parsed.escalate === undefined || parsed.escalate === null) throw new ServiceError("Say whether this case needs escalation.", "escalate");
  const result = scoreAttempt(d, parsed, { attemptNo: a.attemptNo });
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // Conditional on still being open, so a double submit scores once.
    const res = await tx.simAttempt.updateMany({ where: { id, state: "IN_PROGRESS" }, data: { state: "SCORED", answers: json(parsed), result: json(result), score: result.score, passed: result.passed, submittedAt: now } });
    if (!res.count) throw new ServiceError("This attempt has already been submitted.");
    await recordOutcomes(tx, a, d, result, now);
  });
  await log(actor, "submit", id, { caseId: a.caseId, score: result.score, passed: result.passed, criticalErrors: result.criticalErrors.map((c) => c.id) });
  return result;
}

/** What the learner sees: the case without its key, their answers, and the stored result. */
export async function attemptForLearner(actor: Actor, id: string) {
  const a = await ownAttempt(actor, id);
  const d = CaseDefinition.parse(a.version.definition);
  const history = await prisma.simAttempt.findMany({ where: { userId: actor.id, caseId: a.caseId }, orderBy: { attemptNo: "asc" }, select: { id: true, attemptNo: true, state: true, score: true, passed: true, submittedAt: true } });
  const outcomes = a.state === "IN_PROGRESS" ? [] : await prisma.competencyOutcome.findMany({ where: { attemptId: id, supersededAt: null }, include: { competency: { select: { code: true, name: true, proficiencyLevel: true } } } });
  return {
    id: a.id,
    caseId: a.caseId,
    slug: a.case.slug,
    attemptNo: a.attemptNo,
    state: a.state,
    version: a.version.version,
    view: learnerView(d),
    answers: Answers.parse(a.answers),
    result: a.result as unknown as SimResult | null,
    instructorNote: a.instructorNote,
    reviewedAt: a.reviewedAt,
    history,
    attemptsLeft: d.rubric.maxAttempts === 0 ? null : Math.max(0, d.rubric.maxAttempts - history.length),
    outcomes: outcomes.map((o) => ({ code: o.competency.code, name: o.competency.name, level: o.competency.proficiencyLevel, demonstrated: o.demonstrated, evidenceScore: o.evidenceScore })),
  };
}

// ---------------------------------------------------------------------------
// Instructor review
// ---------------------------------------------------------------------------

const quarter = (v: number | undefined) => (v === undefined ? undefined : Math.max(0, Math.min(100, Math.round(v / 25) * 25)));

/**
 * An instructor reads the attempt and may replace the automated documentation and rationale
 * scores and dismiss a false identifier flag. The attempt is rescored with those overrides;
 * earlier competency outcomes are kept but marked superseded.
 */
export async function reviewAttempt(actor: Actor, id: string, input: ScoreOverrides & { note: string }) {
  await assertCan(actor, "assessment.grade", { entity: "SimAttempt", id });
  const a = await prisma.simAttempt.findUnique({ where: { id }, include: { version: true } });
  if (!a || a.state === "IN_PROGRESS") throw new ServiceError("Only a submitted attempt can be reviewed.");
  if (a.userId === actor.id) throw new ServiceError("You cannot review your own attempt.");
  const note = input.note.trim();
  if (note.length < 10) throw new ServiceError("Write feedback for the learner (at least a sentence).", "note");
  const overrides: ScoreOverrides = { documentation: quarter(input.documentation), rationale: quarter(input.rationale), dismissIdentifierFlag: !!input.dismissIdentifierFlag };
  const d = CaseDefinition.parse(a.version.definition);
  const result = scoreAttempt(d, Answers.parse(a.answers), { attemptNo: a.attemptNo, overrides });
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.competencyOutcome.updateMany({ where: { attemptId: id, supersededAt: null }, data: { supersededAt: now } });
    await tx.simAttempt.update({ where: { id }, data: { state: "REVIEWED", result: json(result), score: result.score, passed: result.passed, instructorNote: note, reviewedById: actor.id, reviewedAt: now } });
    await recordOutcomes(tx, a, d, result, now);
  });
  await log(actor, "update", id, { reviewed: true, overrides, score: result.score, passed: result.passed }, { score: a.score, passed: a.passed });
  await notifyUsers([a.userId], { kind: "review", title: "An instructor reviewed your case attempt", body: note.slice(0, 200), href: `/cases/attempt/${id}` });
  return result;
}

/** Attempts for the grading queue; reviewers see answers and the scored result. */
export async function attemptsForReview(actor: Actor, filter: { state?: "SCORED" | "REVIEWED"; caseId?: string } = {}) {
  if (!can(actor, "assessment.grade")) throw new AuthorisationError("You do not have permission to review attempts.", 403);
  return prisma.simAttempt.findMany({
    where: { state: filter.state ?? { in: ["SCORED", "REVIEWED"] }, ...(filter.caseId ? { caseId: filter.caseId } : {}) },
    include: { user: { select: { name: true, email: true } }, case: { select: { title: true } }, version: { select: { version: true } } },
    orderBy: { submittedAt: "desc" },
    take: 200,
  });
}

/** Ask for review: notifies graders; nothing changes on the attempt. */
export async function requestReview(actor: Actor, id: string) {
  const a = await ownAttempt(actor, id);
  if (a.state !== "SCORED") throw new ServiceError("Only a scored, unreviewed attempt can be sent for review.");
  await notifyPermission("assessment.grade", { kind: "review", title: `Review requested: ${a.case.title} (attempt ${a.attemptNo})`, href: `/admin/grading/cases/${id}` }, actor.id);
  await log(actor, "request", id, { reviewRequested: true });
}
