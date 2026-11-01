"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LAB, type Verdict } from "@/lib/data/lab";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import { Chapter } from "./Chapter";
import Image from "next/image";
import { RemittanceSlip } from "@/components/illustration/RemittanceSlip";
import rcaDiagram from "@/public/images/figma/denial-root-cause-analysis.webp";
import { cn } from "@/lib/utils";

const TONE: Record<Verdict, string> = {
  "on-path": "text-brand",
  symptom: "text-warning",
  "dead-end": "text-subtle",
};

const LETTERS = "ABCDEF";
const usd = (n: number) => "$" + n.toLocaleString("en-US");

/**
 * THE CLAIM, INVESTIGATED. The situation and its four facts (code, claims, value at stake,
 * reason on file) as a row of figures; then the payer's remittance beside the question an
 * operator asks first, with the lines of inquiry as a lettered list. Choosing one shows its
 * finding; the right thread unfolds the five whys and the conclusion.
 *
 * The lesson is the interaction: the question an operator asks first, not the definition of
 * a denial code. The whole investigation is also summarised as a diagram (designed in Figma)
 * behind a disclosure under it, for readers who want the answer at a glance. Motion owns the
 * reveals.
 */
const VERDICT_KEY = { "on-path": "onPath", symptom: "symptom", "dead-end": "deadEnd" } as const;

export function OperationsLab({ content: c }: { content: PageContent<typeof homePage>["lab"] }) {
  // Lines of inquiry are identified by position: the letter beside each one.
  const [picked, setPicked] = useState<number | null>(null);
  const [tried, setTried] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const choice = picked === null ? undefined : c.choices[picked];

  const pick = (i: number) => {
    setPicked(i);
    setTried((t) => (t.includes(i) ? t : [...t, i]));
    setOpen(false);
  };

  return (
    <Chapter id="lab" folio="04" title={c.runningHead}>
      {/* The situation, typeset on the desk. */}
      <p data-reveal className="text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">{c.eyebrow}</p>
      <h2 data-reveal className="mt-4 max-w-[28ch] text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.1]">
        {c.statement}
      </h2>
      <dl data-reveal-group className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [c.codeLabel, LAB.code, "text-danger"],
          [c.claimsLabel, LAB.claims.toLocaleString("en-US"), ""],
          [c.valueLabel, usd(LAB.value), ""],
          [c.reasonLabel, LAB.reason, "text-[15px] font-medium leading-snug text-muted-foreground"],
        ].map(([label, value, tone]) => (
          <div key={label} data-reveal-item className="site-card px-5 py-4">
            <dt className="text-[12px] font-semibold uppercase tracking-[0.06em] text-subtle">{label}</dt>
            <dd className={cn("tabular mt-1.5 text-[1.5rem] font-bold tracking-[-0.01em]", tone)}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        {/* The evidence, on paper. */}
        <RemittanceSlip className="lg:mt-2" />

        {/* The inquiry. */}
        <div>
          <p className="text-[1.5rem] font-bold leading-tight tracking-[-0.015em]">{c.prompt}</p>
          <ol className="mt-5 grid gap-2" aria-label="Lines of inquiry">
            {c.choices.map((ch, i) => {
              const on = i === picked;
              const seen = tried.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(i)}
                    className={cn(
                      "group flex min-h-12 w-full items-center gap-4 rounded-lg border px-4 text-left text-[15px] font-medium transition-colors duration-[var(--dur-fast)]",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-foreground/30",
                    )}
                  >
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[12px] font-bold", on ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-subtle")}>{LETTERS[i]}</span>
                    <span className="flex-1">{ch.label}</span>
                    {seen && !on && (
                      <span className={cn("text-[11.5px] font-bold uppercase tracking-[0.06em]", TONE[ch.verdict])}>
                        {c.tags[VERDICT_KEY[ch.verdict]]}
                      </span>
                    )}
                    <span aria-hidden="true" className={cn("text-[13px] transition-transform duration-[var(--dur-med)]", on ? "" : "opacity-40 group-hover:translate-x-1 group-hover:opacity-100")}>
                      →
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div aria-live="polite" className="mt-6 min-h-[8rem]">
            <AnimatePresence mode="wait" initial={false}>
              {choice ? (
                <motion.div
                  key={picked}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.2, 0, 0.1, 1] }}
                  className="site-card border-l-4 p-5"
                  style={{ borderLeftColor: choice.verdict === "on-path" ? "var(--brand)" : choice.verdict === "symptom" ? "var(--warning)" : "var(--subtle)" }}
                >
                  <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-subtle">
                    {c.findingLabel} · {LETTERS[picked ?? 0]} · {c.verdictLabels[VERDICT_KEY[choice.verdict]].toUpperCase()}
                  </p>
                  <p className="mt-2.5 text-[15px] leading-relaxed">{choice.finding}</p>
                  {choice.verdict === "on-path" ? (
                    !open && (
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="mt-4 inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                      >
                        {c.followButton}
                      </button>
                    )
                  ) : (
                    <p className="mt-2 text-[13px] text-subtle">{c.tryAnother}</p>
                  )}
                </motion.div>
              ) : (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[14.5px] leading-relaxed text-muted-foreground"
                >
                  {c.idle}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="whys"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.45, ease: [0.2, 0, 0.1, 1] }}
                className="overflow-hidden"
              >
                <ol className="mt-8 divide-y divide-border rounded-xl border border-border bg-card">
                  {c.steps.map((s, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.09, duration: 0.3 }}
                      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 px-4 py-4"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">{i + 1}</span>
                      <div>
                        <p className="text-[14.5px] font-semibold">{s.question}</p>
                        <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.answer}</p>
                        <p className="mt-1.5 text-[12.5px] text-subtle">Evidence: {s.evidence}</p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.12 + c.steps.length * 0.09 + 0.1 }}
                  className="mt-6 border-l-2 border-brand pl-4 text-[1.2rem] font-semibold leading-snug"
                >
                  {c.conclusion}
                </motion.p>
                <SiteLink
                  link={c.cta}
                  className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-[14.5px] font-semibold text-brand underline-offset-4 hover:underline"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <details className="group mt-12 rounded-xl border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
          The whole investigation at a glance
          <span aria-hidden className="text-subtle transition-transform duration-200 group-open:rotate-45">+</span>
        </summary>
        <figure className="border-t border-border p-4 sm:p-6">
          <div className="overflow-x-auto">
            <Image
              src={rcaDiagram}
              alt="Denial investigation diagram: the denial (CO-50, 312 claims) leads to an investigation by five whys, which finds the root cause (a governance gap: no one owns reading payer bulletins into the workflow) and the control (an owner for payer policy intake, with a weekly register review)."
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="h-auto w-full min-w-[44rem]"
            />
          </div>
          <figcaption className="mt-3 text-[13px] text-subtle">Denial, investigation, root cause and control. Illustrative teaching data.</figcaption>
        </figure>
      </details>
    </Chapter>
  );
}
