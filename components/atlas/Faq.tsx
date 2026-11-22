"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import s from "./atlas.module.css";

/** Questions and answers. One opens at a time; each is a real button with aria-expanded. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  return (
    <div>
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.q} className={s.qa}>
            <button type="button" aria-expanded={on} aria-controls={`faq-${i}`} id={`faq-q-${i}`} onClick={() => setOpen(on ? null : i)}>
              {it.q}
              <Plus aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div
                  id={`faq-${i}`}
                  role="region"
                  aria-labelledby={`faq-q-${i}`}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <p>{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
