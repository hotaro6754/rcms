import { prisma } from "@/lib/db";
import { can, type Actor } from "@/lib/actor";
import { enrolmentLive } from "@/lib/services/learning/catalog";
import { flatLessons, type CourseSnapshot } from "@/lib/cms/snapshot";

/**
 * May this person open a lesson material? Staff who can view content may; a learner may when
 * a released course lists the material and they are enrolled (or the lesson is a free
 * preview). Whether they may also download it is the material's own `downloadable` setting.
 */
export async function resourceAccess(actor: Actor, id: string) {
  const res = await prisma.resource.findUnique({
    where: { id },
    include: { lesson: { select: { id: true, module: { select: { program: { select: { id: true, state: true, publishedVersion: { select: { snapshot: true } } } } } } } } },
  });
  if (!res) return { ok: false as const, status: 404, message: "Not found." };
  const staff = can(actor, "content.view");
  if (!staff) {
    const course = res.lesson.module.program;
    const snapshot = course.publishedVersion?.snapshot as unknown as CourseSnapshot | undefined;
    const lesson = snapshot ? flatLessons(snapshot).find((l) => l.resources.some((r) => r.id === id)) : undefined;
    if (course.state !== "PUBLISHED" || !lesson) return { ok: false as const, status: 403, message: "This material is not part of a published course." };
    const enrolment = await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId: course.id } } });
    if (!enrolmentLive(enrolment) && !lesson.freePreview) return { ok: false as const, status: 403, message: "This material belongs to a course you are not enrolled on." };
  }
  return { ok: true as const, res, staff };
}
