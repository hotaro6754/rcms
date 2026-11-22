"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const COLOURS = ["#d6f34a", "#ff6a2b", "#ffe48c", "#bdc7ff", "#2a9d8f", "#ffffff"];

/** A one-off celebratory burst across the top of the viewport. Skipped for reduced motion. */
export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 2600);
    return () => clearTimeout(t);
  }, []);
  if (reduce || !on) return null;
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 90, overflow: "hidden" }}>
      {Array.from({ length: pieces }, (_, i) => {
        const x = ((i * 37) % 100) + (i % 3) * 0.7;
        const drift = ((i * 53) % 40) - 20;
        const size = 6 + ((i * 7) % 8);
        return (
          <motion.i
            key={i}
            style={{ position: "absolute", left: `${x}%`, top: -20, width: size, height: size * (i % 2 ? 1 : 1.8), borderRadius: i % 4 === 0 ? "50%" : 2, background: COLOURS[i % COLOURS.length] }}
            initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: ["0vh", "105vh"], x: [0, drift * 3], rotate: (i % 2 ? 1 : -1) * (360 + i * 12), opacity: [1, 1, 0.8] }}
            transition={{ duration: 1.6 + ((i * 13) % 10) / 10, delay: ((i * 7) % 20) / 50, ease: [0.2, 0.6, 0.4, 1] }}
          />
        );
      })}
    </div>
  );
}
