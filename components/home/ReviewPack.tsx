"use client";

import { useState } from "react";
import { ACTIONS, REVIEW_METRICS } from "@/lib/data/governance";
import {
  CLIENT,
  METRICS,
  PERIODS,
  formatValue,
  health,
  type Health,
  type Metric,
  type MetricId,
} from "@/lib/data/telemetry";
import { cn, money } from "@/lib/utils";

const COUNT = ["No", "One", "Two", "Three", "Four", "Five"];

const STATUS: Record<Health, { label: string; className: string }> = {
  "on-target": { label: "On target", className: "text-subtle" },
  "at-risk": { label: "At risk", className: "text-warning" },
  breach: { label: "Breach", className: "text-danger" },
};

/**
 * The homepage's monthly review, set as the first page of a board pack rather than as a
 * dashboard: one sheet of paper, the KPI ledger on the left, and on the right the reason
 * behind whichever line the reader points at, then the decisions the month forces.
 *
 * The Operations Lab has already walked the five whys, so this page does not repeat them.
 * It shows the step after: the same finding presented upward, as numbers and owners.
 *
 * No GSAP, no Motion: selection is React state and CSS owns the transitions. The full
 * seven-stage review lives at /governance.
 */
export function ReviewPack() {
  const [focus, setFocus] = useState<MetricId>("denial-rate");
  const m = METRICS[focus];
  const wrongWay = REVIEW_METRICS.map((id) => METRICS[id]).filter((x) => health(x) !== "on-target");
  const decisions = ACTIONS.filter((a) => a.status !== "complete").slice(0, 3);

  return (
    <figure>
      <div className="env-paper relative overflow-hidden rounded-[6px] border border-border bg-[#fcfaf5] text-foreground shadow-[0_1px_2px_rgb(22_21_19/0.05),0_28px_56px_-28px_rgb(22_21_19/0.35)]">
        <div aria-hidden="true" className="grain absolute inset-0 !opacity-[0.08]" />

        <header className="relative flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground/15 px-5 py-3.5 sm:px-8">
          <p className="text-data text-[10.5px] tracking-[0.14em] text-subtle">
            MONTHLY OPERATING REVIEW · {CLIENT.reviewPeriod.toUpperCase()}
          </p>
          <p className="text-data text-[10.5px] tracking-[0.14em] text-subtle">
            {CLIENT.specialty.toUpperCase()} · {CLIENT.providers} PROVIDERS · PAGE 1 OF 7
          </p>
        </header>

        <div className="relative px-5 pb-8 pt-7 sm:px-8 sm:pb-10">
          <h3 className="font-serif-display text-[clamp(1.6rem,2.4vw,2.25rem)] leading-tight">{CLIENT.name}</h3>
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-muted-foreground">
            Inventory is winning: worklist depth, days in A/R and first-pass resolution all beat
            plan. {COUNT[wrongWay.length] ?? wrongWay.length}{" "}
            {wrongWay.length === 1 ? "measure" : "measures"} moved the wrong way, and it is the same
            cause each time.
          </p>

          <div className="mt-9 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            {/* The ledger. Each line is a button: point at it, or tab to it, to read why. */}
            <div>
              <div
                aria-hidden="true"
                className="text-data grid grid-cols-[minmax(0,1fr)_auto_4.5rem] gap-x-4 border-b-2 border-foreground pb-2 text-[10.5px] tracking-[0.12em] text-subtle sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_6.5rem_4.5rem]"
              >
                <span>MEASURE</span>
                <span className="hidden text-right sm:block">TARGET</span>
                <span className="text-right">ACTUAL</span>
                <span className="hidden sm:block">
                  {PERIODS[0].toUpperCase()} → {PERIODS.at(-1)!.toUpperCase()}
                </span>
                <span className="text-right">STATUS</span>
              </div>
              <ol>
                {REVIEW_METRICS.map((id) => {
                  const row = METRICS[id];
                  const s = STATUS[health(row)];
                  const active = id === focus;
                  return (
                    <li key={id} className="border-b border-foreground/12">
                      <button
                        type="button"
                        aria-pressed={active}
                        onMouseEnter={() => setFocus(id)}
                        onFocus={() => setFocus(id)}
                        onClick={() => setFocus(id)}
                        className={cn(
                          "grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto_4.5rem] items-center gap-x-4 px-2 -mx-2 text-left transition-colors duration-200 sm:grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_6.5rem_4.5rem]",
                          active ? "bg-foreground/[0.05]" : "hover:bg-foreground/[0.03]",
                        )}
                        style={{ width: "calc(100% + 1rem)" }}
                      >
                        <span className={cn("truncate text-[14.5px]", active && "font-medium")}>{row.label}</span>
                        <span className="text-data hidden text-right text-[13px] text-subtle sm:block">
                          {formatValue(row, row.target)}
                        </span>
                        <span className="text-data text-right text-[14.5px]">{formatValue(row)}</span>
                        <Trend metric={row} strong={active} className="hidden sm:block" />
                        <span className={cn("text-right text-[12.5px]", s.className)}>{s.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="flex flex-col gap-9">
              <section aria-live="polite">
                <p className="text-data text-[10.5px] tracking-[0.14em] text-subtle">
                  WHY IT MOVED · {m.label.toUpperCase()}
                </p>
                <p className="font-serif-display mt-3 text-[1.35rem] leading-snug">{m.narrative.driver}.</p>
                <dl className="mt-5 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[13.5px]">
                  <dt className="text-subtle">Owner</dt>
                  <dd>{m.narrative.owner}</dd>
                  {m.narrative.affectedClaims != null && (
                    <>
                      <dt className="text-subtle">Claims</dt>
                      <dd className="text-data">{new Intl.NumberFormat("en-US").format(m.narrative.affectedClaims)}</dd>
                    </>
                  )}
                  {m.narrative.financialImpact != null && (
                    <>
                      <dt className="text-subtle">Value</dt>
                      <dd className="text-data">{money(m.narrative.financialImpact)}</dd>
                    </>
                  )}
                  <dt className="text-subtle">Next</dt>
                  <dd className="leading-relaxed">{m.narrative.nextAction}</dd>
                </dl>
              </section>

              <section className="border-t border-foreground/15 pt-6">
                <p className="text-data text-[10.5px] tracking-[0.14em] text-subtle">DECISIONS NEEDED TODAY</p>
                <ol className="mt-4 flex flex-col gap-4">
                  {decisions.map((a) => (
                    <li key={a.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3">
                      <span className="text-data pt-0.5 text-[11px] text-subtle">{a.id}</span>
                      <span>
                        <span className="block text-[14px] leading-snug">{a.action}</span>
                        <span className="text-data mt-1 block text-[11.5px] text-subtle">
                          {a.owner} · due {a.due}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-[12.5px] text-subtle">
        Illustrative teaching data. Point at a line to read why it moved.
      </figcaption>
    </figure>
  );
}

/** Six periods, oldest first, against a dashed target. Ink when its line is selected. */
function Trend({ metric, strong, className }: { metric: Metric; strong: boolean; className?: string }) {
  const W = 96;
  const H = 24;
  const values = [...metric.series, metric.target];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => 2 + (i / (metric.series.length - 1)) * (W - 4);
  const y = (v: number) => 2 + (1 - (v - lo) / (hi - lo || 1)) * (H - 4);
  const d = metric.series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = metric.series.length - 1;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden="true"
      className={cn("overflow-visible transition-colors duration-200", strong ? "text-foreground" : "text-foreground/60", className)}
    >
      <line x1={2} x2={W - 2} y1={y(metric.target)} y2={y(metric.target)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="2 3" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(metric.series[last])} r={2.2} fill="currentColor" />
    </svg>
  );
}
