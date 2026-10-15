import { NextResponse } from "next/server";
import { getActor, BLOCKED_STATUSES } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { exportCourse } from "@/lib/services/cms/transfer";

/** Downloads a course's editable draft as JSON (content.export; audited). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getActor();
  if (!actor || !actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in first.", { status: 401 });
  const { id } = await params;
  try {
    const doc = await exportCourse(actor, id);
    const name = doc.course.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    return new NextResponse(JSON.stringify(doc, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="course-${name}.json"`, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof AuthorisationError) return new NextResponse(e.message, { status: 403 });
    if (e instanceof ServiceError) return new NextResponse(e.message, { status: 404 });
    throw e;
  }
}
