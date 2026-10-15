import { cache } from "react";
import type { Enrolment } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/actor";
import { can } from "@/lib/actor";
import type { CourseSnapshot } from "@/lib/cms/snapshot";
import { flatLessons, snapshotMinutes } from "@/lib/cms/snapshot";

/**
 * Reads of released content, and the one definition of who may open a course.
 *
 * Every learner-facing page goes through here. Nothing reads draft rows on behalf of a
 * learner; a staff preview reads the draft explicitly through the CMS preview.
 */

export interface PublishedCourse {
  id: string;
  slug: string;
  name: string;
  levelId: string | null;
  sortOrder: number;
  version: number;
  publishedAt: Date | null;
  snapshot: CourseSnapshot;
}

export const getPublishedCourse = cache(async (slug: string): Promise<PublishedCourse | null> => {
  const c = await prisma.program.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, levelId: true, sortOrder: true, state: true, publishedVersion: true },
  });
  if (!c || c.state !== "PUBLISHED" || !c.publishedVersion) return null;
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    levelId: c.levelId,
    sortOrder: c.sortOrder,
    version: c.publishedVersion.version,
    publishedAt: c.publishedVersion.publishedAt,
    snapshot: c.publishedVersion.snapshot as unknown as CourseSnapshot,
  };
});

export const getPublishedCourseById = cache(async (id: string) => {
  const c = await prisma.program.findUnique({ where: { id }, select: { slug: true } });
  return c ? getPublishedCourse(c.slug) : null;
});

export async function listPublishedCourses() {
  const rows = await prisma.program.findMany({
    where: { state: "PUBLISHED", publishedVersionId: { not: null } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      levelId: true,
      sortOrder: true,
      products: { where: { active: true, kind: "PROGRAM" }, select: { id: true, amount: true, currency: true } },
      publishedVersion: { select: { version: true, snapshot: true, publishedAt: true } },
    },
  });
  return rows.map((r) => {
    const s = r.publishedVersion!.snapshot as unknown as CourseSnapshot;
    const lessons = flatLessons(s);
    return {
      id: r.id,
      slug: r.slug,
      levelId: r.levelId,
      sortOrder: r.sortOrder,
      version: r.publishedVersion!.version,
      name: s.course.name,
      description: s.course.description,
      who: s.course.who,
      outcomes: s.course.outcomes,
      prerequisites: s.course.prerequisites,
      difficulty: s.course.difficulty,
      isFree: s.course.isFree,
      includedInSubscription: s.course.includedInSubscription,
      thumbnailId: s.course.thumbnailId,
      modules: s.modules.length,
      lessons: lessons.length,
      previews: lessons.filter((l) => l.freePreview).length,
      assessments: lessons.filter((l) => l.assessment).length,
      minutes: s.course.durationMinutes ?? snapshotMinutes(s),
      price: r.products[0] ?? null,
    };
  });
}

export async function listPublishedLevels() {
  return prisma.learningLevel.findMany({ where: { status: "PUBLISHED" }, orderBy: { sequence: "asc" } });
}

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

export type AccessReason = "enrolled" | "completed" | "subscription" | "staff_preview" | "free_preview" | "none";

export interface Access {
  /** May open the whole course. */
  full: boolean;
  reason: AccessReason;
  enrolment: Enrolment | null;
  /** Records progress and attempts (learners); staff previews do not. */
  tracked: boolean;
  /** An active subscription covers the course but no enrolment exists yet. */
  coveredBySubscription: boolean;
}

export function enrolmentLive(e: Pick<Enrolment, "state" | "expiresAt"> | null | undefined, now = new Date()) {
  if (!e) return false;
  if (e.state !== "ACTIVE" && e.state !== "COMPLETED") return false;
  return !e.expiresAt || e.expiresAt > now;
}

export async function activeSubscriptionCovering(userId: string, course: { levelId: string | null; includedInSubscription: boolean }, now = new Date()) {
  if (!course.includedInSubscription) return null;
  const subs = await prisma.subscription.findMany({
    where: { userId, status: { in: ["TRIALING", "ACTIVE", "GRACE_PERIOD"] } },
    include: { product: { select: { levelId: true } } },
  });
  return (
    subs.find((s) => {
      const until = s.status === "GRACE_PERIOD" ? (s.graceEndsAt ?? s.currentPeriodEnd) : s.currentPeriodEnd;
      return until > now && (!s.product.levelId || s.product.levelId === course.levelId);
    }) ?? null
  );
}

export async function courseAccess(actor: Actor | null, course: { id: string; levelId: string | null; snapshot: CourseSnapshot }): Promise<Access> {
  const none: Access = { full: false, reason: "none", enrolment: null, tracked: false, coveredBySubscription: false };
  if (!actor) return none;
  const enrolment = await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId: course.id } } });
  if (enrolmentLive(enrolment)) {
    return { full: true, reason: enrolment!.state === "COMPLETED" ? "completed" : "enrolled", enrolment, tracked: true, coveredBySubscription: false };
  }
  const sub = await activeSubscriptionCovering(actor.id, { levelId: course.levelId, includedInSubscription: course.snapshot.course.includedInSubscription });
  if (can(actor, "content.view")) return { full: true, reason: "staff_preview", enrolment, tracked: false, coveredBySubscription: !!sub };
  return { ...none, enrolment, coveredBySubscription: !!sub };
}

/** Whether this actor may open one lesson of a course. */
export async function lessonAccess(actor: Actor | null, course: { id: string; levelId: string | null; snapshot: CourseSnapshot }, lessonId: string) {
  const access = await courseAccess(actor, course);
  if (access.full) return access;
  const lesson = flatLessons(course.snapshot).find((l) => l.id === lessonId);
  if (actor && lesson?.freePreview) return { ...access, full: false, reason: "free_preview" as const, tracked: false };
  return null;
}

/**
 * A course may require a valid certificate for another course before enrolment. Checked on
 * free enrolment and before checkout; staff granting access can override it deliberately.
 */
export async function coursePrerequisiteMissing(userId: string, courseId: string): Promise<string | null> {
  const c = await prisma.program.findUnique({ where: { id: courseId }, select: { requiresCourseId: true } });
  if (!c?.requiresCourseId) return null;
  const has = await prisma.certificate.findFirst({ where: { userId, programId: c.requiresCourseId, revokedAt: null }, select: { id: true } });
  if (has) return null;
  const req = await prisma.program.findUnique({ where: { id: c.requiresCourseId }, select: { name: true } });
  return `Complete ${req?.name ?? "the prerequisite course"} and claim its certificate first.`;
}

