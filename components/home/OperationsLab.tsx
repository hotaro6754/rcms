"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LAB, type Verdict } from "@/lib/data/lab";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import { Chapter } from "./Chapter";
import { RemittanceSlip } from "@/components/illustration/RemittanceSlip";
import { cn } from "@/lib/utils";

const TONE: Record<Verdict, string> = {
  "on-path": "text-brand",
  symptom: "text-warning",
  "dead-end": "text-subtle",
};

const LETTERS = "ABCDEF";
const usd = (n: number) => "$" + n.toLocaleString("en-US");

/**
 * THE CLAIM, INVESTIGATED. The one chapter set on a charcoal desk: the payer's remittance
 * is laid on it as the brightest object on the page, the situation is typeset straight on
 * the desk, and the choices are lines of inquiry in a ruled, lettered list, the way an
 * operator would write them on a pad. Choosing one lays a paper finding slip on the desk;
 * the right thread unfolds the five whys.
 *
 * The lesson is the interaction: the question an operator asks first, not the definition of
 * a denial code. Motion owns the reveals.
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
    <Chapter id="lab" folio="04" title={c.runningHead} surface="charcoal" data-env="ink">
      {/* The situation, typeset on the desk. */}
      <p data-reveal className="text-data text-[11px] tracking-[0.12em] text-subtle">{c.eyebrow}</p>
      <h2 data-reveal className="mt-5 max-w-[22ch] text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.04]">
        {c.statement}
      </h2>
      <dl data-reveal className="text-data mt-8 flex flex-wrap gap-x-12 gap-y-4 border-t border-border pt-5 text-[13px]">
        <div>
          <dt className="text-[10.5px] tracking-[0.12em] text-subtle">{c.codeLabel}</dt>
          <dd className="mt-1 text-[1.35rem] text-danger">{LAB.code}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] tracking-[0.12em] text-subtle">{c.claimsLabel}</dt>
          <dd className="mt-1 text-[1.35rem]">{LAB.claims.toLocaleString("en-US")}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] tracking-[0.12em] text-subtle">{c.valueLabel}</dt>
          <dd className="mt-1 text-[1.35rem]">{usd(LAB.value)}</dd>
        </div>
        <div>
          <dt className="text-[10.5px] tracking-[0.12em] text-subtle">{c.reasonLabel}</dt>
          <dd className="mt-1 text-[1.35rem] text-muted-foreground">{LAB.reason}</dd>
        </div>
      </dl>

      <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        {/* The evidence, on paper. */}
        <RemittanceSlip className="lg:mt-2" />

        {/* The inquiry. */}
        <div>
          <p className="font-serif-display text-[1.7rem] italic leading-tight">{c.prompt}</p>
          <ol className="mt-6 border-t border-border" aria-label="Lines of inquiry">
            {c.choices.map((ch, i) => {
              const on = i === picked;
              const seen = tried.includes(i);
              return (
                <li key={i} className="border-b border-border">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(i)}
                    className={cn(
                      "group flex min-h-12 w-full items-center gap-4 px-2 text-left text-[15px] transition-colors duration-[var(--dur-fast)]",
                      on ? "bg-[var(--paper)] text-[#161513]" : "hover:bg-card",
                    )}
                  >
                    <span className={cn("text-data w-4 text-[11px]", on ? "text-[#6f6a62]" : "text-subtle")}>{LETTERS[i]}</span>
                    <span className="flex-1">{ch.label}</span>
                    {seen && !on && (
                      <span className={cn("text-data text-[10.5px] tracking-[0.1em]", TONE[ch.verdict])}>
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
                  initial={{ opacity: 0, y: 10, rotate: -0.4 }}
                  animate={{ opacity: 1, y: 0, rotate: -0.4 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.2, 0, 0.1, 1] }}
                  className="rounded-[4px] bg-[var(--paper)] p-5 text-[#161513] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.6)]"
                >
                  <p className="text-data text-[10.5px] tracking-[0.12em] text-[#6f6a62]">
                    {c.findingLabel} · {LETTERS[picked ?? 0]} · {c.verdictLabels[VERDICT_KEY[choice.verdict]].toUpperCase()}
                  </p>
                  <p className="mt-2.5 text-[15px] leading-relaxed">{choice.finding}</p>
                  {choice.verdict === "on-path" ? (
                    !open && (
                      <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="mt-4 inline-flex min-h-10 items-center rounded-[3px] bg-[#161513] px-4 text-[13.5px] font-medium text-[#f1ede5] transition-colors hover:bg-[#2c2a26]"
                      >
                        {c.followButton}
                      </button>
                    )
                  ) : (
                    <p className="mt-2 text-[12.5px] text-[#6f6a62]">{c.tryAnother}</p>
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
                <ol className="mt-8 border-t border-border">
                  {c.steps.map((s, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 + i * 0.09, duration: 0.3 }}
                      className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 border-b border-border py-4"
                    >
                      <span className="font-serif-display text-[1.3rem] italic leading-none text-subtle">{i + 1}</span>
                      <div>
                        <p className="text-[14px] font-medium">{s.question}</p>
                        <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{s.answer}</p>
                        <p className="text-data mt-1.5 text-[11px] text-subtle">{s.evidence}</p>
                      </div>
                    </motion.li>
                  ))}
                </ol>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.12 + c.steps.length * 0.09 + 0.1 }}
                  className="font-serif-display mt-6 text-[1.5rem] leading-snug"
                >
                  {c.conclusion}
                </motion.p>
                <SiteLink
                  link={c.cta}
                  className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-[13.5px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Chapter>
  );
}
