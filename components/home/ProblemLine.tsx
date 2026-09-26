"use client";

import { AnimatePresence, motion } from "motion/react";
import { PROBLEM_LINES } from "@/lib/data/problem";

const EASE = [0.2, 0, 0.1, 1] as const;

/**
 * The line that changes while the opening statement is pinned: lead-in, italic noun and
 * the fact beneath it. Motion owns the swap: the outgoing line lifts out of its mask as
 * the incoming one rises into it. Kept in its own file so no GSAP code shares it.
 */
export function ProblemLine({ index }: { index: number }) {
  const line = PROBLEM_LINES[index];
  return (
    <div>
      <div className="relative overflow-hidden pb-[0.12em]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={index}
            initial={{ y: "105%" }}
            animate={{ y: "0%" }}
            exit={{ y: "-105%" }}
            transition={{ duration: 0.7, ease: EASE }}
            className="font-serif-display"
          >
            {/* Lead-in on its own line, so every step is the same height, even the longest noun. */}
            <span className="block text-[clamp(1.6rem,2.6vw,2.5rem)] leading-tight text-foreground/45">{line.lead}</span>
            <em className="block whitespace-nowrap text-[clamp(3rem,6.8vw,7.2rem)] italic leading-[1] tracking-[-0.03em]">{line.noun}</em>
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="relative mt-8 min-h-[5.5rem] max-w-[52ch]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="text-[16px] leading-relaxed text-muted-foreground"
          >
            {line.fact}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
