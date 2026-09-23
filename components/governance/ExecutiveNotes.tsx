"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { METRICS } from "@/lib/data/telemetry";
import { RCA } from "@/lib/data/governance";
import { money } from "@/lib/utils";

/**
 * The graded artefact. Seven prompts, in the order an executive reads them. Pre-filled with
 * the facts the review already established, so the learner is editing a real summary rather
 * than facing a blank box.
 */
const DENIAL = METRICS["denial-rate"];

const FIELDS = [
  {
    id: "changed",
    label: "What changed",
    placeholder: "The movement worth an executive's attention",
    seed: `Denial rate rose to ${DENIAL.current}% against a ${DENIAL.target}% target, while days in A/R, A/R over 90 and first-pass resolution all improved ahead of plan.`,
  },
  {
    id: "why",
    label: "Why it changed",
    placeholder: "The cause, not the symptom",
    seed: DENIAL.narrative.driver + ".",
  },
  {
    id: "impact",
    label: "Financial impact",
    placeholder: "What it is worth",
    seed: `${DENIAL.narrative.affectedClaims?.toLocaleString("en-US")} claims, ${money(DENIAL.narrative.financialImpact ?? 0)} at risk. Historical overturn on this category is ${RCA.subject.overturnRate}%.`,
  },
  {
    id: "root",
    label: "Root cause",
    placeholder: "Where the control was missing",
    seed: RCA.conclusion,
  },
  {
    id: "action",
    label: "Recommended action",
    placeholder: "The decision you need",
    seed: DENIAL.narrative.nextAction + ", and assign a named owner for payer bulletin intake.",
  },
  { id: "owner", label: "Owner", placeholder: "Who is accountable", seed: DENIAL.narrative.owner },
  { id: "deadline", label: "Deadline", placeholder: "By when", seed: "19 Sep 2026" },
];

export function ExecutiveNotes() {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.id, f.seed])),
  );
  const [saved, setSaved] = useState(false);

  const words = Object.values(values).join(" ").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
      <div className="rounded-[var(--radius)] border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <h3 className="text-[13.5px] font-semibold">Executive summary</h3>
          <span className="text-data text-micro text-muted-foreground">{words} words</span>
        </div>

        <div className="flex flex-col divide-y divide-border">
          {FIELDS.map((f) => (
            <div key={f.id} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <label htmlFor={f.id} className="pt-1.5 text-[13px] font-medium text-muted-foreground">
                {f.label}
              </label>
              <textarea
                id={f.id}
                rows={f.id === "owner" || f.id === "deadline" ? 1 : 2}
                value={values[f.id]}
                placeholder={f.placeholder}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [f.id]: e.target.value }));
                  setSaved(false);
                }}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-[13.5px] leading-relaxed outline-none transition-colors focus:border-primary"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1.5 text-micro text-success"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              Saved to the review
            </motion.span>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            onClick={() => setSaved(true)}
            className="min-h-10 rounded-md bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Save summary
          </motion.button>
        </div>
      </div>

      <aside className="rounded-[var(--radius)] border border-border bg-card p-4">
        <h4 className="text-[13px] font-semibold">What good looks like</h4>
        <ul className="mt-3 flex flex-col gap-2.5 text-micro leading-relaxed text-muted-foreground">
          <li>Lead with the metric that moved, not the work that was done.</li>
          <li>Name the cause once. Executives do not need the investigation retold.</li>
          <li>Attach a number to the impact or it will not be prioritised.</li>
          <li>Every recommendation needs a named owner and a date, or it is a wish.</li>
          <li>If you are asking for a decision, say which decision.</li>
        </ul>
      </aside>
    </div>
  );
}
