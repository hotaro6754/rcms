import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { flatLessons, findLesson, type CourseSnapshot } from "@/lib/cms/snapshot";
import { activeSubscriptionCovering, courseAccess, coursePrerequisiteMissing, getPublishedCourse, getPublishedCourseById } from "./catalog";

/**
 * Enrolment and progress for learners.
 *
 * Completion is persisted per lesson and is idempotent: a second "complete" (double click,
 * retry, refresh) keeps the first timestamp. A lesson whose rule is "complete by passing the
 * assessment" can only be completed by the grading service, never by a button.
 */

export async function enrolFree(actor: Actor, courseId: string) {
  const course = await getPublishedCourseById(courseId);
  if (!course) throw new ServiceError("That course is not available.");
  const sub = await activeSubscriptionCovering(actor.id, { levelId: course.levelId, includedInSubscription: course.snapshot.course.includedInSubscription });
  const source = course.snapshot.course.isFree ? "FREE" : sub ? "SUBSCRIPTION" : null;
  if (!source) throw new ServiceError("This course needs a purchase or a subscription.");
  const missing = await coursePrerequisiteMissing(actor.id, courseId);
  if (missing) throw new ServiceError(missing);
  try {
    const e = await prisma.enrolment.create({ data: { userId: actor.id, programId: courseId, source } });
    await audit({ actorId: actor.id, action: "enrol", entity: "Enrolment", entityId: e.id, after: { programId: courseId, source } });
    return e;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.enrolment.findUniqueOrThrow({ where: { userId_programId: { userId: actor.id, programId: courseId } } });
      if (existing.state === "ACTIVE" || existing.state === "COMPLETED") return existing;
      // A lapsed or cancelled enrolment comes back to life on a fresh, entitled enrolment.
      if (existing.state === "SUSPENDED") throw new ServiceError("Your access to this course is suspended. Contact support.");
      const e = await prisma.enrolment.update({ where: { id: existing.id }, data: { state: "ACTIVE", source, expiresAt: null } });
      await audit({ actorId: actor.id, action: "enrol", entity: "Enrolment", entityId: e.id, before: { state: existing.state }, after: { state: "ACTIVE", source } });
      return e;
    }
    throw error;
  }
}

/**
 * A module with a prerequisite stays locked until every lesson of the prerequisite module in
 * the same release is complete. Staff previews are never locked.
 */
export async function moduleLock(userId: string, snapshot: CourseSnapshot, moduleId: string): Promise<{ locked: boolean; prerequisite: string | null }> {
  const mod = snapshot.modules.find((m) => m.id === moduleId);
  const pre = mod?.prerequisiteModuleId ? snapshot.modules.find((m) => m.id === mod.prerequisiteModuleId) : null;
  if (!pre || !pre.lessons.length) return { locked: false, prerequisite: null };
  const done = await prisma.progress.count({ where: { userId, lessonId: { in: pre.lessons.map((l) => l.id) }, completedAt: { not: null } } });
  return { locked: done < pre.lessons.length, prerequisite: pre.title };
}

async function resolveLesson(actor: Actor, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { program: { select: { slug: true } } } } } });
  if (!lesson) throw new ServiceError("That lesson no longer exists.");
  const course = await getPublishedCourse(lesson.module.program.slug);
  const inRelease = course && findLesson(course.snapshot, lessonId);
  if (!course || !inRelease) throw new ServiceError("That lesson is not part of a published course.");
  const access = await courseAccess(actor, course);
  return { course, lesson: inRelease, access };
}

/** Records that the learner opened the lesson. Never fails the page that calls it. */
export async function recordLessonView(actor: Actor, courseId: string, lessonId: string) {
  try {
    const now = new Date();
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: actor.id, lessonId } },
      create: { userId: actor.id, lessonId, startedAt: now, lastViewedAt: now },
      update: { lastViewedAt: now },
    });
  } catch (error) {
    console.error("[progress] could not record view", { courseId, lessonId, error });
  }
}

export async function completeLesson(actor: Actor, lessonId: string, opts: { viaAssessment?: boolean } = {}) {
  const { course, lesson, access } = await resolveLesson(actor, lessonId);
  if (!access.full || !access.tracked) throw new ServiceError("You are not enrolled on this course.");
  const lock = await moduleLock(actor.id, course.snapshot, lesson.moduleId);
  if (lock.locked) throw new ServiceError(`Finish “${lock.prerequisite}” first.`);
  if (lesson.completionRule === "ASSESSMENT_PASS" && !opts.viaAssessment) {
    throw new ServiceError("This lesson completes when you pass its assessment.");
  }
  const now = new Date();
  // Conditional update first: only a row with no completion gets one, so concurrent or
  // repeated requests cannot move the timestamp.
  const updated = await prisma.progress.updateMany({ where: { userId: actor.id, lessonId, completedAt: null }, data: { completedAt: now, lastViewedAt: now } });
  if (updated.count === 0) {
    try {
      await prisma.progress.create({ data: { userId: actor.id, lessonId, startedAt: now, lastViewedAt: now, completedAt: now } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { alreadyDone: true };
      throw error;
    }
  }
  await audit({ actorId: actor.id, action: "update", entity: "Progress", entityId: lessonId, after: { completed: true, via: opts.viaAssessment ? "assessment" : "learner" } });
  return { alreadyDone: false };
}

export async function reopenLesson(actor: Actor, lessonId: string) {
  const { lesson, access } = await resolveLesson(actor, lessonId);
  if (!access.tracked) throw new ServiceError("You are not enrolled on this course.");
  if (lesson.completionRule === "ASSESSMENT_PASS") throw new ServiceError("A lesson completed by assessment cannot be reopened.");
  await prisma.progress.updateMany({ where: { userId: actor.id, lessonId }, data: { completedAt: null } });
  await audit({ actorId: actor.id, action: "update", entity: "Progress", entityId: lessonId, after: { completed: false } });
}

export interface CourseProgress {
  lessonsTotal: number;
  lessonsDone: number;
  percent: number;
  modules: { id: string; title: string; total: number; done: number }[];
  next: { id: string; title: string; moduleTitle: string } | null;
  lastViewed: { id: string; title: string } | null;
  done: Set<string>;
}

/** Progress against the released lessons only. Draft and archived lessons never count. */
export async function progressFor(userId: string, snapshot: CourseSnapshot): Promise<CourseProgress> {
  const lessons = flatLessons(snapshot);
  const rows = lessons.length
    ? await prisma.progress.findMany({ where: { userId, lessonId: { in: lessons.map((l) => l.id) } }, select: { lessonId: true, completedAt: true, lastViewedAt: true } })
    : [];
  const done = new Set(rows.filter((r) => r.completedAt).map((r) => r.lessonId));
  const last = rows.filter((r) => r.lastViewedAt).sort((a, b) => +b.lastViewedAt! - +a.lastViewedAt!)[0];
  const next = lessons.find((l) => !done.has(l.id)) ?? null;
  const lastLesson = last ? lessons.find((l) => l.id === last.lessonId) : null;
  return {
    lessonsTotal: lessons.length,
    lessonsDone: done.size,
    percent: lessons.length ? Math.round((done.size / lessons.length) * 100) : 0,
    modules: snapshot.modules.map((m) => ({ id: m.id, title: m.title, total: m.lessons.length, done: m.lessons.filter((l) => done.has(l.id)).length })),
    next: next ? { id: next.id, title: next.title, moduleTitle: next.moduleTitle } : null,
    lastViewed: lastLesson ? { id: lastLesson.id, title: lastLesson.title } : null,
    done,
  };
}
