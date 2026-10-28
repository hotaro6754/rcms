import { NextResponse } from "next/server";
import { getActor, can, BLOCKED_STATUSES } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { personalDataExport } from "@/lib/services/people/subscribers";

/** A personal-data export for an open access request. Privacy authority only; audited. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor || !actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  if (!can(actor, "subscriber.privacy")) {
    await audit({ actorId: actor.id, action: "deny", entity: "PrivacyRequest", entityId: id, outcome: "denied" });
    return new NextResponse("Not permitted.", { status: 403 });
  }
  const req = await prisma.privacyRequest.findUnique({ where: { id } });
  if (!req || req.kind !== "ACCESS" || !["OPEN", "IN_REVIEW"].includes(req.status)) return new NextResponse("No open access request.", { status: 404 });
  const data = await personalDataExport(req.userId);
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "export", entity: "PrivacyRequest", entityId: id, after: { userId: req.userId } });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="personal-data-${req.userId}.json"`, "Cache-Control": "private, no-store" },
  });
}
