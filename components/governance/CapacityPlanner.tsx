"use client";

import { useState } from "react";
import {
  CAPACITY_BASELINE,
  CURRENT_CAPACITY,
  PODS,
  runCapacityModel,
} from "@/lib/data/telemetry";
import { StatusChip } from "@/components/dashboard/StatusIndicator";
import { cn, count, money } from "@/lib/utils";

/**
 * The capacity model carried over from the original build, unchanged in its logic.
 * A decision surface, not a chart: every lever has a real trade-off and the verdict is
 * written in the language an operations manager would actually use in the review.
 */
export function CapacityPlanner() {
  const [input, setInput] = useState(CURRENT_CAPACITY);
  const r = runCapacityModel(input);

  const set = (k: keyof typeof input) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput((s) => ({ ...s, [k]: Number(e.target.value) }));

  const rows = [
    { label: "Staffed analysts", value: count(r.analysts) },
    { label: "Required analysts", value: count(r.requiredAnalysts) },
    { label: "Utilisation", value: `${r.utilisation.toFixed(0)}%` },
    { label: "QA coverage", value: `${r.qaBar}%` },
    { label: "Automation coverage", value: `${r.automation}%` },
    { label: "Daily touch capacity", value: count(r.capacity) },
    {
      label: "Backlog capacity",
      value: r.net > 0 ? `${count(r.net)} / day` : "below inflow",
    },
    {
      label: "Projected recovery",
      value: r.daysToClear ? `${r.daysToClear} days` : "never clears",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* The verdict leads. It is the sentence the operator has to be able to say out
          loud in the review, so it goes above the levers rather than under them, where
          a pinned stage would push it off screen. */}
      <div className="flex items-start gap-3.5 rounded-[var(--radius)] border border-border bg-card p-4">
        <StatusChip status={r.status} className="mt-0.5 shrink-0">
          {r.headline}
        </StatusChip>
        <p className="max-w-[82ch] text-[13.5px] leading-relaxed text-secondary-foreground">
          {r.reasoning}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <h3 className="text-[13.5px] font-semibold">Levers</h3>

        <div className="mt-5 flex flex-col gap-6">
          <Lever
            id="analysts"
            label="Analysts staffed"
            value={input.analysts}
            min={8}
            max={40}
            onChange={set("analysts")}
            hint={`Fully loaded ${money(CAPACITY_BASELINE.costPerAnalyst)} per analyst per month.`}
          />
          <Lever
            id="qaBar"
            label="Quality bar (QA audit)"
            value={input.qaBar}
            suffix="%"
            min={86}
            max={99}
            onChange={set("qaBar")}
            hint="Higher audit coverage lifts first-pass resolution and lowers touches per day."
          />
          <Lever
            id="automation"
            label="Automation coverage"
            value={input.automation}
            suffix="%"
            min={0}
            max={60}
            step={5}
            onChange={set("automation")}
            hint="Eligibility, status checks and posting handled before human touch."
          />
        </div>

      </div>

      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-4">
          {rows.map((row) => (
            <div key={row.label} className="bg-card p-3.5">
              <dt className="text-micro text-muted-foreground">{row.label}</dt>
              <dd className="text-data mt-1.5 text-lg font-medium leading-none">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-3">
          <Figure label="Monthly delivery cost" value={money(r.monthlyCost)} />
          <Figure
            label="Cost to collect"
            value={`${r.costToCollect.toFixed(2)}%`}
            tone={r.costToCollect > 3.4 ? "bad" : "ok"}
          />
          <Figure
            label="Projected A/R > 90"
            value={`${r.arOver90.toFixed(1)}%`}
            tone={r.arOver90 >= 18 ? "bad" : "ok"}
          />
        </div>

        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="label-caps px-4 py-3 font-medium">Pod</th>
                <th scope="col" className="label-caps px-4 py-3 font-medium">Lead</th>
                <th scope="col" className="label-caps px-4 py-3 text-right font-medium">FTE</th>
                <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Touches</th>
                <th scope="col" className="label-caps px-4 py-3 text-right font-medium">QA</th>
                <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Shrinkage</th>
              </tr>
            </thead>
            <tbody>
              {PODS.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="text-data px-4 py-3 text-[13px] font-semibold">{p.id}</td>
                  <td className="px-4 py-3 text-[13.5px]">
                    {p.lead}
                    <span className="block text-micro text-muted-foreground">{p.fn}</span>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="bg-card p-3.5">
      <p className="text-micro text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-data mt-1.5 text-xl font-medium leading-none",
          tone === "bad" && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Lever({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13.5px] font-medium">
          {label}
        </label>
        <output htmlFor={id} className="text-data text-[15px] font-semibold text-primary">
          {value}
          {suffix}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        aria-describedby={`${id}-hint`}
        className="mt-2 h-9 w-full cursor-pointer accent-[var(--brand)]"
      />
      <p id={`${id}-hint`} className="text-micro leading-snug text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}
