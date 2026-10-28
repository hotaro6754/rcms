import { NextResponse } from "next/server";
import { getActor, can, BLOCKED_STATUSES } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { BOARDS, board, boardsFor, type BoardKey } from "@/lib/services/reports/dashboards";
import { toCsv } from "@/lib/services/people/subscribers";

/**
 * Dashboard figures as CSV. Aggregates only, never personal data; requires the export
 * permission as well as access to that dashboard, and every export is audited.
 */
export async function GET(req: Request, { params }: { params: Promise<{ board: string }> }) {
  const actor = await getActor();
  if (!actor || !actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) return new NextResponse("Sign in first.", { status: 401 });
  const { board: key } = await params;
  if (!(key in BOARDS) || !boardsFor(actor).includes(key as BoardKey) || !can(actor, "reports.export")) {
    await audit({ actorId: actor.id, action: "deny", entity: "Report", entityId: key, outcome: "denied" });
    return new NextResponse("You do not have access to this export.", { status: 403 });
  }
  const days = Number(new URL(req.url).searchParams.get("days") ?? 30) || 30;
  const data = await board(actor, key as BoardKey, days);
  const rows = [
    ...data.metrics.map((m) => ({ section: "metric", label: m.label, value: m.value ?? "", note: m.note ?? "" })),
    ...data.breakdowns.flatMap((b) => b.rows.map((r) => ({ section: b.label, label: r.label, value: r.value, note: "" }))),
  ];
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "export", entity: "Report", entityId: key, after: { days, rows: rows.length } });
  return new NextResponse(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="rcms-${key}-${days}d.csv"`, "Cache-Control": "private, no-store" },
  });
}
