"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import s from "./atlas.module.css";

type Verdict = "on-path" | "symptom" | "dead-end";
export type InquiryContent = {
  prompt: string;
  idle: string;
  choices: { label: string; verdict: Verdict; finding: string }[];
  verdictLabels: Record<Verdict, string>;
  tags: Record<Verdict, string>;
  followButton: string;
  steps: { question: string; answer: string; evidence: string }[];
  conclusion: string;
};

/** "Where do you look first?" A line on the root-cause path unlocks the five whys. */
export function Inquiry({ c }: { c: InquiryContent }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [tried, setTried] = useState<Set<number>>(new Set());
  const [whys, setWhys] = useState(false);
  const choice = picked == null ? null : c.choices[picked];

  return (
    <div>
      <p className={s.q}>{c.prompt}</p>
      <div className={s.choices}>
        {c.choices.map((ch, n) => (
          <button
            key={ch.label}
            type="button"
            className={s.choice}
            data-on={picked === n || undefined}
            aria-pressed={picked === n}
            onClick={() => {
              setPicked(n);
              setTried((t) => new Set(t).add(n));
            }}
          >
            <em>{String.fromCharCode(65 + n)}</em>
            <span>{ch.label}</span>
            {tried.has(n) ? (
              <span className={s.vtag} data-v={ch.verdict}>
                {c.tags[ch.verdict]}
              </span>
            ) : (
              <span />
            )}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        <AnimatePresence mode="wait">
          {choice ? (
            <motion.div key={picked} className={s.finding} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <span className={s.vtag} data-v={choice.verdict}>
                {c.verdictLabels[choice.verdict]}
              </span>
              <p>{choice.finding}</p>
              {choice.verdict === "on-path" && !whys && (
                <button type="button" className={s.btn} style={{ marginTop: 12, minHeight: 44 }} onClick={() => setWhys(true)}>
                  {c.followButton}
                </button>
              )}
            </motion.div>
          ) : (
            <p key="idle" className={s.lead} style={{ marginTop: 14, fontSize: 15 }}>
              {c.idle}
            </p>
          )}
        </AnimatePresence>
        {whys && (
          <>
            <ol className={s.whys}>
              {c.steps.map((st, n) => (
                <motion.li key={st.question} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.1 }}>
                  <b>{st.question}</b>
                  {st.answer}
                  <small>Evidence · {st.evidence}</small>
                </motion.li>
              ))}
            </ol>
            <motion.p className={s.conclusion} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
              {c.conclusion}
            </motion.p>
          </>
        )}
      </div>
    </div>
  );
}
