import type { ContentStatus, Prisma } from "@prisma/client";
import { designMediaIds, type Design } from "@/lib/design/schema";
import { prisma } from "@/lib/db";
import { audit, type AuditAction } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import type { AnswerKey, QuestionDef } from "@/lib/assessment/questions";
import type { CourseSnapshot, SnapshotAssessment, SnapshotLesson, SnapshotModule } from "@/lib/cms/snapshot";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";
import { REVIEW_LOCKED, transaction, type Tx } from "./core";

/**
 * Review and release (blueprint §4.3, §3.4, §13).
 *
 *   Draft → In development → Academic review → Compliance review → Approved
 *         → Scheduled → Published → Under revision → … → Archived
 *
 * - Submitting builds the release snapshot and refuses if it is incomplete.
 * - Reviewers cannot approve their own submission. Compliance review is skipped only for
 *   courses explicitly marked not compliance-sensitive.
 * - Publishing needs publish authority, an approval for exactly the current draft (the
 *   draft stamp), and, for compliance-sensitive courses, a publisher other than the
 *   submitter.
 * - Publishing writes an immutable CourseVersion. Learners read it; editors keep working on
 *   the draft without touching it.
 */

type ReviewStage = "ACADEMIC" | "COMPLIANCE" | "PUBLICATION";

function log(actor: Actor | null, action: AuditAction, courseId: string, after?: unknown, before?: unknown) {
  return audit({ actorId: actor?.id ?? null, actorRoles: actor?.staffRoles ?? ["SYSTEM"], action, entity: "Course", entityId: courseId, after, before });
}

/** Changes since creation; an approval is only valid for the stamp it was given at. */
async function draftStamp(tx: Tx, courseId: string) {
  return tx.contentRevision.count({ where: { courseId } });
}

