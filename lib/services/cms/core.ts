import type { ContentStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";

/**
 * Shared rules for every CMS write.
 *
 * 1. A course in review, approved or scheduled is locked: reviewers approve exactly what
 *    they read. To change it, withdraw it from review first.
 * 2. An archived course is read-only until it is restored.
 * 3. The first edit moves a course out of DRAFT into IN_DEVELOPMENT; an edit to a published
 *    course moves it to UNDER_REVISION. Learners keep reading the released version.
 * 4. Every edit writes a ContentRevision (field-level changes plus a full snapshot).
 */

export type Tx = Prisma.TransactionClient | PrismaClient;

export const REVIEW_LOCKED: ContentStatus[] = ["ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED"];

export const STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: "Draft",
  IN_DEVELOPMENT: "In development",
  ACADEMIC_REVIEW: "Academic review",
  COMPLIANCE_REVIEW: "Compliance review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  UNDER_REVISION: "Under revision",
  ARCHIVED: "Archived",
};

export async function lockedCheck(tx: Tx, courseId: string) {
  const course = await tx.program.findUnique({
    where: { id: courseId },
    select: { id: true, status: true, archivedAt: true, publishedVersionId: true, name: true },
  });
  if (!course) throw new ServiceError("That course no longer exists.");
  if (course.status === "ARCHIVED") throw new ServiceError("This course is archived. Restore it before editing.");
  if (REVIEW_LOCKED.includes(course.status)) {
    throw new ServiceError("This course is in review and locked. Withdraw it from review to make changes.");
  }
  return course;
}

/** Call after any edit inside a course. Moves the workflow on and returns the new status. */
export async function markEdited(tx: Tx, courseId: string): Promise<ContentStatus> {
  const course = await lockedCheck(tx, courseId);
  const next: ContentStatus | null =
    course.status === "DRAFT" ? "IN_DEVELOPMENT" : course.status === "PUBLISHED" ? "UNDER_REVISION" : null;
  if (next) await tx.program.update({ where: { id: courseId }, data: { status: next } });
  return next ?? course.status;
}

export async function courseOfModule(tx: Tx, moduleId: string) {
  const m = await tx.module.findUnique({ where: { id: moduleId }, select: { programId: true } });
  if (!m) throw new ServiceError("That module no longer exists.");
  return m.programId;
}

export async function courseOfLesson(tx: Tx, lessonId: string) {
  const l = await tx.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { programId: true } } } });
  if (!l) throw new ServiceError("That lesson no longer exists.");
  return l.module.programId;
}

export async function courseOfQuiz(tx: Tx, quizId: string) {
  const q = await tx.quiz.findUnique({ where: { id: quizId }, select: { lessonId: true } });
  if (!q) throw new ServiceError("That assessment no longer exists.");
  return courseOfLesson(tx, q.lessonId);
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------

type Snap = Record<string, unknown>;

function same(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function diffSnapshots(before: Snap | null, after: Snap): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
  for (const k of keys) {
    const from = before?.[k];
    const to = after[k];
    if (!same(from, to)) out[k] = { from: from ?? null, to: to ?? null };
  }
  return out;
}

export async function recordRevision(
  tx: Tx,
  input: { entityType: string; entityId: string; courseId: string | null; editorId: string | null; reason?: string | null; before: Snap | null; after: Snap },
) {
  const last = await tx.contentRevision.findFirst({
    where: { entityType: input.entityType, entityId: input.entityId },
    orderBy: { version: "desc" },
    select: { version: true, snapshot: true },
  });
  const baseline = (last?.snapshot as Snap | undefined) ?? input.before;
  const changes = diffSnapshots(baseline, input.after);
  if (last && Object.keys(changes).length === 0) return null;
  return tx.contentRevision.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      courseId: input.courseId,
      version: (last?.version ?? 0) + 1,
      editorId: input.editorId,
      reason: input.reason?.trim() || null,
      changes: changes as never,
      snapshot: input.after as never,
    },
  });
}

// ---------------------------------------------------------------------------
// Entity snapshots: the editable state a revision records and a rollback restores.
// ---------------------------------------------------------------------------

