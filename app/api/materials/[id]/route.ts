import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { downloadHeaders, isAvailable, isLink, readStored } from "@/lib/storage";
import { resourceAccess } from "@/lib/services/learning/resource-access";

/**
 * Download a course material. A learner must be signed in, verified, active and have live
 * access to a released course whose snapshot lists this resource (or the resource belongs to
 * a free-preview lesson of it), and the course team must have allowed downloading it. Staff
 * who can view content can open anything. Every download is audited.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor?.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in to download course materials.", { status: 401 });

  const { id } = await params;
  const access = await resourceAccess(actor, id);
  if (!access.ok) return new NextResponse(access.message, { status: access.status });
  const { res, staff } = access;

  // View-only materials are never handed to learners as files (PDFs are read in the lesson).
  if (!staff && !res.downloadable) return new NextResponse("This material is view-only. Open it in the lesson to read it.", { status: 403 });
  if (!isAvailable(res.fileKey)) return new NextResponse("This material is listed but has not been uploaded yet.", { status: 404 });

  await audit({ actorId: actor.id, action: "download", entity: "Resource", entityId: res.id, after: { title: res.title } });

  if (isLink(res.fileKey)) return NextResponse.redirect(res.fileKey, 302);
  const body = await readStored(res.fileKey);
  const ext = res.fileKey.split(".").pop();
  const name = `${res.title.replace(/[^\w\- ]+/g, "").trim() || "material"}${ext ? `.${ext}` : ""}`;
  return new NextResponse(new Uint8Array(body), { headers: downloadHeaders(res.mimeType, body.length, name) });
}
