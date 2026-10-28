import { prisma } from "@/lib/db";
import { can, type Actor } from "@/lib/actor";
import { enrolmentLive } from "@/lib/services/learning/catalog";
import { designMediaIds, type Design } from "@/lib/design/schema";
import { strings } from "@/lib/json-list";

/**
 * May this person see a media-library file inside course `courseId`? Staff who can view
 * content may; a learner may when the released course lists the file and they have live
 * access, or the file appears in a free-preview lesson of that course. Knowing the id is not
 * enough.
 */
export async function canSeeCourseMedia(actor: Actor, mediaId: string, courseId: string | null) {
  if (can(actor, "content.view")) return true;
  if (!courseId) return false;
  const course = await prisma.program.findUnique({ where: { id: courseId }, select: { id: true, state: true, publishedVersion: { select: { mediaIds: true, snapshot: true } } } });
  if (!course || course.state !== "PUBLISHED" || !course.publishedVersion || !strings(course.publishedVersion.mediaIds).includes(mediaId)) return false;
  const enrolment = await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId: course.id } } });
  if (enrolmentLive(enrolment)) return true;
  // Free-preview lessons may show their media to signed-in visitors who are not enrolled.
  type Snap = { modules?: { lessons?: { freePreview?: boolean; blocks?: { kind?: string; data?: { mediaId?: string; design?: Design } }[] }[] }[] };
  const snap = course.publishedVersion.snapshot as Snap;
  return !!snap?.modules?.some((m) =>
    m.lessons?.some((l) => l.freePreview && l.blocks?.some((b) => b.data?.mediaId === mediaId || (b.kind === "DESIGN" && b.data?.design && designMediaIds(b.data.design).includes(mediaId)))),
  );
}
