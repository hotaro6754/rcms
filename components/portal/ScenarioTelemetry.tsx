import { count, money, signed } from "@/lib/utils";
import type { ScenarioSeed } from "@/lib/data/scenarios";

/**
 * The telemetry an operations manager would actually be handed: six metrics, the denial
 * mix, pod productivity and open escalations. Nothing here interprets the data for the
 * learner — the reading is the assessment.
 *
 * `hiddenCause` is stripped on the server before this ever renders. See LearnerScenario.
 */
export type LearnerScenario = Omit<ScenarioSeed, "hiddenCause">;

function Sparkline({ series, good }: { series: number[]; good: boolean }) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series
    .map((v, i) => `${(i / (series.length - 1)) * 100},${28 - ((v - min) / span) * 24}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={good ? "var(--success)" : "var(--danger)"}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function format(value: number, unit: string, precision: number) {
  if (unit === "percent") return `${value.toFixed(precision)}%`;
  if (unit === "days") return `${value.toFixed(precision)} days`;
  return count(value);
}

export function ScenarioTelemetry({ scenario }: { scenario: LearnerScenario }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-[15px] font-semibold">Where the account stands</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {scenario.metrics.map((m) => {
            const delta = m.current - m.before;
            const good = m.direction === "lower-is-better" ? delta <= 0 : delta >= 0;
            return (
              <article
                key={m.id}
                className="rounded-[var(--radius)] border border-border bg-card px-4 py-4"
              >
                <p className="label-caps">{m.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-data text-[1.5rem] leading-none">
                    {format(m.current, m.unit, m.precision)}
                  </span>
                  <span
                    className={`text-data text-micro ${good ? "text-success" : "text-danger"}`}
                  >
                    {signed(delta, m.precision)}
                  </span>
                </div>
                <Sparkline series={m.series} good={good} />
                <p className="text-data text-micro text-muted-foreground">
                  target {format(m.target, m.unit, m.precision)} · {m.owner}
                </p>
                <p className="mt-2 text-micro leading-relaxed text-secondary-foreground">
                  {m.driver}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-[15px] font-semibold">Denial mix this period</h2>
        <div className="mt-4 overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[38rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Code", "Reason", "Owner", "Claims", "Value", "Overturn", "Status"].map((h) => (
                  <th key={h} className="label-caps px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenario.denials.map((d) => (
                <tr key={d.code} className="border-b border-border last:border-0">
                  <td className="text-data px-4 py-3 text-micro font-semibold">{d.code}</td>
                  <td className="px-4 py-3 text-micro">{d.reason}</td>
                  <td className="px-4 py-3 text-micro text-muted-foreground">{d.owner}</td>
                  <td className="text-data px-4 py-3 text-micro">{count(d.claims)}</td>
                  <td className="text-data px-4 py-3 text-micro">{money(d.value)}</td>
                  <td className="text-data px-4 py-3 text-micro">{d.overturnRate}%</td>
                  <td className="px-4 py-3 text-micro text-muted-foreground">{d.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-[15px] font-semibold">Pods</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {scenario.pods.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius)] border border-border bg-card px-4 py-3"
              >
                <span className="text-data text-micro font-semibold">{p.id}</span>
                <span className="text-micro">{p.fn}</span>
                <span className="text-micro text-muted-foreground">{p.lead}</span>
                <span className="text-data ml-auto text-micro text-muted-foreground">
                  {p.analysts} analysts · {p.touchesPerDay}/day · QA {p.qa}% · shrink {p.shrinkage}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold">Open escalations</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {scenario.escalations.map((e) => (
              <li
                key={e.id}
                className="rounded-[var(--radius)] border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-micro font-semibold ${
                      e.severity === "high"
                        ? "bg-danger-bg text-danger"
                        : e.severity === "medium"
                          ? "bg-warning-bg text-warning"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {e.severity}
                  </span>
                  <span className="text-[13.5px] font-medium">{e.title}</span>
                </div>
                <p className="mt-2 text-micro leading-relaxed text-muted-foreground">{e.detail}</p>
                <p className="text-data mt-2 text-micro text-muted-foreground">
                  {e.owner} · {e.slaHoursRemaining}h left
                  {e.financialImpact > 0 && ` · ${money(e.financialImpact)} exposed`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
