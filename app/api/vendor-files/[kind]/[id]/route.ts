import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { downloadHeaders, readStored } from "@/lib/storage";
import { canReadVendorFile } from "@/lib/services/vendors/vendors";

/** Vendor documents and deliverable submissions: the vendor's own contacts and vendor staff only. */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const actor = await getActor();
  if (!actor?.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in first.", { status: 401 });
  const { kind, id } = await params;
  let file: { vendorId: string; fileKey: string; mimeType: string; name: string; visible: boolean } | null = null;
  if (kind === "document") {
    const d = await prisma.vendorDocument.findUnique({ where: { id } });
    if (d) file = { vendorId: d.vendorId, fileKey: d.fileKey, mimeType: d.mimeType, name: d.title, visible: d.visibleToVendor };
  } else if (kind === "submission") {
    const s = await prisma.deliverableSubmission.findUnique({ where: { id }, include: { deliverable: { select: { vendorId: true } } } });
    if (s?.fileKey) file = { vendorId: s.deliverable.vendorId, fileKey: s.fileKey, mimeType: s.mimeType ?? "application/octet-stream", name: s.fileName ?? "submission", visible: true };
  }
  if (!file) return new NextResponse("Not found.", { status: 404 });
  if (!(await canReadVendorFile(actor, file.vendorId, file.visible))) {
    await audit({ actorId: actor.id, action: "deny", entity: "VendorFile", entityId: id, outcome: "denied" });
    return new NextResponse("You do not have access to this file.", { status: 403 });
  }
  const body = await readStored(file.fileKey);
  await audit({ actorId: actor.id, action: "download", entity: "VendorFile", entityId: id });
  return new NextResponse(new Uint8Array(body), { headers: downloadHeaders(file.mimeType, body.length, file.name) });
}
