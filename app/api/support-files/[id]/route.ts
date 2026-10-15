import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { attachmentFor } from "@/lib/services/support/tickets";
import { downloadHeaders, readStored } from "@/lib/storage";

/** A support attachment: visible to the case's requester and the staff who can see the case. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor?.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  try {
    const a = await attachmentFor(actor, id);
    const body = await readStored(a.fileKey);
    await audit({ actorId: actor.id, action: "download", entity: "SupportAttachment", entityId: id });
    return new NextResponse(new Uint8Array(body), { headers: downloadHeaders(a.mimeType, body.length, a.fileName) });
  } catch (e) {
    if (e instanceof AuthorisationError) return new NextResponse("You do not have access to this file.", { status: 403 });
    if (e instanceof ServiceError) return new NextResponse("Not found.", { status: 404 });
    throw e;
  }
}
