import Link from "next/link";
import type { Board, Metric } from "@/lib/services/reports/dashboards";
import { KPIS } from "@/lib/services/reports/kpi";
import { inr } from "./kit";
import s from "./board-view.module.css";

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

/* One anchor slab per row of five, the rest plain: the eye lands on the night tile first. */
const TONES = ["x-night", "x-surface", "x-surface", "x-mint", "x-surface", "x-sand", "x-surface", "x-surface", "x-surface", "x-surface"];

/** Leading number in a breakdown value ("12 · 40%" → 12), for the proportional bar. */
const numberOf = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** A dashboard: figure slabs with their KPI definitions one click away, then breakdown slabs. */
export function BoardView({ board }: { board: Board }) {
  return (
    <div className={s.root}>
      <dl className={s.metrics}>
        {board.metrics.map((m, i) => {
          const def = m.kpi ? KPIS[m.kpi] : null;
          const empty = m.value === null || m.value === undefined;
          return (
            <div key={m.label} className={`x-slab ${TONES[i % TONES.length]} ${s.metric}`} style={{ animationDelay: `${i * 35}ms` }}>
              <dt className="x-lab">{m.label}</dt>
              <dd className={`x-fig ${s.value}`} data-empty={empty || undefined}>
                {m.href ? <Link href={m.href}>{fmt(m)}</Link> : fmt(m)}
              </dd>
              {m.note && <dd className={s.note}>{m.note}</dd>}
              {def && (
                <dd className={s.defWrap}>
                  <details className={s.def}>
                    <summary>How it is counted</summary>
                    <div className={s.defBody}>
                      <p>{def.purpose}</p>
                      <p>
                        <b>Formula</b> {def.formula}
                      </p>
                      {def.numerator && (
                        <p>
                          <b>Numerator</b> {def.numerator}
                        </p>
                      )}
                      {def.denominator && (
                        <p>
                          <b>Denominator</b> {def.denominator}
                        </p>
                      )}
                      <p>
                        <b>Exclusions</b> {def.exclusions}
                      </p>
                      <p>
                        <b>Source</b> {def.source} · <b>Owner</b> {def.owner}
                      </p>
                      <p>
                        <b>Target</b> {def.target ?? "not set: no contractual or validated basis yet"}
                      </p>
                    </div>
                  </details>
                </dd>
              )}
            </div>
          );
        })}
      </dl>

      {board.breakdowns.length > 0 && (
        <div className={s.breakdowns}>
          {board.breakdowns.map((b) => {
            const nums = b.rows.map((r) => numberOf(r.value));
            const max = Math.max(1, ...nums.map((n) => n ?? 0));
            return (
              <section key={b.label} className="x-slab x-surface">
                <h2 className="x-lab">{b.label}</h2>
                {b.rows.length === 0 ? (
                  <p className={s.none}>No data yet.</p>
                ) : (
                  <ul className={s.rows}>
                    {b.rows.map((r, i) => (
                      <li key={i}>
                        {nums[i] !== null && <span className={s.bar} style={{ width: `${Math.max(2, ((nums[i] ?? 0) / max) * 100)}%` }} aria-hidden />}
                        <span className={s.rowLabel}>{r.label}</span>
                        <span className={s.rowValue}>{r.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
