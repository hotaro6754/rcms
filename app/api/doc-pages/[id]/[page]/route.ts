import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { canSeeCourseMedia } from "@/lib/services/learning/media-access";
import { pageImageResponse } from "@/lib/documents/pages";

/**
 * One page of a view-only document block, as a watermarked image. The PDF itself never leaves
 * the server. Same access rule as the media route.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; page: string }> }) {
  const { id, page } = await params;
  const pageNo = Number(page);
  if (!Number.isInteger(pageNo) || pageNo < 1 || pageNo > 1000) return new NextResponse("Not found.", { status: 404 });
  const actor = await getActor();
  if (!actor || !actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in to read this.", { status: 401 });
  const asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { fileKey: true, mimeType: true } });
  if (!asset || asset.mimeType !== "application/pdf") return new NextResponse("Not found.", { status: 404 });
  if (!(await canSeeCourseMedia(actor, id, new URL(req.url).searchParams.get("c")))) return new NextResponse("You do not have access to this document.", { status: 403 });
  return pageImageResponse(actor, asset.fileKey, pageNo);
}
