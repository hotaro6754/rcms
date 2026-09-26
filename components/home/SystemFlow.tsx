"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { SYSTEM } from "@/lib/data/system";
import { LEVELS } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

const PHASES = ["Front end", "Middle", "Back end"] as const;
const LAST = SYSTEM.length - 1;
/** Scroll distance per stage while pinned, in px. */
const PER_STAGE = 340;

/**
 * Ten stages on one line: the revenue cycle as a system rather than a list of jobs.
 *
 * Desktop: the rail and cards pin, centred in the viewport, and the reader's own scroll
 * walks the cycle, one stage per step, snapping so it always rests on a stage. The active stage's card glides to the left edge of the frame, fully in view; the
 * progress line runs dot to dot (measured from the first dot's centre to the last) and
 * always lands on a dot; every stage reached stays lit. Clicking a dot scrolls to that stage. Nothing opens or closes
 * on hover.
 *
 * Phones, tablets and reduced motion: no pin. The cards are a native swipe row, with a
 * progress bar and a stage counter above them.
 *
 * GSAP owns the pin, the track's x and the line's width. CSS owns node and card states.
 */
export function SystemFlow() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const fill = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [line, setLine] = useState({ left: 0, top: 0, width: 0 });

  // The line runs from the first dot's centre to the last dot's centre, measured.
  useLayoutEffect(() => {
    const measure = () => {
      const rail = railRef.current;
      const first = dots.current[0];
      const last = dots.current[LAST];
      if (!rail || !first || !last) return;
      const r = rail.getBoundingClientRect();
      const a = first.getBoundingClientRect();
      const b = last.getBoundingClientRect();
      setLine({
        left: a.left + a.width / 2 - r.left,
        top: a.top + a.height / 2 - r.top,
        width: b.left + b.width / 2 - (a.left + a.width / 2),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (railRef.current) ro.observe(railRef.current);
    return () => ro.disconnect();
  }, []);

  // Without the pin the fill follows the chosen stage.
  useEffect(() => {
    if (pinned || !fill.current) return;
    fill.current.style.width = `${(active / LAST) * line.width}px`;
  }, [active, pinned, line.width]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const t = track.current;
        const v = viewport.current;
        if (!t || !v || !root.current) return;
        setPinned(true);
        // The track does not slide continuously (that left the active card half off the
        // edge). It snaps: whichever stage the scroll has reached, its card glides to the
        // left edge of the frame, fully in view, clamped so the last cards never overshoot.
        const cardX = (i: number) => {
          const card = t.children[i] as HTMLElement | undefined;
          const max = Math.max(0, t.scrollWidth - v.clientWidth);
          return -Math.min(card ? card.offsetLeft : 0, max);
        };
        let shown = -1;
        const show = (i: number) => {
          if (i === shown) return;
          shown = i;
          gsap.to(t, { x: cardX(i), duration: 0.7, ease: EASE.exec, overwrite: true });
        };
        // Pin the rail and the cards only (not the heading), centred in the viewport, so
        // the whole working area is on screen at any window height. Snap settles the
        // scroll on a stage, so it never rests between two.
        st.current = ScrollTrigger.create({
          trigger: root.current,
          start: "center 54%",
          end: () => "+=" + LAST * PER_STAGE,
          pin: true,
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / LAST, duration: { min: 0.2, max: 0.5 }, delay: 0.06, ease: "power1.inOut" },
          onRefresh: () => {
            shown = -1;
          },
          onUpdate(self) {
            const railW = railRef.current ? lineWidth(railRef.current, dots.current) : 0;
            const i = Math.round(self.progress * LAST);
            // The line lands on the active dot, never between two.
            if (fill.current) fill.current.style.width = `${(i / LAST) * railW}px`;
            setActive(i);
            show(i);
          },
        });
        return () => {
          st.current?.kill();
          st.current = null;
          gsap.killTweensOf(t);
          gsap.set(t, { x: 0 });
          setPinned(false);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  // Swipe row (no pin): the card nearest the left edge is the active stage.
  const onSwipe = useCallback(() => {
    if (pinned) return;
    const v = viewport.current;
    const t = track.current;
    if (!v || !t || !t.firstElementChild) return;
    const step = (t.firstElementChild as HTMLElement).offsetWidth + 16;
    setActive(Math.max(0, Math.min(LAST, Math.round(v.scrollLeft / step))));
  }, [pinned]);

  const goTo = (i: number) => {
    const s = st.current;
    if (s) {
      window.scrollTo({ top: s.start + (i / LAST) * (s.end - s.start), behavior: "smooth" });
      return;
    }
    const card = track.current?.children[i] as HTMLElement | undefined;
    viewport.current?.scrollTo({ left: card ? card.offsetLeft : 0, behavior: "smooth" });
    setActive(i);
  };

  return (
    <div ref={root} className="mt-14 bg-transparent">
      {/* Rail: desktop shows every stage on the line; smaller screens get a counter. */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-10">
          {PHASES.map((ph) => {
            const span = SYSTEM.filter((s) => s.phase === ph).length;
            return (
              <p
                key={ph}
                className="label-caps border-l border-input pl-3 text-[11px]"
                style={{ gridColumn: `span ${span} / span ${span}` }}
              >
                {ph}
              </p>
            );
          })}
        </div>

        <div ref={railRef} className="relative mt-6 grid grid-cols-10">
          <span
            aria-hidden="true"
            className="absolute h-px bg-input"
            style={{ left: line.left, top: line.top, width: line.width }}
          />
          <span
            ref={fill}
            aria-hidden="true"
            className="absolute h-px bg-brand transition-[width] duration-[var(--dur-slow)] ease-[var(--ease-exec)]"
            style={{ left: line.left, top: line.top, width: 0 }}
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
                className="group relative flex flex-col items-center gap-3 px-1 pb-1 text-center outline-offset-4"
              >
                <span className={cn("text-data text-micro transition-colors", on ? "text-brand" : "text-subtle")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  ref={(el) => {
                    dots.current[i] = el;
                  }}
                  aria-hidden="true"
                  className={cn(
                    "relative z-10 h-3 w-3 rounded-full border transition-all duration-[var(--dur-med)]",
                    on
                      ? "scale-125 border-brand bg-brand shadow-[0_0_0_6px_var(--accent)]"
                      : reached
                        ? "border-brand bg-brand"
                        : "border-input bg-card group-hover:border-brand",
                  )}
                />
                <span
                  className={cn(
                    "text-[13px] leading-snug transition-colors duration-[var(--dur-med)]",
                    on ? "font-medium text-foreground" : reached ? "text-secondary-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4 lg:hidden">
        <span className="text-data text-micro text-brand">
          {String(active + 1).padStart(2, "0")} / {SYSTEM.length}
        </span>
        <span className="relative h-px flex-1 bg-input">
          <span
            className="absolute inset-y-0 left-0 bg-brand transition-[width] duration-[var(--dur-med)]"
            style={{ width: `${((active + 1) / SYSTEM.length) * 100}%` }}
          />
        </span>
        <span className="label-caps text-[11px]">{SYSTEM[active].phase}</span>
      </div>

      {/* The cards */}
      <div
        ref={viewport}
        onScroll={onSwipe}
        className={cn(
          "-mx-6 mt-8 px-6 lg:mx-0 lg:mt-10 lg:px-0",
          pinned ? "overflow-hidden" : "snap-x snap-mandatory overflow-x-auto pb-2 [scrollbar-width:none]",
        )}
      >
        <div ref={track} className="flex w-max gap-4 will-change-transform lg:gap-6">
          {SYSTEM.map((s, i) => {
            const level = LEVELS[s.level - 1];
            const on = i === active;
            return (
              <article
                key={s.id}
                aria-label={`${i + 1}. ${s.label}`}
                className={cn(
                  "grid w-[84vw] shrink-0 snap-start gap-px overflow-hidden rounded-2xl border bg-border transition-[opacity,border-color] duration-[var(--dur-med)] sm:w-[34rem] lg:w-[min(52rem,64vw)] lg:grid-cols-2",
                  on ? "border-brand/40 opacity-100" : "border-border lg:opacity-45",
                )}
              >
                <div className="bg-card p-6 lg:p-8">
                  <p className="label-caps flex items-center gap-2">
                    <span className="text-data text-brand">{String(i + 1).padStart(2, "0")}</span>
                    {s.phase}
                  </p>
                  <h3 className="font-serif-display mt-3 text-[2rem] leading-tight">{s.label}</h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-secondary-foreground">{s.does}</p>
                  <p className="label-caps mt-6">The number that tells you</p>
                  <p className="text-data mt-2 text-[15px] font-medium text-brand">{s.metric}</p>
                </div>
                <div className="flex flex-col bg-card p-6 lg:p-8">
                  <p className="label-caps">How it breaks</p>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-secondary-foreground">{s.breaks}</p>
                  <div className="mt-auto border-t border-border pt-5">
                    <p className="label-caps">Where you learn it</p>
                    <p className="mt-2 text-[14px] text-secondary-foreground">
                      Level {String(level.n).padStart(2, "0")} ·{" "}
                      <span className="font-medium text-foreground">{level.verb}</span>, {level.title}
                    </p>
                    <Link
                      href="#tracks"
                      className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[13.5px] font-medium text-brand underline-offset-4 hover:underline"
                    >
                      See the level <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
          {/* Lets the last card reach the left edge in the swipe row. */}
          <span aria-hidden="true" className="w-px shrink-0 lg:hidden" />
        </div>
      </div>
    </div>
  );
}

/** First-to-last dot distance, read live so the pinned fill matches the drawn line. */
function lineWidth(rail: HTMLElement, dots: (HTMLSpanElement | null)[]) {
  const a = dots[0]?.getBoundingClientRect();
  const b = dots[dots.length - 1]?.getBoundingClientRect();
  if (!a || !b) return rail.clientWidth;
  return b.left - a.left;
}
