"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { LAB, VERDICT_LABEL, type Verdict } from "@/lib/data/lab";
import { LEVELS } from "@/lib/data/catalog";
import { SectionHead } from "./SectionHead";
import { RemittanceSlip } from "@/components/illustration/RemittanceSlip";
import { cn } from "@/lib/utils";

const TONE: Record<Verdict, string> = {
  "on-path": "bg-accent text-accent-foreground",
  symptom: "bg-warning-bg text-warning",
  "dead-end": "bg-muted text-muted-foreground",
};

const usd = (n: number) => "$" + n.toLocaleString("en-US");

/**
 * The Operations Lab, in miniature. One real-shaped problem, six places to look, and a
 * verdict on each: ruled out, a symptom, or the thread that leads to the cause. Pull the
 * right thread and the five whys unfold to a governance gap nobody owned.
 *
 * The lesson is the interaction: the Academy teaches the question an operator asks first,
 * not the definition of a denial code. Motion owns the reveals.
 */
export function OperationsLab() {
  const [picked, setPicked] = useState<string | null>(null);
  const [tried, setTried] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const choice = LAB.choices.find((c) => c.id === picked);
  const level = LEVELS[LAB.level - 1];

  const pick = (id: string) => {
    setPicked(id);
    setTried((t) => (t.includes(id) ? t : [...t, id]));
    setOpen(false);
  };

  return (
    <section id="lab" className="relative isolate border-t border-border bg-card/60">
      <div className="mx-auto max-w-[1320px] px-6 py-24 lg:py-32">
        <SectionHead
          index="04"
          kicker="Operations Lab"
          title={
            <>
              Think like <em>an operator.</em>
            </>
          }
          lead="Most training explains what a denial code means. Operators are paid to find out why the number moved. Try it on a real-shaped problem."
        />

        <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          {/* The situation */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-md)]">
              <p className="label-caps">The situation · end of August</p>
              <p className="font-serif-display mt-3 text-[1.6rem] leading-snug">{LAB.statement}</p>
              <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-border pt-4">
                <div>
                  <dt className="label-caps text-[11px]">Code</dt>
                  <dd className="text-data mt-1 text-lg font-medium text-brand">{LAB.code}</dd>
                </div>
                <div>
                  <dt className="label-caps text-[11px]">Claims</dt>
                  <dd className="text-data mt-1 text-lg font-medium">{LAB.claims.toLocaleString("en-US")}</dd>
                </div>
                <div>
                  <dt className="label-caps text-[11px]">At stake</dt>
                  <dd className="text-data mt-1 text-lg font-medium">{usd(LAB.value)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-micro text-muted-foreground">{LAB.reason}</p>
            </div>
            {/* The evidence the operator starts from: the payer's remittance. */}
            <RemittanceSlip className="mt-2" />
          </div>

          {/* The inquiry */}
          <div className="flex flex-col">
            <h3 className="font-serif-display text-[clamp(1.8rem,2.6vw,2.3rem)] leading-tight">{LAB.prompt}</h3>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Where to look first">
              {LAB.choices.map((c) => {
                const on = c.id === picked;
                const seen = tried.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(c.id)}
                    className={cn(
                      "flex min-h-14 items-center justify-between gap-3 rounded-xl border px-4 text-left text-[14px] font-medium transition-colors duration-[var(--dur-fast)]",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card hover:border-input hover:bg-background",
                    )}
                  >
                    {c.label}
                    {seen && !on && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          c.verdict === "on-path" ? "bg-brand" : c.verdict === "symptom" ? "bg-warning" : "bg-input",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div aria-live="polite" className="mt-6 min-h-[9rem]">
              <AnimatePresence mode="wait" initial={false}>
                {choice ? (
                  <motion.div
                    key={choice.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, ease: [0.2, 0, 0.1, 1] }}
                    className="rounded-2xl border border-border bg-card p-6"
                  >
                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-micro font-semibold", TONE[choice.verdict])}>
                      {VERDICT_LABEL[choice.verdict]}
                    </span>
                    <p className="mt-3 text-[15px] leading-relaxed text-secondary-foreground">{choice.finding}</p>
                    {choice.verdict === "on-path" ? (
                      !open && (
                        <button
                          type="button"
                          onClick={() => setOpen(true)}
                          className="mt-5 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                        >
                          Follow the five whys
                        </button>
                      )
                    ) : (
                      <p className="mt-3 text-micro text-subtle">Try another line of inquiry.</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.p
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-dashed border-input p-6 text-[14px] leading-relaxed text-muted-foreground"
                  >
                    Pick one. There is a right first question here, and two that feel right but only
                    treat the symptom.
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
                  <ol className="mt-6 flex flex-col">
                    {LAB.steps.map((s, i) => (
                      <motion.li
                        key={s.question}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + i * 0.09, duration: 0.3 }}
                        className="relative border-l border-input pb-5 pl-6 last:pb-0"
                      >
                        <span aria-hidden="true" className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-brand bg-card" />
                        <p className="text-[13.5px] font-medium text-foreground">{s.question}</p>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-secondary-foreground">{s.answer}</p>
                        <p className="text-data mt-1 text-micro text-subtle">{s.evidence}</p>
                      </motion.li>
                    ))}
                  </ol>
                  <motion.blockquote
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.12 + LAB.steps.length * 0.09 + 0.1 }}
                    className="font-serif-display mt-6 border-l-2 border-brand pl-5 text-[1.35rem] leading-snug"
                  >
                    {LAB.conclusion}
                  </motion.blockquote>
                  <Link
                    href="/learning-paths"
                    className="mt-5 inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-medium text-brand underline-offset-4 hover:underline"
                  >
                    This is how Level {String(level.n).padStart(2, "0")}, {level.verb}, teaches you to think <span aria-hidden="true">→</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
