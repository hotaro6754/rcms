import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, can, BLOCKED_STATUSES } from "@/lib/actor";
import { downloadHeaders, readStored } from "@/lib/storage";
import { enrolmentLive } from "@/lib/services/learning/catalog";

/**
 * Serves a media-library file. Public assets (catalogue images) to anyone; everything else
 * to staff who can view content, or to a learner with live access to a released course whose
 * snapshot lists the asset. Knowing the URL is not enough.
 *
 * `?c=<courseId>` names the course the image is shown in, so the check is one lookup.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return new NextResponse("Not found.", { status: 404 });

  if (!asset.isPublic) {
    const actor = await getActor();
    if (!actor || !actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in to view this.", { status: 401 });
    if (!can(actor, "content.view")) {
      const courseId = new URL(req.url).searchParams.get("c");
      const course = courseId
        ? await prisma.program.findUnique({ where: { id: courseId }, select: { id: true, state: true, publishedVersion: { select: { mediaIds: true } } } })
        : null;
      const listed = !!course && course.state === "PUBLISHED" && !!course.publishedVersion?.mediaIds.includes(id);
      const enrolment = listed ? await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId: course!.id } } }) : null;
      // Free-preview lessons may show images to signed-in visitors who are not enrolled; the
      // image must still belong to the released course.
      if (!listed || (!enrolmentLive(enrolment) && !(await inFreePreview(course!.id, id)))) {
        return new NextResponse("You do not have access to this file.", { status: 403 });
      }
    }
  } else if (asset.archivedAt) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const body = await readStored(asset.fileKey).catch(() => null);
  if (!body) return new NextResponse("This file is missing from storage.", { status: 404 });
  const inline = asset.kind === "IMAGE" || asset.kind === "AUDIO";
  return new NextResponse(new Uint8Array(body), {
    headers: {
      ...downloadHeaders(asset.mimeType, body.length, asset.title, inline),
      ...(asset.isPublic ? { "Cache-Control": "public, max-age=3600" } : {}),
    },
  });
}

async function inFreePreview(courseId: string, mediaId: string) {
  const v = await prisma.program.findUnique({ where: { id: courseId }, select: { publishedVersion: { select: { snapshot: true } } } });
  const snap = v?.publishedVersion?.snapshot as { modules?: { lessons?: { freePreview?: boolean; blocks?: { data?: { mediaId?: string } }[] }[] }[] } | undefined;
  return !!snap?.modules?.some((m) => m.lessons?.some((l) => l.freePreview && l.blocks?.some((b) => b.data?.mediaId === mediaId)));
}
