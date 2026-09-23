import Link from "next/link";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { StatusChip } from "@/components/dashboard/StatusIndicator";
import { CLIENT, METRICS, allMetrics, health } from "@/lib/data/telemetry";
import { ACTIONS, ESCALATIONS } from "@/lib/data/governance";
import { money } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default function OverviewPage() {
  const metrics = allMetrics();
  const breaching = metrics.filter((m) => health(m) === "breach");
  const openActions = ACTIONS.filter((a) => a.status !== "complete");
  const openEsc = ESCALATIONS.filter((e) => e.status !== "resolved");
  const atRisk = openEsc.reduce((sum, e) => sum + e.financialImpact, 0);

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">{CLIENT.reviewPeriod}</p>
          <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Overview</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-micro text-muted-foreground">
          <span className="text-data">{money(atRisk)} at risk</span>
          <span aria-hidden>·</span>
          <span className="text-data">{openEsc.length} open escalations</span>
          <span aria-hidden>·</span>
          <span className="text-data">{openActions.length} open actions</span>
        </div>
      </header>

      {breaching.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-danger/30 bg-danger-bg px-4 py-3">
          <StatusChip status="breach" />
          <p className="text-[13.5px] text-danger">
            {breaching.map((m) => m.label).join(", ")} outside target.{" "}
            {breaching[0].narrative.driver}.
          </p>
          <Link
            href="/governance"
            className="text-data ml-auto text-micro font-semibold text-danger underline underline-offset-2"
          >
            Take it into the review
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.id} metric={m} className="h-full" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="rounded-[var(--radius)] border border-border bg-card p-4">
          <h2 className="mb-4 text-[13.5px] font-semibold">Recent activity</h2>
          <ActivityFeed limit={5} />
        </section>

        <section className="rounded-[var(--radius)] border border-border bg-card p-4">
          <h2 className="mb-3 text-[13.5px] font-semibold">Next decisions</h2>
          <ul className="flex flex-col gap-3.5">
            {openActions.slice(0, 4).map((a) => (
              <li key={a.id} className="border-b border-border pb-3.5 last:border-0 last:pb-0">
                <p className="text-[13.5px] leading-snug">{a.action}</p>
                <p className="text-data mt-1.5 text-micro text-muted-foreground">
                  {a.owner} · due {a.due}
                </p>
                <p className="mt-1 text-micro text-subtle">
                  {METRICS[a.linkedMetric].label}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
