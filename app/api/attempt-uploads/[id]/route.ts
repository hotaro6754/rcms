import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getActor, can, BLOCKED_STATUSES } from "@/lib/actor";
import { downloadHeaders, readStored } from "@/lib/storage";

/** An assignment upload: visible to the learner who made it and to graders, nobody else. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor?.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  const up = await prisma.attemptUpload.findUnique({ where: { id }, include: { attempt: { select: { userId: true } } } });
  if (!up) return new NextResponse("Not found.", { status: 404 });
  if (up.attempt.userId !== actor.id && !can(actor, "assessment.grade")) {
    await audit({ actorId: actor.id, action: "deny", entity: "AttemptUpload", entityId: id, outcome: "denied" });
    return new NextResponse("You do not have access to this file.", { status: 403 });
  }
  const body = await readStored(up.fileKey);
  await audit({ actorId: actor.id, action: "download", entity: "AttemptUpload", entityId: id });
  return new NextResponse(new Uint8Array(body), { headers: downloadHeaders(up.mimeType, body.length, up.fileName) });
}
