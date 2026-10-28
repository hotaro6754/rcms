import { NextResponse } from "next/server";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { isLink } from "@/lib/storage";
import { resourceAccess } from "@/lib/services/learning/resource-access";
import { pageImageResponse } from "@/lib/documents/pages";

/** One page of a PDF lesson material, as an image (for view-only materials). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; page: string }> }) {
  const { id, page } = await params;
  const pageNo = Number(page);
  if (!Number.isInteger(pageNo) || pageNo < 1 || pageNo > 1000) return new NextResponse("Not found.", { status: 404 });
  const actor = await getActor();
  if (!actor?.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in to read this.", { status: 401 });
  const access = await resourceAccess(actor, id);
  if (!access.ok) return new NextResponse(access.message, { status: access.status });
  if (access.res.mimeType !== "application/pdf" || isLink(access.res.fileKey)) return new NextResponse("Only PDFs can be read here.", { status: 404 });
  return pageImageResponse(actor, access.res.fileKey, pageNo);
}