async function decide(tx: Tx, courseId: string, stage: ReviewStage, decision: string, reviewerId: string, comment?: string | null) {
  return tx.reviewDecision.create({ data: { courseId, stage, decision, reviewerId, comment: comment?.trim() || null, draftStamp: await draftStamp(tx, courseId) } });
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

function toDef(q: {
  id: string;
  type: QuestionDef["type"];
  scenario: string | null;
  prompt: string;
  options: string[];
  targets: string[];
  answerKey: Prisma.JsonValue;
  correct: number;
  rationale: string | null;
  points: number;
  difficulty: number;
  competency: string | null;
  remediationLessonId: string | null;
}): QuestionDef {
  const key = (q.answerKey as AnswerKey | null) ?? { index: q.correct };
  return {
    id: q.id,
    type: q.type,
    scenario: q.scenario,
    prompt: q.prompt,
    options: q.options,
    targets: q.targets,
    answerKey: key,
    rationale: q.rationale,
    points: q.points,
    difficulty: q.difficulty,
    competency: q.competency,
    remediationLessonId: q.remediationLessonId,
  };
}

/**
 * Builds the learner-facing tree from the draft: modules and lessons marked ready, in
 * order, with their blocks, materials and assessment. Returns the problems that would make
 * the release unusable instead of throwing, so the editor can show them all at once.
 */
export async function buildSnapshot(tx: Tx, courseId: string): Promise<{ snapshot: CourseSnapshot; mediaIds: string[]; problems: string[] }> {
  const course = await tx.program.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        where: { state: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { state: "PUBLISHED" },
            orderBy: { sortOrder: "asc" },
            include: {
              blocks: { orderBy: { sortOrder: "asc" } },
              resources: { where: { archivedAt: null }, orderBy: { createdAt: "asc" } },
              quizzes: {
                where: { archivedAt: null },
                take: 1,
                include: {
                  questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
                  bank: { include: { questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!course) throw new ServiceError("That course no longer exists.");

  const problems: string[] = [];
  const mediaIds = new Set<string>();
  if (!course.levelId) problems.push("Assign the course to a learning level.");
  if (!course.effectiveDate) problems.push("Set an effective date: every technical course shows when its content took effect.");
  if (!course.reviewDate) problems.push("Set a next-review date so the content is re-checked against current guidance.");
  if (course.thumbnailId) mediaIds.add(course.thumbnailId);

  const releasedLessonIds = new Set(course.modules.flatMap((m) => m.lessons.map((l) => l.id)));

  const modules: SnapshotModule[] = course.modules.map((m) => {
    if (!m.lessons.length) problems.push(`Module “${m.title}” has no lessons marked ready.`);
    const lessons: SnapshotLesson[] = m.lessons.map((l) => {
      const quiz = l.quizzes[0] ?? null;
      let assessment: SnapshotAssessment | null = null;
      if (quiz) {
        const questions = quiz.questions.map(toDef);
        const bank = quiz.bankId && quiz.bank && !quiz.bank.archivedAt ? quiz.bank.questions.map(toDef) : [];
        if (!questions.length && quiz.drawCount === 0) problems.push(`The assessment in “${l.title}” has no questions.`);
        if (quiz.drawCount > bank.length) problems.push(`The assessment in “${l.title}” draws ${quiz.drawCount} questions from a bank holding ${bank.length}.`);
        for (const q of [...questions, ...bank]) {
          if (q.remediationLessonId && !releasedLessonIds.has(q.remediationLessonId)) {
            // A remediation link to a lesson outside the release would be a dead end.
            q.remediationLessonId = null;
          }
        }
        assessment = {
          id: quiz.id,
          title: quiz.title,
          kind: quiz.kind,
          instructions: quiz.instructions,
          passingScore: quiz.passingScore,
          timeLimitMinutes: quiz.timeLimitMinutes,
          maxAttempts: quiz.maxAttempts,
          retakeWaitMinutes: quiz.retakeWaitMinutes,
          randomizeQuestions: quiz.randomizeQuestions,
          randomizeOptions: quiz.randomizeOptions,
          drawCount: quiz.drawCount,
          showAnswers: quiz.showAnswers,
          questions,
          bank: bank.slice(),
        };
      }
      if (!l.blocks.length && !l.resources.length && !assessment) problems.push(`Lesson “${l.title}” is empty.`);
      if (l.completionRule === "ASSESSMENT_PASS" && !assessment) problems.push(`Lesson “${l.title}” completes on passing an assessment it does not have.`);
      for (const b of l.blocks) {
        const mediaId = (b.data as { mediaId?: string } | null)?.mediaId;
        if (mediaId) mediaIds.add(mediaId);
        // Images placed inside a visual design are listed too, so learners can load them.
        if (b.kind === "DESIGN") for (const id of designMediaIds((b.data as { design: Design }).design)) mediaIds.add(id);
      }
      return {
        id: l.id,
        title: l.title,
        objectives: l.objectives,
        minutes: Math.round((l.durationSec ?? 0) / 60),
        freePreview: l.freePreview,
        completionRule: l.completionRule,
        effectiveDate: l.effectiveDate?.toISOString() ?? null,
        lastReviewedAt: l.lastReviewedAt?.toISOString() ?? null,
        nextReviewAt: l.nextReviewAt?.toISOString() ?? null,
        sources: l.sources,
        blocks: l.blocks.map((b) => ({ id: b.id, kind: b.kind, data: b.data as Record<string, unknown> })),
        resources: l.resources.map((r) => ({ id: r.id, title: r.title, mimeType: r.mimeType, sizeBytes: r.sizeBytes })),
        assessment,
      };
    });
    return { id: m.id, title: m.title, summary: m.summary, objectives: m.objectives, estimatedMinutes: m.estimatedMinutes, prerequisiteModuleId: m.prerequisiteModuleId, lessons };
  });

  if (!modules.some((m) => m.lessons.length)) problems.push("Mark at least one module and one lesson ready for release.");
  // A prerequisite outside the release would lock learners out for good, so it is dropped.
  const releasedModules = new Set(modules.map((m) => m.id));
  for (const m of modules) if (m.prerequisiteModuleId && !releasedModules.has(m.prerequisiteModuleId)) m.prerequisiteModuleId = null;
  if (course.expiresAt && course.expiresAt <= new Date()) problems.push("The expiry date has passed; clear it or set a later one.");
  if (course.isTemplate) problems.push("This is a template. Create a course from it and release that instead.");
  const now = new Date();
  for (const m of course.modules)
    for (const l of m.lessons)
      if (course.complianceSensitive && l.nextReviewAt && l.nextReviewAt < now) problems.push(`Lesson “${l.title}” is past its next review date; review it and update the dates.`);

  if (mediaIds.size) {
    const found = await tx.mediaAsset.findMany({ where: { id: { in: [...mediaIds] }, archivedAt: null }, select: { id: true } });
    const ok = new Set(found.map((f) => f.id));
    for (const id of mediaIds) if (!ok.has(id)) problems.push("An image or thumbnail points at media that has been archived or removed.");
  }

  const snapshot: CourseSnapshot = {
    schema: 1,
    course: {
      id: course.id,
      slug: course.slug,
      name: course.name,
      levelId: course.levelId,
      tier: course.tier,
      who: course.who,
      artefact: course.artefact,
      weeks: course.weeks,
      description: course.description,
      outcomes: course.outcomes,
      prerequisites: course.prerequisites,
      durationMinutes: course.durationMinutes,
      difficulty: course.difficulty,
      isFree: course.isFree,
      includedInSubscription: course.includedInSubscription,
      disclaimer: course.disclaimer,
      effectiveDate: course.effectiveDate?.toISOString() ?? null,
      reviewDate: course.reviewDate?.toISOString() ?? null,
      thumbnailId: course.thumbnailId,
    },
    modules,
  };
  return { snapshot, mediaIds: [...mediaIds], problems: [...new Set(problems)] };
}

/** For the editor: what would block a release right now. */
export async function releaseReadiness(courseId: string) {
  const { problems } = await buildSnapshot(prisma, courseId);
  return problems;
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

async function load(tx: Tx, courseId: string) {
  const c = await tx.program.findUnique({ where: { id: courseId } });
  if (!c) throw new ServiceError("That course no longer exists.");
  return c;
}

function expect(status: ContentStatus, allowed: ContentStatus[], verb: string) {
  if (!allowed.includes(status)) throw new ServiceError(`A course that is ${status.toLowerCase().replace(/_/g, " ")} cannot be ${verb}.`);
}

async function lastSubmitter(tx: Tx, courseId: string) {
  const d = await tx.reviewDecision.findFirst({ where: { courseId, decision: "submitted" }, orderBy: { createdAt: "desc" } });
  return d;
}

export async function submitForReview(actor: Actor, courseId: string, note?: string) {
  await assertCan(actor, "content.submit");
  const course = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    expect(c.status, ["DRAFT", "IN_DEVELOPMENT", "UNDER_REVISION"], "submitted for review");
    const { problems } = await buildSnapshot(tx, courseId);
    if (problems.length) throw new ServiceError(`Not ready for review: ${problems.join(" ")}`);
    await tx.program.update({ where: { id: courseId }, data: { status: "ACADEMIC_REVIEW" } });
    await decide(tx, courseId, "ACADEMIC", "submitted", actor.id, note);
    return c;
  });
  await log(actor, "submit", courseId, { status: "ACADEMIC_REVIEW", note: note ?? null }, { status: course.status });
  await notifyPermission("content.review.academic", { kind: "review", title: `${course.name} is ready for academic review`, href: `/admin/content/courses/${courseId}` }, actor.id);
}

async function review(actor: Actor, courseId: string, stage: "ACADEMIC" | "COMPLIANCE", approve: boolean, comment?: string) {
  await assertCan(actor, stage === "ACADEMIC" ? "content.review.academic" : "content.review.compliance");
  if (!approve && !comment?.trim()) throw new ServiceError("Say what needs to change. The author sees this comment.");
  const result = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    expect(c.status, [stage === "ACADEMIC" ? "ACADEMIC_REVIEW" : "COMPLIANCE_REVIEW"], `given a ${stage.toLowerCase()} decision`);
    const submitted = await lastSubmitter(tx, courseId);
    if (submitted?.reviewerId === actor.id) throw new ServiceError("You submitted this course. Another reviewer must review it.");
    if (stage === "COMPLIANCE") {
      const academic = await tx.reviewDecision.findFirst({ where: { courseId, stage: "ACADEMIC", decision: "approved" }, orderBy: { createdAt: "desc" } });
      if (academic?.reviewerId === actor.id) throw new ServiceError("You gave the academic approval. Compliance review needs a different person.");
    }
    const next: ContentStatus = !approve
      ? c.publishedVersionId
        ? "UNDER_REVISION"
        : "IN_DEVELOPMENT"
      : stage === "ACADEMIC" && c.complianceSensitive
        ? "COMPLIANCE_REVIEW"
        : "APPROVED";
    await tx.program.update({ where: { id: courseId }, data: { status: next } });
    await decide(tx, courseId, stage, approve ? "approved" : "rejected", actor.id, comment);
    return { course: c, next, submitterId: submitted?.reviewerId ?? null };
  });
  await log(actor, approve ? "approve" : "reject", courseId, { stage, status: result.next, comment: comment ?? null }, { status: result.course.status });
  const href = `/admin/content/courses/${courseId}`;
  if (result.submitterId) {
    await notifyUsers([result.submitterId], {
      kind: "review",
      title: approve ? `${result.course.name}: ${stage.toLowerCase()} review approved` : `${result.course.name}: changes requested`,
      body: comment ?? undefined,
      href,
    });
  }
  if (approve && result.next === "COMPLIANCE_REVIEW") {
    await notifyPermission("content.review.compliance", { kind: "review", title: `${result.course.name} is ready for compliance review`, href }, actor.id);
  }
  if (approve && result.next === "APPROVED") {
    await notifyPermission("content.publish", { kind: "review", title: `${result.course.name} is approved and ready to publish`, href }, actor.id);
  }
  return result.next;
}

export const reviewAcademic = (actor: Actor, courseId: string, approve: boolean, comment?: string) => review(actor, courseId, "ACADEMIC", approve, comment);
export const reviewCompliance = (actor: Actor, courseId: string, approve: boolean, comment?: string) => review(actor, courseId, "COMPLIANCE", approve, comment);

async function assertApprovalsCurrent(tx: Tx, course: { id: string; complianceSensitive: boolean }, publisherId: string | null) {
  const stamp = await draftStamp(tx, course.id);
  const submitted = await lastSubmitter(tx, course.id);
  const academic = await tx.reviewDecision.findFirst({ where: { courseId: course.id, stage: "ACADEMIC", decision: "approved" }, orderBy: { createdAt: "desc" } });
  const compliance = await tx.reviewDecision.findFirst({ where: { courseId: course.id, stage: "COMPLIANCE", decision: "approved" }, orderBy: { createdAt: "desc" } });
  if (!submitted || !academic || academic.createdAt < submitted.createdAt || academic.draftStamp !== stamp) {
    throw new ServiceError("The academic approval does not cover the current draft. Resubmit for review.");
  }
  if (course.complianceSensitive && (!compliance || compliance.createdAt < submitted.createdAt || compliance.draftStamp !== stamp)) {
    throw new ServiceError("This course is compliance-sensitive and has no current compliance approval.");
  }
  if (publisherId && course.complianceSensitive && submitted.reviewerId === publisherId) {
    throw new ServiceError("You submitted this compliance-sensitive course. A different person must publish it.");
  }
  return { submitted, academic, compliance };
}

async function release(tx: Tx, courseId: string, publisherId: string | null) {
  const c = await load(tx, courseId);
  const approvals = await assertApprovalsCurrent(tx, c, publisherId);
  const { snapshot, mediaIds, problems } = await buildSnapshot(tx, courseId);
  if (problems.length) throw new ServiceError(`Cannot publish: ${problems.join(" ")}`);
  const last = await tx.courseVersion.findFirst({ where: { courseId }, orderBy: { version: "desc" }, select: { version: true } });
  const version = await tx.courseVersion.create({
    data: {
      courseId,
      version: (last?.version ?? 0) + 1,
      snapshot: snapshot as never,
      mediaIds,
      changeSummary: approvals.submitted.comment,
      submittedById: approvals.submitted.reviewerId,
      academicApproverId: approvals.academic.reviewerId,
      complianceApproverId: approvals.compliance?.reviewerId ?? null,
      publishedById: publisherId,
      publishedAt: new Date(),
      effectiveDate: c.effectiveDate,
    },
  });
  await tx.program.update({ where: { id: courseId }, data: { status: "PUBLISHED", state: "PUBLISHED", publishedVersionId: version.id, scheduledFor: null, archivedAt: null } });
  await tx.reviewDecision.create({ data: { courseId, stage: "PUBLICATION", decision: "published", reviewerId: publisherId ?? approvals.academic.reviewerId, comment: `Version ${version.version}`, draftStamp: await draftStamp(tx, courseId) } });
  return { course: c, version };
}

/** Publish now, or schedule for later. */
export async function publishCourse(actor: Actor, courseId: string, scheduleFor?: Date | null) {
  await assertCan(actor, "content.publish");
  if (scheduleFor && scheduleFor.getTime() > Date.now() + 60_000) {
    const c = await transaction(async (tx) => {
      const c = await load(tx, courseId);
      expect(c.status, ["APPROVED"], "scheduled");
      await assertApprovalsCurrent(tx, c, actor.id);
      await tx.program.update({ where: { id: courseId }, data: { status: "SCHEDULED", scheduledFor: scheduleFor } });
      await decide(tx, courseId, "PUBLICATION", "scheduled", actor.id, `For ${scheduleFor.toISOString()}`);
      return c;
    });
    await log(actor, "schedule", courseId, { scheduledFor: scheduleFor.toISOString() }, { status: c.status });
    return { scheduled: true as const };
  }
  const { course, version } = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    expect(c.status, ["APPROVED", "SCHEDULED"], "published");
    return release(tx, courseId, actor.id);
  });
  await log(actor, "publish", courseId, { version: version.version }, { status: course.status });
  await notifyEnrolled(courseId, course.name, version.version);
  return { scheduled: false as const, version: version.version };
}

/** Releases every scheduled course whose time has come. Safe to call repeatedly. */
export async function runScheduledPublications(now = new Date()) {
  const due = await prisma.program.findMany({ where: { status: "SCHEDULED", scheduledFor: { lte: now } }, select: { id: true, name: true } });
  const done: string[] = [];
  for (const c of due) {
    try {
      const { version } = await transaction(async (tx) => {
        const fresh = await load(tx, c.id);
        if (fresh.status !== "SCHEDULED") throw new ServiceError("No longer scheduled.");
        const scheduler = await tx.reviewDecision.findFirst({ where: { courseId: c.id, decision: "scheduled" }, orderBy: { createdAt: "desc" } });
        return release(tx, c.id, scheduler?.reviewerId ?? null);
      });
      await log(null, "publish", c.id, { version: version.version, via: "schedule" });
      await notifyEnrolled(c.id, c.name, version.version);
      done.push(c.id);
    } catch (error) {
      await audit({ action: "publish", entity: "Course", entityId: c.id, outcome: "failure", after: { via: "schedule", error: error instanceof Error ? error.message : String(error) } });
    }
  }
  return done;
}

export async function withdrawFromReview(actor: Actor, courseId: string, reason?: string) {
  if (!actor.permissions.has("content.submit") && !actor.permissions.has("content.publish")) await assertCan(actor, "content.submit");
  const c = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    expect(c.status, REVIEW_LOCKED, "withdrawn from review");
    await tx.program.update({ where: { id: courseId }, data: { status: c.publishedVersionId ? "UNDER_REVISION" : "IN_DEVELOPMENT", scheduledFor: null } });
    await decide(tx, courseId, "PUBLICATION", "withdrawn", actor.id, reason);
    return c;
  });
  await log(actor, "update", courseId, { withdrawn: true, reason: reason ?? null }, { status: c.status });
}

