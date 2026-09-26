"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";
import { SYSTEM } from "@/lib/data/system";
import { LEVELS } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

const PHASES = ["Front end", "Middle", "Back end"] as const;
const COUNT = SYSTEM.length;
const LAST = COUNT - 1;
/** Scroll distance per stage while pinned, in px. */
const PER_STAGE = 280;

/**
 * Ten stages, set as a register rather than a row of cards.
 *
 * The rail across the top is the claim's route. Below it, one spread: where the stage sits,
 * its name and what it does; then three ruled lines (how it breaks, the number that tells
 * you, where the Academy teaches it). Stages replace each other in place with a short
 * crossfade.
 *
 * Desktop: the rail and spread pin and the reader's scroll carries the claim along the
 * route continuously; there is no snapping, so the page never pulls against the reader.
 * The stage changes as the claim passes each marker.
 * Phones, tablets, reduced motion: no pin; previous / next controls.
 *
 * GSAP owns the pin and the route's fill. CSS owns the markers and the spread transitions.
 */
export function SystemFlow() {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const fill = useRef<HTMLSpanElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [line, setLine] = useState({ left: 0, top: 0, width: 0 });

  // The line runs from the first marker's centre to the last marker's centre, measured.
  useLayoutEffect(() => {
    const measure = () => {
      const rail = railRef.current;
      const first = dots.current[0];
      const last = dots.current[LAST];
      if (!rail || !first || !last) return;
      const r = rail.getBoundingClientRect();
      const a = first.getBoundingClientRect();
      const b = last.getBoundingClientRect();
      setLine({ left: a.left + a.width / 2 - r.left, top: a.top + a.height / 2 - r.top, width: b.left - a.left });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (railRef.current) ro.observe(railRef.current);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        if (!root.current) return;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "center 55%",
            end: () => "+=" + LAST * PER_STAGE,
            pin: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
            // The stage changes when the claim reaches its marker, not before.
            onUpdate: (self) => setActive(Math.min(LAST, Math.floor(self.progress * LAST + 0.04))),
          },
        });
        tl.fromTo(fill.current, { scaleX: 0 }, { scaleX: 1, ease: "none" });
        st.current = tl.scrollTrigger ?? null;
        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
          st.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Unpinned (reduced motion on desktop): the fill follows the chosen stage.
  useGSAP(() => {
    if (st.current || !fill.current) return;
    gsap.to(fill.current, { scaleX: active / LAST, duration: 0.45, ease: "power2.out" });
  }, { dependencies: [active], scope: root });

  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(LAST, i));
    const s = st.current;
    if (s) window.scrollTo({ top: s.start + ((n + 0.02) / LAST) * (s.end - s.start), behavior: "smooth" });
    else setActive(n);
  };

  return (
    <div ref={root} className="bg-background">
      {/* The route */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-10">
          {PHASES.map((ph) => {
            const span = SYSTEM.filter((s) => s.phase === ph).length;
            return (
              <p
                key={ph}
                className="text-data border-l border-input pl-2.5 text-[10.5px] tracking-[0.12em] text-subtle"
                style={{ gridColumn: `span ${span} / span ${span}` }}
              >
                {ph.toUpperCase()}
              </p>
            );
          })}
        </div>
        <div ref={railRef} className="relative mt-5 grid grid-cols-10">
          <span aria-hidden="true" className="absolute h-px bg-input" style={{ left: line.left, top: line.top, width: line.width }} />
          <span
            ref={fill}
            aria-hidden="true"
            className="absolute h-px origin-left scale-x-0 bg-foreground"
            style={{ left: line.left, top: line.top, width: line.width }}
          />
          {SYSTEM.map((s, i) => {
            const on = i === active;
            const reached = i <= active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={on ? "step" : undefined}
                aria-label={`Stage ${i + 1}: ${s.label}`}
                className="group relative flex flex-col items-start gap-2.5 pb-1 text-left outline-offset-4"
              >
                <span
                  ref={(el) => {
                    dots.current[i] = el;
                  }}
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 block h-[9px] w-[9px] transition-colors duration-[var(--dur-med)]",
                    on ? "bg-brand" : reached ? "bg-foreground" : "border border-input bg-background group-hover:border-foreground",
                  )}
                />
                <span
                  className={cn(
                    "pr-2 text-[12.5px] leading-snug transition-colors duration-[var(--dur-med)]",
                    on ? "text-foreground" : "text-subtle group-hover:text-foreground",
                  )}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phones and tablets: where you are, and the way on. */}
      <div className="flex items-center justify-between gap-4 border-y border-border py-3 lg:hidden">
        <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} className="text-data min-h-10 px-1 text-[12px] disabled:opacity-30">
          ← PREV
        </button>
        <span className="text-data text-[12px]">
          {String(active + 1).padStart(2, "0")} / {SYSTEM.length} · {SYSTEM[active].phase.toUpperCase()}
        </span>
        <button type="button" onClick={() => goTo(active + 1)} disabled={active === LAST} className="text-data min-h-10 px-1 text-[12px] disabled:opacity-30">
          NEXT →
        </button>
      </div>

      {/* The spread: every stage in one cell, the active one in place. */}
      <div className="mt-14 grid" aria-live="polite">
        {SYSTEM.map((s, i) => {
          const level = LEVELS[s.level - 1];
          const on = i === active;
          return (
            <article
              key={s.id}
              aria-hidden={!on}
              className={cn(
                "col-start-1 row-start-1 grid gap-x-16 gap-y-10 transition-[opacity,transform] ease-[var(--ease-exec)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
                on ? "translate-y-0 opacity-100 delay-100 duration-500" : "pointer-events-none translate-y-2 opacity-0 duration-200",
              )}
            >
              <div>
                <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
                  STAGE <span className="text-foreground">{String(i + 1).padStart(2, "0")}</span> OF {COUNT} · {s.phase.toUpperCase()}
                </p>
                <h3 className="font-serif-display mt-4 text-[clamp(2.2rem,3.6vw,3.25rem)] leading-none tracking-[-0.02em]">{s.label}</h3>
                <p className="mt-5 max-w-[38ch] text-[16px] leading-relaxed text-secondary-foreground">{s.does}</p>
              </div>
              <dl className="border-t-2 border-foreground">
                <div className="grid gap-2 border-b border-border py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="text-data pt-0.5 text-[10.5px] tracking-[0.12em] text-subtle">HOW IT BREAKS</dt>
                  <dd className="max-w-[48ch] text-[15px] leading-relaxed">{s.breaks}</dd>
                </div>
                <div className="grid gap-2 border-b border-border py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="text-data pt-0.5 text-[10.5px] tracking-[0.12em] text-subtle">THE NUMBER</dt>
                  <dd className="text-[15px] text-brand">{s.metric}</dd>
                </div>
                <div className="grid gap-2 border-b border-border py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="text-data pt-0.5 text-[10.5px] tracking-[0.12em] text-subtle">WHERE YOU LEARN IT</dt>
                  <dd className="text-[15px]">
                    <Link
                      href="#tracks"
                      tabIndex={on ? 0 : -1}
                      className="underline decoration-input underline-offset-4 hover:decoration-foreground"
                    >
                      Level {String(level.n).padStart(2, "0")}, {level.verb}: {level.title}
                    </Link>
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
