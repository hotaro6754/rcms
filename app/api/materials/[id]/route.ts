import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { downloadHeaders, isAvailable, isLink, readStored } from "@/lib/storage";
import { resourceAccess } from "@/lib/services/learning/resource-access";

/**
 * The stored file of a course material, for staff only. Learners never receive files: every
 * material is view-only and read in the lesson as page images (spec LMS-14). Staff who can view
 * content may fetch the learner-facing PDF, or with ?source=1 the original upload (.pptx/.docx).
 * Every fetch is audited.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor?.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in to download course materials.", { status: 401 });

  const { id } = await params;
  const access = await resourceAccess(actor, id);
  if (!access.ok) return new NextResponse(access.message, { status: access.status });
  const { res, staff } = access;

  // Learners are never handed files: materials are read in the lesson.
  if (!staff) return new NextResponse("This material is view-only. Open it in the lesson.", { status: 403 });
  const source = new URL(req.url).searchParams.get("source") === "1" && res.sourceKey && res.sourceMime;
  if (source) {
    if (!isAvailable(res.sourceKey!)) return new NextResponse("The original upload is missing from storage.", { status: 404 });
    await audit({ actorId: actor.id, action: "download", entity: "Resource", entityId: res.id, after: { title: res.title, original: true } });
    const body = await readStored(res.sourceKey!);
    const ext = res.sourceKey!.split(".").pop();
    const name = `${res.title.replace(/[^\w\- ]+/g, "").trim() || "material"}${ext ? `.${ext}` : ""}`;
    return new NextResponse(new Uint8Array(body), { headers: downloadHeaders(res.sourceMime!, body.length, name) });
  }
  if (!isAvailable(res.fileKey)) return new NextResponse("This material is listed but has not been uploaded yet.", { status: 404 });

  await audit({ actorId: actor.id, action: "download", entity: "Resource", entityId: res.id, after: { title: res.title } });

  if (isLink(res.fileKey)) return NextResponse.redirect(res.fileKey, 302);
  const body = await readStored(res.fileKey);
  const ext = res.fileKey.split(".").pop();
  const name = `${res.title.replace(/[^\w\- ]+/g, "").trim() || "material"}${ext ? `.${ext}` : ""}`;
  return new NextResponse(new Uint8Array(body), { headers: downloadHeaders(res.mimeType, body.length, name) });
}