/** Takes a course off the catalogue. Enrolled learners keep their records and certificates. */
/**
 * Withdraws courses whose expiry has passed. Learners keep their history and certificates; the
 * course simply stops being open. Run by the scheduler and on the admin dashboard.
 */
export async function runScheduledExpiries(now = new Date()) {
  const due = await prisma.program.findMany({ where: { state: "PUBLISHED", expiresAt: { lte: now } }, select: { id: true, status: true } });
  for (const c of due) {
    await prisma.program.updateMany({ where: { id: c.id, state: "PUBLISHED" }, data: { state: "DRAFT", status: REVIEW_LOCKED.includes(c.status) ? c.status : "UNDER_REVISION" } });
    await log(null, "unpublish", c.id, { reason: "expired", via: "schedule" });
  }
  return due.map((c) => c.id);
}

export async function unpublishCourse(actor: Actor, courseId: string, reason: string) {
  await assertCan(actor, "content.publish");
  if (!reason?.trim()) throw new ServiceError("Say why the course is being withdrawn.");
  const c = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    if (!c.publishedVersionId || c.state !== "PUBLISHED") throw new ServiceError("This course is not published.");
    await tx.program.update({ where: { id: courseId }, data: { state: "DRAFT", status: REVIEW_LOCKED.includes(c.status) ? c.status : "UNDER_REVISION" } });
    await decide(tx, courseId, "PUBLICATION", "withdrawn", actor.id, reason);
    return c;
  });
  await log(actor, "unpublish", courseId, { reason }, { status: c.status, state: c.state });
}

