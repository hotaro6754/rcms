import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, can, BLOCKED_STATUSES } from "@/lib/actor";
import { downloadHeaders, readStored } from "@/lib/storage";
import { canSeeCourseMedia } from "@/lib/services/learning/media-access";

/**
 * Serves a media-library file. Public assets (catalogue and website images) to anyone;
 * everything else to staff who can view content, or to a learner with access to a released
 * course that lists the asset (lib/services/learning/media-access.ts). Knowing the URL is not
 * enough.
 *
 * Learners never receive course documents (PDFs) as files: they are only readable page by page
 * in the lesson's view-only reader (/api/doc-pages). `?c=<courseId>` names the course the file
 * is shown in.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return new NextResponse("Not found.", { status: 404 });

  if (asset.isPublic) {
    if (asset.archivedAt) return new NextResponse("Not found.", { status: 404 });
    const body = await readStored(asset.fileKey).catch(() => null);
    if (!body) return new NextResponse("This file is missing from storage.", { status: 404 });
    return new NextResponse(new Uint8Array(body), {
      headers: { ...downloadHeaders(asset.mimeType, body.length, asset.title, true), "Cache-Control": "public, max-age=3600" },
    });
  }

  const actor = await getActor();
  if (!actor || !actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in to view this.", { status: 401 });
  const staff = can(actor, "content.view");
  if (!(await canSeeCourseMedia(actor, id, new URL(req.url).searchParams.get("c")))) return new NextResponse("You do not have access to this file.", { status: 403 });
  if (!staff && asset.kind === "DOCUMENT") return new NextResponse("This document can only be read inside the lesson.", { status: 403 });

  const body = await readStored(asset.fileKey).catch(() => null);
  if (!body) return new NextResponse("This file is missing from storage.", { status: 404 });

  const inline = asset.kind === "IMAGE" || asset.kind === "AUDIO";
  return new NextResponse(new Uint8Array(body), { headers: { ...downloadHeaders(asset.mimeType, body.length, asset.title, inline), "Cache-Control": "private, no-store" } });
}
