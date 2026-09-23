import { CURRENT_CAPACITY, PODS, runCapacityModel } from "@/lib/data/telemetry";
import { AT_RISK_PODS } from "@/lib/data/governance";
import { cn, count } from "@/lib/utils";

export const metadata = { title: "Roster" };

const CAPACITY_TONE: Record<string, string> = {
  headroom: "bg-success-bg text-success",
  healthy: "bg-success-bg text-success",
  tight: "bg-warning-bg text-warning",
  "at-risk": "bg-danger-bg text-danger",
};

export default function RosterPage() {
  const model = runCapacityModel(CURRENT_CAPACITY);
  const staffed = PODS.reduce((s, p) => s + p.analysts, 0);
  const avgShrinkage = PODS.reduce((s, p) => s + p.shrinkage, 0) / PODS.length;

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <header className="max-w-[68ch]">
        <p className="label-caps">People</p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Roster</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
          {staffed} analysts across {PODS.length} pods against {count(model.requiredAnalysts)}{" "}
          required at the current quality bar.{" "}
          {AT_RISK_PODS.length > 0 && (
            <>
              {AT_RISK_PODS.map((p) => p.id).join(" and ")} carry the capacity risk, and
              ELIG-01 still has no permanent lead.
            </>
          )}
        </p>
      </header>

      <dl className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Analysts staffed", value: String(staffed) },
          { label: "Analysts required", value: String(model.requiredAnalysts) },
          { label: "Utilisation", value: `${model.utilisation.toFixed(0)}%` },
          { label: "Average shrinkage", value: `${avgShrinkage.toFixed(0)}%` },
        ].map((f) => (
          <div key={f.label} className="bg-card p-4">
            <dt className="label-caps text-[11px]">{f.label}</dt>
            <dd className="text-data mt-2.5 text-[26px] font-medium leading-none">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
        <table className="w-full min-w-[52rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="label-caps px-4 py-3 font-medium">Pod</th>
              <th scope="col" className="label-caps px-4 py-3 font-medium">Function</th>
              <th scope="col" className="label-caps px-4 py-3 font-medium">Lead</th>
              <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Analysts</th>
              <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Touches/day</th>
              <th scope="col" className="label-caps px-4 py-3 text-right font-medium">QA</th>
              <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Shrinkage</th>
              <th scope="col" className="label-caps px-4 py-3 font-medium">Capacity</th>
            </tr>
          </thead>
          <tbody>
            {PODS.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/60">
                <td className="text-data px-4 py-3 text-[13px] font-semibold">{p.id}</td>
                <td className="px-4 py-3 text-[13.5px]">{p.fn}</td>
                <td
                  className={cn(
                    "px-4 py-3 text-[13.5px]",
                    p.lead === "Unassigned" ? "text-danger" : "text-muted-foreground",
                  )}
                >
                  {p.lead}
                </td>
                <td className="text-data px-4 py-3 text-right text-[13px]">{p.analysts}</td>
                <td className="text-data px-4 py-3 text-right text-[13px]">{p.touchesPerDay}</td>
                <td className="text-data px-4 py-3 text-right text-[13px]">{p.qa}%</td>
                <td
                  className={cn(
                    "text-data px-4 py-3 text-right text-[13px]",
                    p.shrinkage >= 20 ? "text-danger" : p.shrinkage >= 15 ? "text-warning" : "",
                  )}
                >
                  {p.shrinkage}%
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex rounded-[5px] px-2 py-0.5 text-micro font-semibold capitalize",
                      CAPACITY_TONE[p.capacity],
                    )}
                  >
                    {p.capacity.replace("-", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
