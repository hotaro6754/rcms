import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getActor, can, BLOCKED_STATUSES } from "@/lib/actor";
import { downloadHeaders, isAvailable, isLink, readStored } from "@/lib/storage";
import { enrolmentLive } from "@/lib/services/learning/catalog";
import { flatLessons, type CourseSnapshot } from "@/lib/cms/snapshot";

/**
 * Download a course material. A learner must be signed in, verified, active and have live
 * access to a released course whose snapshot lists this resource (or the resource belongs to
 * a free-preview lesson of it). Staff who can view content can open anything. Every download
 * is audited.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor?.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in to download course materials.", { status: 401 });

  const { id } = await params;
  const res = await prisma.resource.findUnique({
    where: { id },
    include: { lesson: { select: { id: true, module: { select: { program: { select: { id: true, state: true, publishedVersion: { select: { snapshot: true } } } } } } } } },
  });
  if (!res) return new NextResponse("Not found.", { status: 404 });

  if (!can(actor, "content.view")) {
    const course = res.lesson.module.program;
    const snapshot = course.publishedVersion?.snapshot as unknown as CourseSnapshot | undefined;
    const lesson = snapshot ? flatLessons(snapshot).find((l) => l.resources.some((r) => r.id === id)) : undefined;
    if (course.state !== "PUBLISHED" || !lesson) return new NextResponse("This material is not part of a published course.", { status: 403 });
    const enrolment = await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId: course.id } } });
    if (!enrolmentLive(enrolment) && !lesson.freePreview) {
      return new NextResponse("This material belongs to a course you are not enrolled on.", { status: 403 });
    }
  }

  if (!isAvailable(res.fileKey)) return new NextResponse("This material is listed but has not been uploaded yet.", { status: 404 });

  await audit({ actorId: actor.id, action: "download", entity: "Resource", entityId: res.id, after: { title: res.title } });

  if (isLink(res.fileKey)) return NextResponse.redirect(res.fileKey, 302);
  const body = await readStored(res.fileKey);
  const ext = res.fileKey.split(".").pop();
  const name = `${res.title.replace(/[^\w\- ]+/g, "").trim() || "material"}${ext ? `.${ext}` : ""}`;
  return new NextResponse(new Uint8Array(body), { headers: downloadHeaders(res.mimeType, body.length, name) });
}