export async function courseSnapshot(tx: Tx, id: string): Promise<Snap> {
  const c = await tx.program.findUniqueOrThrow({ where: { id } });
  return {
    name: c.name,
    slug: c.slug,
    levelId: c.levelId,
    tier: c.tier,
    who: c.who,
    artefact: c.artefact,
    weeks: c.weeks,
    flag: c.flag,
    outcomes: c.outcomes,
    description: c.description,
    prerequisites: c.prerequisites,
    durationMinutes: c.durationMinutes,
    difficulty: c.difficulty,
    isFree: c.isFree,
    includedInSubscription: c.includedInSubscription,
    complianceSensitive: c.complianceSensitive,
    disclaimer: c.disclaimer,
    ownerId: c.ownerId,
    academicReviewerId: c.academicReviewerId,
    complianceReviewerId: c.complianceReviewerId,
    effectiveDate: c.effectiveDate?.toISOString() ?? null,
    reviewDate: c.reviewDate?.toISOString() ?? null,
    thumbnailId: c.thumbnailId,
  };
}

export async function moduleSnapshot(tx: Tx, id: string): Promise<Snap> {
  const m = await tx.module.findUniqueOrThrow({ where: { id } });
  return {
    title: m.title,
    summary: m.summary,
    objectives: m.objectives,
    estimatedMinutes: m.estimatedMinutes,
    state: m.state,
    programId: m.programId,
    sortOrder: m.sortOrder,
  };
}

export async function lessonSnapshot(tx: Tx, id: string): Promise<Snap> {
  const l = await tx.lesson.findUniqueOrThrow({
    where: { id },
    include: { blocks: { orderBy: { sortOrder: "asc" } } },
  });
  return {
    title: l.title,
    objectives: l.objectives,
    durationSec: l.durationSec,
    state: l.state,
    freePreview: l.freePreview,
    completionRule: l.completionRule,
    effectiveDate: l.effectiveDate?.toISOString() ?? null,
    moduleId: l.moduleId,
    sortOrder: l.sortOrder,
    blocks: l.blocks.map((b) => ({ id: b.id, kind: b.kind, data: b.data })),
  };
}

export async function quizSnapshot(tx: Tx, id: string): Promise<Snap> {
  const q = await tx.quiz.findUniqueOrThrow({
    where: { id },
    include: { questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } },
  });
  return {
    title: q.title,
    kind: q.kind,
    instructions: q.instructions,
    passingScore: q.passingScore,
    timeLimitMinutes: q.timeLimitMinutes,
    maxAttempts: q.maxAttempts,
    retakeWaitMinutes: q.retakeWaitMinutes,
    randomizeQuestions: q.randomizeQuestions,
    randomizeOptions: q.randomizeOptions,
    bankId: q.bankId,
    drawCount: q.drawCount,
    showAnswers: q.showAnswers,
    archived: !!q.archivedAt,
    questions: q.questions.map((x) => ({
      id: x.id,
      type: x.type,
      scenario: x.scenario,
      prompt: x.prompt,
      options: x.options,
      targets: x.targets,
      answerKey: x.answerKey,
      rationale: x.rationale,
      points: x.points,
      difficulty: x.difficulty,
      competency: x.competency,
      remediationLessonId: x.remediationLessonId,
    })),
  };
}

export async function nextSortOrder(
  tx: Tx,
  model: "module" | "lesson" | "contentBlock" | "quizQuestion",
  where: Record<string, unknown>,
): Promise<number> {
  // Each delegate has the same findFirst shape for these columns.
  const delegate = (tx as unknown as Record<string, { findFirst: (a: unknown) => Promise<{ sortOrder: number } | null> }>)[model];
  const last = await delegate.findFirst({ where, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  return (last?.sortOrder ?? -1) + 1;
}

export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(fn, { timeout: 20_000 });
}

/** Learner history that makes a lesson undeletable. */
export async function lessonHistory(tx: Tx, lessonIds: string[]) {
  if (!lessonIds.length) return { progress: 0, attempts: 0 };
  const [progress, attempts] = await Promise.all([
    tx.progress.count({ where: { lessonId: { in: lessonIds } } }),
    tx.quizAttempt.count({ where: { quiz: { lessonId: { in: lessonIds } } } }),
  ]);
  return { progress, attempts };
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function uniqueSlug(tx: Tx, base: string, kind: "program" | "learningLevel") {
  const root = slugify(base) || "course";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const taken =
      kind === "program"
        ? await tx.program.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await tx.learningLevel.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw new ServiceError("Could not find a free address for that title. Try a different one.");
}
