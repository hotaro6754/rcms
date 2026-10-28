import { NextResponse } from "next/server";
import type { AccountStatus } from "@prisma/client";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { exportSubscribers } from "@/lib/services/people/subscribers";

/** The permitted subscriber export (minimum fields; large exports need a second person's approval). */
export async function GET(req: Request) {
  const actor = await getActor();
  if (!actor || !actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in first.", { status: 401 });
  const sp = new URL(req.url).searchParams;
  try {
    const { csv } = await exportSubscribers(actor, { q: sp.get("q") ?? undefined, status: (sp.get("status") || undefined) as AccountStatus | undefined, courseId: sp.get("course") ?? undefined });
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rcms-subscribers.csv"`, "Cache-Control": "private, no-store" } });
  } catch (e) {
    if (e instanceof AuthorisationError) return new NextResponse(e.message, { status: 403 });
    if (e instanceof ServiceError) return new NextResponse(e.message, { status: 409 });
    throw e;
  }
}