/**
 * Re-releases an earlier version as the newest one (rollback). The content was approved
 * when it was first released; the rollback itself is recorded as its own version.
 */
export async function rollbackToVersion(actor: Actor, courseId: string, versionId: string, reason: string) {
  await assertCan(actor, "content.publish");
  if (!reason?.trim()) throw new ServiceError("Say why you are rolling back.");
  const { from, to } = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    if (c.status === "ARCHIVED") throw new ServiceError("Restore the course before rolling it back.");
    const target = await tx.courseVersion.findUnique({ where: { id: versionId } });
    if (!target || target.courseId !== courseId) throw new ServiceError("That version does not belong to this course.");
    const last = await tx.courseVersion.findFirst({ where: { courseId }, orderBy: { version: "desc" }, select: { version: true } });
    const v = await tx.courseVersion.create({
      data: {
        courseId,
        version: (last?.version ?? 0) + 1,
        snapshot: target.snapshot as never,
        mediaIds: target.mediaIds,
        changeSummary: `Rollback to version ${target.version}: ${reason.trim()}`,
        submittedById: target.submittedById,
        academicApproverId: target.academicApproverId,
        complianceApproverId: target.complianceApproverId,
        publishedById: actor.id,
        publishedAt: new Date(),
        effectiveDate: target.effectiveDate,
      },
    });
    await tx.program.update({
      where: { id: courseId },
      data: { publishedVersionId: v.id, state: "PUBLISHED", status: REVIEW_LOCKED.includes(c.status) ? c.status : c.status === "PUBLISHED" ? "PUBLISHED" : "UNDER_REVISION" },
    });
    await decide(tx, courseId, "PUBLICATION", "rollback", actor.id, `To version ${target.version}: ${reason}`);
    return { from: last?.version ?? 0, to: target.version };
  });
  await log(actor, "rollback", courseId, { toVersion: to, fromVersion: from, reason });
}

