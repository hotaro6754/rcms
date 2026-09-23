import { QueueTable } from "@/components/dashboard/QueueTable";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DENIALS, METRICS } from "@/lib/data/telemetry";
import { money } from "@/lib/utils";

export const metadata = { title: "Queues" };

export default function QueuesPage() {
  const totalClaims = DENIALS.reduce((s, d) => s + d.claims, 0);
  const totalValue = DENIALS.reduce((s, d) => s + d.value, 0);
  const appealable = DENIALS.filter((d) => d.overturnRate >= 50);
  const recoverable = appealable.reduce((s, d) => s + d.value * (d.overturnRate / 100), 0);

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <header className="max-w-[68ch]">
        <p className="label-caps">Worklists</p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Denial inventory</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          {totalClaims.toLocaleString("en-US")} denied claims worth {money(totalValue)}. Roughly{" "}
          {money(recoverable)} of that sits in categories with a historical overturn rate above 50
          percent, which is where the work belongs.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard metric={METRICS["queue-depth"]} />
        <MetricCard metric={METRICS["denial-rate"]} />
        <MetricCard metric={METRICS["first-pass"]} />
      </div>

      <QueueTable />
    </div>
  );
}
