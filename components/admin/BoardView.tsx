import Link from "next/link";
import type { Board, Metric } from "@/lib/services/reports/dashboards";
import { KPIS } from "@/lib/services/reports/kpi";
import { inr } from "./kit";

function fmt(m: Metric) {
  if (m.value === null || m.value === undefined) return "—";
  if (typeof m.value === "string") return m.value;
  switch (m.format) {
    case "pct":
      return `${m.value}%`;
    case "inr":
      return inr(m.value);
    case "hours":
      return `${m.value} h`;
    case "rating":
      return String(m.value);
    default:
      return m.value.toLocaleString("en-IN");
  }
}

/** A dashboard: figures with their KPI definitions one click away, then breakdown tables. */
export function BoardView({ board }: { board: Board }) {
  return (
    <div className="flex flex-col gap-12">
      <dl className="grid grid-cols-2 gap-x-6 sm:grid-cols-3 lg:grid-cols-5">
        {board.metrics.map((m) => {
          const def = m.kpi ? KPIS[m.kpi] : null;
          return (
            <div key={m.label} className="border-t-2 border-foreground pb-6 pr-2 pt-3">
              <dt className="text-data text-[10.5px] tracking-[0.1em] text-subtle">{m.label.toUpperCase()}</dt>
              <dd className="font-serif-display mt-2 text-[clamp(1.7rem,2.6vw,2.4rem)] leading-none">{m.href ? <Link href={m.href} className="hover:underline hover:decoration-1 hover:underline-offset-8">{fmt(m)}</Link> : fmt(m)}</dd>
              {m.note && <dd className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{m.note}</dd>}
              {def && (
                <dd className="mt-1">
                  <details className="text-[11.5px] text-muted-foreground">
                    <summary className="cursor-pointer">Definition</summary>
                    <p className="mt-1">{def.purpose}</p>
                    <p className="mt-1">
                      <strong>Formula:</strong> {def.formula}
                    </p>
                    {def.numerator && (
                      <p>
                        <strong>Numerator:</strong> {def.numerator}
                      </p>
                    )}
                    {def.denominator && (
                      <p>
                        <strong>Denominator:</strong> {def.denominator}
                      </p>
                    )}
                    <p>
                      <strong>Exclusions:</strong> {def.exclusions}
                    </p>
                    <p>
                      <strong>Source:</strong> {def.source} · <strong>Owner:</strong> {def.owner}
                    </p>
                    <p>
                      <strong>Target:</strong> {def.target ?? "not set — no contractual or validated basis yet"}
                    </p>
                  </details>
                </dd>
              )}
            </div>
          );
        })}
      </dl>
      {board.breakdowns.length > 0 && (
        <div className="grid gap-10 lg:grid-cols-2">
          {board.breakdowns.map((b) => (
            <section key={b.label}>
              <p role="heading" aria-level={2} className="text-data border-b-2 border-foreground pb-2 text-[10.5px] tracking-[0.14em] text-subtle">
                {b.label.toUpperCase()}
              </p>
              {b.rows.length === 0 ? (
                <p className="py-4 text-[13px] text-muted-foreground">No data yet.</p>
              ) : (
                <ul>
                  {b.rows.map((r, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-[13.5px]">
                      <span className="min-w-0">{r.label}</span>
                      <span className="text-data shrink-0 text-[12px] text-muted-foreground">{r.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
