import type { BlockKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { parseBlock } from "@/lib/cms/blocks";
import {
  courseSnapshot,
  diffSnapshots,
  lessonSnapshot,
  lockedCheck,
  markEdited,
  moduleSnapshot,
  quizSnapshot,
  recordRevision,
  transaction,
  type Tx,
} from "./core";

/**
 * Version history (blueprint §4.5): who changed what, when and why, field by field, with
 * comparison between any two versions and rollback to any earlier one. A rollback is itself
 * a new revision, so nothing in the history is ever rewritten.
 */

export async function listRevisions(entityType: string, entityId: string) {
  const rows = await prisma.contentRevision.findMany({ where: { entityType, entityId }, orderBy: { version: "desc" }, take: 100 });
  const editors = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.editorId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const name = new Map(editors.map((e) => [e.id, e.name]));
  return rows.map((r) => ({ ...r, editorName: r.editorId ? (name.get(r.editorId) ?? "Unknown") : "System" }));
}

export async function compareRevisions(aId: string, bId: string) {
  const [a, b] = await Promise.all([prisma.contentRevision.findUnique({ where: { id: aId } }), prisma.contentRevision.findUnique({ where: { id: bId } })]);
  if (!a || !b || a.entityId !== b.entityId || a.entityType !== b.entityType) throw new ServiceError("Choose two versions of the same item.");
  const [older, newer] = a.version < b.version ? [a, b] : [b, a];
  return { older, newer, changes: diffSnapshots(older.snapshot as Record<string, unknown>, newer.snapshot as Record<string, unknown>) };
}

type Snap = Record<string, unknown>;

const date = (v: unknown) => (typeof v === "string" ? new Date(v) : null);

async function restoreCourse(tx: Tx, id: string, s: Snap) {
  await tx.program.update({
    where: { id },
    data: {
      name: s.name as string,
      tier: (s.tier as string) ?? "",
      who: (s.who as string) ?? "",
      artefact: (s.artefact as string) ?? "",
      weeks: (s.weeks as string) ?? "",
      flag: (s.flag as string | null) ?? null,
      outcomes: (s.outcomes as string[]) ?? [],
      description: (s.description as string | null) ?? null,
      prerequisites: (s.prerequisites as string[]) ?? [],
      durationMinutes: (s.durationMinutes as number | null) ?? null,
      difficulty: (s.difficulty as string | null) ?? null,
      isFree: !!s.isFree,
      includedInSubscription: s.includedInSubscription !== false,
      complianceSensitive: s.complianceSensitive !== false,
      disclaimer: (s.disclaimer as string | null) ?? null,
      effectiveDate: date(s.effectiveDate),
      reviewDate: date(s.reviewDate),
      thumbnailId: (s.thumbnailId as string | null) ?? null,
      // Revisions written before these fields existed leave them as they are.
      ...("expiresAt" in s ? { expiresAt: date(s.expiresAt) } : {}),
      ...("requiresCourseId" in s ? { requiresCourseId: (s.requiresCourseId as string | null) ?? null } : {}),
      lockVersion: { increment: 1 },
    },
  });
}

async function restoreModule(tx: Tx, id: string, s: Snap) {
  // Content and state are restored; position and parent are structure and stay as they are.
  await tx.module.update({
    where: { id },
    data: {
      title: s.title as string,
      summary: (s.summary as string | null) ?? null,
      objectives: (s.objectives as string[]) ?? [],
      estimatedMinutes: (s.estimatedMinutes as number | null) ?? null,
      ...("prerequisiteModuleId" in s ? { prerequisiteModuleId: (s.prerequisiteModuleId as string | null) ?? null } : {}),
      state: (s.state as "DRAFT" | "PUBLISHED" | "ARCHIVED") ?? "DRAFT",
      lockVersion: { increment: 1 },
    },
  });
}

async function restoreLesson(tx: Tx, id: string, s: Snap) {
  const blocks = ((s.blocks as { kind: BlockKind; data: unknown }[]) ?? []).filter((b) => parseBlock(b.kind, b.data).success);
  await tx.lesson.update({
    where: { id },
    data: {
      title: s.title as string,
      objectives: (s.objectives as string[]) ?? [],
      durationSec: (s.durationSec as number | null) ?? null,
      state: (s.state as "DRAFT" | "PUBLISHED" | "ARCHIVED") ?? "DRAFT",
      freePreview: !!s.freePreview,
      completionRule: (s.completionRule as "MANUAL" | "ASSESSMENT_PASS") ?? "MANUAL",
      effectiveDate: date(s.effectiveDate),
      ...("lastReviewedAt" in s ? { lastReviewedAt: date(s.lastReviewedAt), nextReviewAt: date(s.nextReviewAt), sources: (s.sources as string[]) ?? [], contentOwnerId: (s.contentOwnerId as string | null) ?? null } : {}),
      lockVersion: { increment: 1 },
    },
  });
  await tx.contentBlock.deleteMany({ where: { lessonId: id } });
  if (blocks.length) await tx.contentBlock.createMany({ data: blocks.map((b, i) => ({ lessonId: id, kind: b.kind, data: b.data as never, sortOrder: i })) });
}

async function restoreQuiz(tx: Tx, id: string, s: Snap) {
  await tx.quiz.update({
    where: { id },
    data: {
      title: s.title as string,
      kind: s.kind as never,
      instructions: (s.instructions as string | null) ?? null,
      passingScore: s.passingScore as number,
      timeLimitMinutes: (s.timeLimitMinutes as number | null) ?? null,
      maxAttempts: (s.maxAttempts as number | null) ?? null,
      retakeWaitMinutes: (s.retakeWaitMinutes as number) ?? 0,
      randomizeQuestions: !!s.randomizeQuestions,
      randomizeOptions: !!s.randomizeOptions,
      bankId: (s.bankId as string | null) ?? null,
      drawCount: (s.drawCount as number) ?? 0,
      showAnswers: s.showAnswers !== false,
      archivedAt: s.archived ? new Date() : null,
    },
  });
  const wanted = (s.questions as (Snap & { id: string })[]) ?? [];
  const keep = new Set(wanted.map((q) => q.id));
  // Questions added after the target version leave the assessment. Archived, not deleted:
  // attempts carry their own copies, but the row may still be referenced in reports.
  await tx.quizQuestion.updateMany({ where: { quizId: id, archivedAt: null, id: { notIn: [...keep] } }, data: { archivedAt: new Date() } });
  for (const [i, q] of wanted.entries()) {
    const data = {
      type: q.type as never,
      scenario: (q.scenario as string | null) ?? null,
      prompt: q.prompt as string,
      options: (q.options as string[]) ?? [],
      targets: (q.targets as string[]) ?? [],
      answerKey: (q.answerKey ?? undefined) as Prisma.InputJsonValue,
      rationale: (q.rationale as string | null) ?? null,
      points: (q.points as number) ?? 1,
      difficulty: (q.difficulty as number) ?? 2,
      competency: (q.competency as string | null) ?? null,
      remediationLessonId: (q.remediationLessonId as string | null) ?? null,
      sortOrder: i,
      archivedAt: null,
    };
    const existing = await tx.quizQuestion.findUnique({ where: { id: q.id }, select: { quizId: true } });
    if (existing && existing.quizId === id) await tx.quizQuestion.update({ where: { id: q.id }, data });
    else await tx.quizQuestion.create({ data: { ...data, quizId: id } });
  }
}

export async function rollbackRevision(actor: Actor, revisionId: string, reason: string) {
  const rev = await prisma.contentRevision.findUnique({ where: { id: revisionId } });
  if (!rev) throw new ServiceError("That version no longer exists.");
  await assertCan(actor, rev.entityType === "Quiz" ? "assessment.manage" : rev.entityType === "Level" ? "content.structure" : "content.edit");
  if (!reason?.trim()) throw new ServiceError("Say why you are restoring this version.");
  const snap = rev.snapshot as Snap;
  await transaction(async (tx) => {
    const courseId = rev.courseId;
    if (courseId) await lockedCheck(tx, courseId);
    let before: Snap;
    let after: () => Promise<Snap>;
    switch (rev.entityType) {
      case "Course":
        before = await courseSnapshot(tx, rev.entityId);
        await restoreCourse(tx, rev.entityId, snap);
        after = () => courseSnapshot(tx, rev.entityId);
        break;
      case "Module":
        before = await moduleSnapshot(tx, rev.entityId);
        await restoreModule(tx, rev.entityId, snap);
        after = () => moduleSnapshot(tx, rev.entityId);
        break;
      case "Lesson":
        before = await lessonSnapshot(tx, rev.entityId);
        await restoreLesson(tx, rev.entityId, snap);
        after = () => lessonSnapshot(tx, rev.entityId);
        break;
      case "Quiz":
        before = await quizSnapshot(tx, rev.entityId);
        await restoreQuiz(tx, rev.entityId, snap);
        after = () => quizSnapshot(tx, rev.entityId);
        break;
      case "Level": {
        const l = await tx.learningLevel.findUniqueOrThrow({ where: { id: rev.entityId } });
        before = l as unknown as Snap;
        const { effectiveDate, reviewDate, ...rest } = snap;
        await tx.learningLevel.update({ where: { id: rev.entityId }, data: { ...(rest as object), effectiveDate: date(effectiveDate), reviewDate: date(reviewDate) } });
        after = async () => snap;
        break;
      }
      default:
        throw new ServiceError("This kind of item cannot be rolled back.");
    }
    if (courseId) await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: rev.entityType, entityId: rev.entityId, courseId, editorId: actor.id, reason: `Restored version ${rev.version}: ${reason.trim()}`, before, after: await after() });
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "rollback", entity: rev.entityType, entityId: rev.entityId, after: { toVersion: rev.version, reason } });
}
