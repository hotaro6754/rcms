"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";
import { LEVELS, PROGRAMS, inr } from "@/lib/data/catalog";
import { SectionHead } from "./SectionHead";
import { SectionField } from "@/components/environment/SectionField";
import { cn } from "@/lib/utils";

const LAST = LEVELS.length - 1;
/** Scroll distance per level while pinned, in px. */
const PER_LEVEL = 360;

/**
 * The path, not a course grid.
 *
 * Desktop: the rail and the level card pin under the nav, and the reader's scroll climbs
 * the five levels. The rail fills from the first dot to the last (measured, so it passes
 * through every dot), each level reached stays lit, the card beside it changes to that
 * level, and the section's own background deepens with it (data-level drives the mesh in
 * globals.css). Clicking a level scrolls to it.
 *
 * Phones, tablets and reduced motion: no pin. Tapping a level selects it.
 *
 * GSAP owns the pin and the snap. CSS owns the rail fill, the rows and the card swap:
 * all five cards share one grid cell, so the cell is always as tall as the tallest and
 * changing level never moves the page.
 */
export function LearningPath() {
  const [active, setActive] = useState(0);
  const block = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const fill = useRef<HTMLSpanElement>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const [line, setLine] = useState({ top: 0, height: 0 });

  // The rail runs dot centre to dot centre, measured: rows differ in height.
  useLayoutEffect(() => {
    const measure = () => {
      const r = rail.current?.getBoundingClientRect();
      const a = dots.current[0]?.getBoundingClientRect();
      const b = dots.current[LAST]?.getBoundingClientRect();
      if (!r || !a || !b) return;
      setLine({ top: a.top + a.height / 2 - r.top, height: b.top - a.top });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (rail.current) ro.observe(rail.current);
    return () => ro.disconnect();
  }, []);

  // The fill always lands on the active dot and eases there (CSS), pinned or not. Following
  // the scroll 1:1 while the card changed in steps is what made it feel laggy.
  useEffect(() => {
    if (!fill.current) return;
    fill.current.style.height = `${(active / LAST) * line.height}px`;
  }, [active, line.height]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        if (!block.current) return;
        st.current = ScrollTrigger.create({
          trigger: block.current,
          // Centred in the viewport while pinned, clear of the nav at the top.
          start: "center 54%",
          end: () => "+=" + LAST * PER_LEVEL,
          pin: true,
          invalidateOnRefresh: true,
          // Settle on a level; never rest between two.
          snap: { snapTo: 1 / LAST, duration: { min: 0.2, max: 0.5 }, delay: 0.06, ease: "power1.inOut" },
          onUpdate(self) {
            setActive(Math.round(self.progress * LAST));
          },
        });
        return () => {
          st.current?.kill();
          st.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: block },
  );

  const choose = (i: number) => {
    const s = st.current;
    if (s) {
      window.scrollTo({ top: s.start + (i / LAST) * (s.end - s.start), behavior: "smooth" });
      return;
    }
    setActive(i);
  };

  return (
    <section id="tracks" data-level={active + 1} className="path-scope relative isolate border-t border-border">
      <span id="programs" className="sr-only" />
      <SectionField variant="mesh" />
      <div className="mx-auto max-w-[1320px] px-6 py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end lg:gap-16">
          <SectionHead
            index="03"
            kicker="The learning path"
            title={
              <>
                You don&rsquo;t need another course. <em>You need a path.</em>
              </>
            }
          />
          <div className="flex flex-col gap-5">
            <p data-reveal className="max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
              Five levels, each built on the one before. Start where you actually work today;
              every level ends with work you can show, not a certificate.
            </p>
          </div>
        </div>

        <div ref={block} className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
          {/* The rail */}
          <ol ref={rail} className="relative flex flex-col" aria-label="Levels">
            <span aria-hidden="true" className="absolute left-[11px] w-px bg-input" style={{ top: line.top, height: line.height }} />
            <span
              ref={fill}
              aria-hidden="true"
              className="absolute left-[11px] w-px bg-brand transition-[height] duration-[var(--dur-med)] ease-[var(--ease-exec)]"
              style={{ top: line.top, height: 0 }}
            />
            {LEVELS.map((l, i) => {
              const on = i === active;
              const reached = i <= active;
              return (
                <li key={l.n}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => choose(i)}
                    className="group relative flex w-full items-center gap-5 py-3.5 pl-10 text-left"
                  >
                    <span
                      ref={(el) => {
                        dots.current[i] = el;
                      }}
                      aria-hidden="true"
                      className={cn(
                        "absolute left-[5px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border transition-all duration-[var(--dur-med)]",
                        on
                          ? "border-brand bg-brand shadow-[0_0_0_6px_var(--accent)]"
                          : reached
                            ? "border-brand bg-brand"
                            : "border-input bg-card group-hover:border-brand",
                      )}
                    />
                    <span className={cn("text-data w-7 shrink-0 text-micro", on ? "text-brand" : "text-subtle")}>
                      {String(l.n).padStart(2, "0")}
                    </span>
                    <span className="flex flex-col">
                      <span
                        className={cn(
                          "font-serif-display text-[clamp(2rem,3.2vw,2.8rem)] leading-none transition-colors duration-[var(--dur-med)]",
                          on ? "text-foreground" : reached ? "text-secondary-foreground" : "text-subtle group-hover:text-muted-foreground",
                        )}
                      >
                        {l.verb}
                      </span>
                      <span className="mt-1.5 text-[13.5px] text-muted-foreground">{l.title}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* The level: all five cards stacked in one cell; the active one shows. */}
          <div className="grid rounded-2xl border border-border bg-card/90 shadow-[var(--shadow-md)] backdrop-blur-sm">
            {LEVELS.map((lv, i) => (
              <LevelCard key={lv.n} index={i} shown={i === active} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LevelCard({ index, shown }: { index: number; shown: boolean }) {
  const level = LEVELS[index];
  const program = PROGRAMS.find((p) => p.level === level.n);
  return (
    <div
      aria-hidden={!shown}
      className={cn(
        "col-start-1 row-start-1 p-7 transition-[opacity,transform] duration-[var(--dur-med)] ease-[var(--ease-exec)] lg:p-9",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <p className="label-caps">
        Level {String(level.n).padStart(2, "0")} · {level.title}
      </p>
      <p className="font-serif-display mt-5 text-[clamp(1.5rem,2.2vw,1.95rem)] leading-snug">
        <span className="italic text-brand">By the end: </span>
        {level.outcome}
      </p>
      <p className="mt-5 text-[14px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">For: </span>
        {level.who}
      </p>

      <ul className="mt-7 grid gap-x-6 gap-y-2.5 border-t border-border pt-6 sm:grid-cols-2">
        {level.modules.slice(0, 6).map((m) => (
          <li key={m} className="flex gap-2.5 text-[13.5px] leading-relaxed text-secondary-foreground">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand" />
            {m}
          </li>
        ))}
      </ul>
      {level.modules.length > 6 && (
        <p className="mt-3 text-micro text-subtle">and {level.modules.length - 6} more modules</p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        {program ? (
          <p className="text-[13.5px] text-muted-foreground">
            <span className="font-medium text-foreground">{program.name}</span>
            <span className="text-data"> · {inr(program.price)} · {program.weeks}</span>
          </p>
        ) : (
          <p className="text-[13.5px] text-muted-foreground">Taught inside the Operational Excellence track</p>
        )}
        <Link
          href={program ? `/courses#${program.id}` : "/learning-paths"}
          tabIndex={shown ? undefined : -1}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {program ? "See the program" : "See the path"}
        </Link>
      </div>
    </div>
  );
}