/** Archive: off the catalogue and read-only. Nothing is deleted; restore brings it back as a draft. */
export async function archiveCourse(actor: Actor, courseId: string, reason: string) {
  await assertCan(actor, "content.archive");
  if (!reason?.trim()) throw new ServiceError("Say why the course is being archived.");
  const c = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    if (c.status === "ARCHIVED") throw new ServiceError("This course is already archived.");
    if (c.state === "PUBLISHED") await assertCan(actor, "content.publish", { entity: "Course", id: courseId });
    await tx.program.update({ where: { id: courseId }, data: { status: "ARCHIVED", state: "ARCHIVED", archivedAt: new Date(), scheduledFor: null } });
    await decide(tx, courseId, "PUBLICATION", "archived", actor.id, reason);
    return c;
  });
  await log(actor, "archive", courseId, { reason }, { status: c.status, state: c.state });
}

export async function restoreCourse(actor: Actor, courseId: string) {
  await assertCan(actor, "content.archive");
  const c = await transaction(async (tx) => {
    const c = await load(tx, courseId);
    if (c.status !== "ARCHIVED") throw new ServiceError("Only an archived course can be restored.");
    await tx.program.update({ where: { id: courseId }, data: { status: c.publishedVersionId ? "UNDER_REVISION" : "IN_DEVELOPMENT", state: "DRAFT", archivedAt: null } });
    await decide(tx, courseId, "PUBLICATION", "restored", actor.id, null);
    return c;
  });
  await log(actor, "restore", courseId, { status: "restored" }, { status: c.status });
}

async function notifyEnrolled(courseId: string, name: string, version: number) {
  if (version <= 1) return;
  const enrolled = await prisma.enrolment.findMany({ where: { programId: courseId, state: "ACTIVE" }, select: { userId: true } });
  const course = await prisma.program.findUnique({ where: { id: courseId }, select: { slug: true } });
  await notifyUsers(enrolled.map((e) => e.userId), { kind: "course_update", title: `${name} has been updated`, body: "Your progress carries over.", href: `/academy/${course?.slug ?? ""}` });
}

/** Writes the first release for a course that was visible before releases existed. System use only. */
export async function backfillRelease(tx: Tx, courseId: string) {
  const c = await load(tx, courseId);
  if (c.publishedVersionId || c.state !== "PUBLISHED") return null;
  const { snapshot, mediaIds } = await buildSnapshot(tx, courseId);
  const version = await tx.courseVersion.create({
    data: { courseId, version: 1, snapshot: snapshot as never, mediaIds, changeSummary: "Initial release, migrated from the pre-review platform", publishedAt: c.updatedAt, effectiveDate: c.effectiveDate },
  });
  await tx.program.update({ where: { id: courseId }, data: { publishedVersionId: version.id, status: "PUBLISHED" } });
  return version;
}
