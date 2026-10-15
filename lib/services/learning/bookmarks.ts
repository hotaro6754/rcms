import { prisma } from "@/lib/db";
import type { Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { findLesson } from "@/lib/cms/snapshot";
import { courseAccess, getPublishedCourse } from "./catalog";

/** Lessons a learner saved. Only lessons of released courses they can open can be saved. */

export async function toggleBookmark(actor: Actor, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { module: { select: { program: { select: { id: true, slug: true } } } } } });
  if (!lesson) throw new ServiceError("That lesson no longer exists.");
  const course = await getPublishedCourse(lesson.module.program.slug);
  if (!course || !findLesson(course.snapshot, lessonId)) throw new ServiceError("That lesson is not part of a published course.");
  const access = await courseAccess(actor, course);
  if (!access.full || !access.tracked) throw new ServiceError("Enrol on the course to save its lessons.");
  const existing = await prisma.bookmark.findUnique({ where: { userId_lessonId: { userId: actor.id, lessonId } } });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return false;
  }
  await prisma.bookmark.create({ data: { userId: actor.id, lessonId, courseId: course.id } });
  return true;
}

export async function isBookmarked(userId: string, lessonId: string) {
  return !!(await prisma.bookmark.findUnique({ where: { userId_lessonId: { userId, lessonId } }, select: { id: true } }));
}

/** Saved lessons with titles from the released version; lessons no longer released are skipped. */
export async function listBookmarks(userId: string) {
  const rows = await prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { lessonId: true, createdAt: true, lesson: { select: { module: { select: { program: { select: { slug: true } } } } } } } });
  const out: { lessonId: string; title: string; course: string; href: string; savedAt: Date }[] = [];
  for (const r of rows) {
    const course = await getPublishedCourse(r.lesson.module.program.slug);
    const l = course && findLesson(course.snapshot, r.lessonId);
    if (course && l) out.push({ lessonId: r.lessonId, title: l.title, course: course.snapshot.course.name, href: `/academy/${course.slug}/${r.lessonId}`, savedAt: r.createdAt });
  }
  return out;
}
