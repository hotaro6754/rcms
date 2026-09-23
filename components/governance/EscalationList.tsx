"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { ESCALATIONS, type Severity } from "@/lib/data/governance";
import { METRICS } from "@/lib/data/telemetry";
import { cn, money } from "@/lib/utils";

const SEV: Record<Severity, string> = {
  critical: "bg-danger-bg text-danger",
  high: "bg-danger-bg text-danger",
  medium: "bg-warning-bg text-warning",
  low: "bg-secondary text-muted-foreground",
};

function age(hours: number) {
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

/** Motion-owned row expansion. No GSAP in this subtree. */
export function EscalationList() {
  const [open, setOpen] = useState<string | null>(ESCALATIONS[0]?.id ?? null);

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      {ESCALATIONS.map((e) => {
        const expanded = open === e.id;
        const breached = e.slaHoursRemaining <= 24 && e.status !== "resolved";
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => setOpen(expanded ? null : e.id)}
              aria-expanded={expanded}
              aria-controls={`esc-${e.id}`}
              className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60"
            >
              <span
                className={cn(
                  "rounded-[5px] px-2 py-0.5 text-micro font-semibold uppercase",
                  SEV[e.severity],
                )}
              >
                {e.severity}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{e.title}</span>
                <span className="text-data mt-0.5 block text-micro text-muted-foreground">
                  {e.id} · {e.owner} · open {age(e.raisedHoursAgo)}
                </span>
              </span>

              <span className="hidden text-right sm:block">
                <span
                  className={cn(
                    "text-data block text-[13px]",
                    breached ? "text-danger" : "text-muted-foreground",
                  )}
                >
                  {e.status === "resolved" ? "closed" : `${e.slaHoursRemaining}h left`}
                </span>
                <span className="text-data block text-micro text-muted-foreground">
                  {e.financialImpact ? money(e.financialImpact) : "no $ impact"}
                </span>
              </span>

              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  expanded && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={`esc-${e.id}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.24, ease: [0.2, 0, 0.1, 1] }}
                  className="overflow-hidden bg-secondary/40"
                >
                  <div className="px-4 pb-4 pt-1">
                    <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-secondary-foreground">
                      {e.detail}
                    </p>
                    <p className="text-data mt-3 text-micro text-muted-foreground">
                      Explains{" "}
                      <span className="text-foreground">{METRICS[e.metric].label}</span> ·{" "}
                      {METRICS[e.metric].narrative.nextAction}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
