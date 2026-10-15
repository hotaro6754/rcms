import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runScheduledExpiries, runScheduledPublications } from "@/lib/services/cms/release";
import { runDueApprovals } from "@/lib/services/approvals";
import { runSubscriptionLifecycle } from "@/lib/services/commerce/checkout";
import { audit } from "@/lib/audit";
import { purgeTranscripts, runSupportSla } from "@/lib/services/support/tickets";

/**
 * Scheduled work: due course releases and expiries, approved changes reaching their effective date,
 * subscription period ends and grace periods, support SLA warnings, breaches and auto-closure, and support transcript retention. Call it every 15 minutes (Vercel Cron or any
 * scheduler) with `Authorization: Bearer $CRON_SECRET`. Each job is idempotent.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const published = await runScheduledPublications();
  const expired = await runScheduledExpiries();
  await runDueApprovals();
  const subs = await runSubscriptionLifecycle();
  const sla = await runSupportSla();
  const purged = await purgeTranscripts();
  await audit({ action: "update", entity: "Cron", after: { published: published.length, expired: expired.length, ...subs, slaWarned: sla.warned, slaBreached: sla.breached.length, supportClosed: sla.closed, purgedMessages: purged } });
  return NextResponse.json({ published, expired, subscriptions: subs, support: { warned: sla.warned, breached: sla.breached.length, closed: sla.closed } });
}
