"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RISKS, type Risk } from "@/lib/data/governance";
import { cn } from "@/lib/utils";

const P = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];
const I = ["Negligible", "Minor", "Moderate", "Major", "Severe"];

/** Cells are tinted by probability × impact, so priority reads before any label does. */
function cellTone(p: number, i: number) {
  const score = p * i;
  if (score >= 16) return "bg-danger-bg";
  if (score >= 9) return "bg-warning-bg";
  return "bg-secondary/50";
}

export function RiskMatrix() {
  const [active, setActive] = useState<Risk | null>(RISKS[0]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card p-4">
        <div className="min-w-[34rem]">
          <div className="flex">
            <span className="label-caps flex w-24 items-end pb-2 text-[11px]">Probability</span>
            <div className="grid flex-1 grid-cols-5 gap-1">
              {I.map((label) => (
                <span key={label} className="label-caps pb-2 text-center text-[11px]">
                  {label}
                </span>
              ))}
            </div>
          </div>

          {[5, 4, 3, 2, 1].map((p) => (
            <div key={p} className="flex">
              <span className="label-caps flex w-24 items-center pr-2 text-[11px]">{P[p - 1]}</span>
              <div className="grid flex-1 grid-cols-5 gap-1">
                {[1, 2, 3, 4, 5].map((i) => {
                  const here = RISKS.filter((r) => r.probability === p && r.impact === i);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex min-h-14 items-center justify-center gap-1 rounded-[5px] p-1",
                        cellTone(p, i),
                      )}
                    >
                      {here.map((r) => (
                        <motion.button
                          key={r.id}
                          type="button"
                          onClick={() => setActive(r)}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ duration: 0.14 }}
                          aria-label={`${r.title}. ${P[p - 1]} probability, ${I[i - 1]} impact.`}
                          className={cn(
                            "text-data flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                            active?.id === r.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground",
                          )}
                        >
                          {r.id.replace("R-", "")}
                        </motion.button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-2 flex">
            <span className="w-24" />
            <span className="label-caps flex-1 pt-1 text-center text-[11px]">Impact</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {active && (
          <motion.aside
            key={active.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0.1, 1] }}
            className="rounded-[var(--radius)] border border-border bg-card p-4"
          >
            <span className="text-data text-micro text-muted-foreground">{active.id}</span>
            <h4 className="mt-1 text-[15px] font-semibold leading-snug">{active.title}</h4>
            <p className="mt-2 text-micro leading-relaxed text-muted-foreground">{active.detail}</p>

            <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-micro">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Probability</dt>
                <dd className="font-medium">{P[active.probability - 1]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Impact</dt>
                <dd className="font-medium">{I[active.impact - 1]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Owner</dt>
                <dd className="font-medium">{active.owner}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-border pt-3">
              <p className="text-micro font-semibold">Mitigation</p>
              <p className="mt-1 text-micro leading-relaxed text-muted-foreground">
                {active.mitigation}
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
