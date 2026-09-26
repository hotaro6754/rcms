"use client";

import { useEffect, useState, type RefObject } from "react";
import { aurora, LEVELS } from "@/lib/environment";
import { cn } from "@/lib/utils";

const WHAT: Record<(typeof LEVELS)[number], string> = {
  Beginner: "Understand the US revenue cycle end to end, from registration to payment.",
  Professional: "Work claims, denials and A/R with the judgement of a senior analyst.",
  Leader: "Run a team: capacity, quality, SLAs and the monthly review.",
  Executive: "Own outcomes across clients: cash, margin and the operating model.",
};

/**
 * The four levels the Academy takes someone through, and the signature interaction.
 *
 * On a fine pointer, moving across the hero walks the levels left to right, and the sky
 * matures with them: the mist ribbon narrows and deepens from a wide pale band to a
 * precise eucalyptus line (lib/environment.ts `aurora.level`). Discovered, not announced.
 * Every level is also a real button, so keyboard and touch reach the same states, and the sentence under the
 * strip says in plain words what someone at that level can do.
 *
 * CSS owns the highlight. No GSAP or Motion touches these elements.
 */
export function LevelStrip({ area }: { area: RefObject<HTMLElement | null> }) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    aurora.level = level;
  }, [level]);

  useEffect(() => {
    const el = area.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      setLevel(Math.max(0, Math.min(LEVELS.length - 1, Math.floor(x * LEVELS.length))));
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => el.removeEventListener("pointermove", onMove);
  }, [area]);

  return (
    <div className="mt-8 border-t border-border pt-4">
      <p className="label-caps">Where this takes you</p>
      <div role="group" aria-label="Levels" className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
        {LEVELS.map((l, i) => (
          <span key={l} className="flex items-center">
            <button
              type="button"
              aria-pressed={level === i}
              onClick={() => setLevel(i)}
              onFocus={() => setLevel(i)}
              className={cn(
                "min-h-9 rounded-full px-3 text-[13.5px] font-medium transition-colors duration-[var(--dur-med)]",
                level === i
                  ? "bg-accent text-accent-foreground"
                  : i < level
                    ? "text-secondary-foreground hover:text-foreground"
                    : "text-subtle hover:text-foreground",
              )}
            >
              {l}
            </button>
            {i < LEVELS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-0.5 h-px w-4 transition-colors duration-[var(--dur-med)]",
                  i < level ? "bg-brand" : "bg-input",
                )}
              />
            )}
          </span>
        ))}
      </div>
      <p className="mt-2 min-h-[2.8em] max-w-[46ch] text-micro leading-relaxed text-muted-foreground">
        {WHAT[LEVELS[level]]}
      </p>
    </div>
  );
}
