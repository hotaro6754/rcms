"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { SYSTEM, type SystemStage } from "@/lib/data/system";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import { cn } from "@/lib/utils";

type Content = PageContent<typeof homePage>["system"];

/** The stage data predates the three learning levels; this maps its 1–5 ladder onto them. */
const LEVEL_KEY = { 1: "trainee", 2: "professional", 3: "professional", 4: "leadership", 5: "leadership" } as const;
const PHASE_KEY: Record<SystemStage["phase"], keyof Content["phases"]> = { "Front end": "front", Middle: "middle", "Back end": "back" };
const PHASES = ["Front end", "Middle", "Back end"] as const;
const LAST = SYSTEM.length - 1;
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The ten stages a claim has to clear, as a route the reader can explore at their own pace.
 *
 * The route is grouped by phase (front end, middle, back end). Choosing a stage — by click, tap
 * or the arrow keys — opens its panel: what the stage does, how it usually breaks, the number
 * that gives it away, and the level that teaches it. Previous and next buttons walk the route
 * in order. Nothing is pinned and scrolling is never taken over.
 *
 * Every stage's full detail is also in the table under the explorer, so nothing is reachable
 * only through the interaction.
 *
 * GSAP owns the route's progress line and the panel's short crossfade; under reduced motion
 * both simply change.
 */
export function SystemFlow({ content: c }: { content: Content }) {
  // The stages' copy is editable; their phase, order and teaching level stay with the data.
  const stages = SYSTEM.map((s, i) => ({ ...s, ...c.stages[i] }));
  const phaseName = (p: SystemStage["phase"]) => c.phases[PHASE_KEY[p]];
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const s = stages[active];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(".route-fill", { scaleX: active / LAST, duration: 0.45, ease: EASE.exec });
        gsap.fromTo(".stage-panel", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: EASE.exec });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".route-fill", { scaleX: active / LAST });
      });
      return () => mm.revert();
    },
    { dependencies: [active], scope: root },
  );

  const go = (i: number, focus = false) => {
    const n = Math.max(0, Math.min(LAST, i));
    setActive(n);
    if (focus) tabs.current[n]?.focus();
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (move) {
      e.preventDefault();
      go(i + move, true);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0, true);
    } else if (e.key === "End") {
      e.preventDefault();
      go(LAST, true);
    }
  };

  return (
    <div ref={root}>
      {/* The route */}
      <div role="tablist" aria-label="The ten revenue-cycle stages" className="grid gap-6 lg:grid-cols-10 lg:gap-0">
        {PHASES.map((ph, k) => {
          const members = stages.map((st, i) => ({ st, i })).filter(({ st }) => st.phase === ph);
          return (
            <div key={ph} className="lg:contents">
              <div
                className={cn("lg:col-span-[var(--span)] lg:px-2", k > 0 && "lg:border-l lg:border-border", k === 0 && "lg:pl-0", k === PHASES.length - 1 && "lg:pr-0")}
                style={{ "--span": members.length } as CSSProperties}
              >
                <p className="eyebrow mb-3 text-subtle">{phaseName(ph)}</p>
                <div className="flex flex-wrap gap-2 lg:grid lg:gap-2" style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}>
                  {members.map(({ st, i }) => {
                    const on = i === active;
                    return (
                      <button
                        key={st.id}
                        ref={(el) => {
                          tabs.current[i] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`stage-tab-${i}`}
                        aria-selected={on}
                        aria-controls="stage-panel"
                        tabIndex={on ? 0 : -1}
                        onClick={() => go(i)}
                        onKeyDown={(e) => onKey(e, i)}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-left text-[13.5px] leading-tight transition-colors duration-200 lg:min-h-[4.25rem] lg:flex-col lg:items-start lg:gap-1",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : i < active
                              ? "border-border bg-card text-foreground hover:border-foreground/30"
                              : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                        )}
                      >
                        <span className={cn("tabular text-[11.5px] font-semibold", on ? "text-primary-foreground/70" : "text-subtle")}>{pad(i + 1)}</span>
                        <span className="font-medium">{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress along the route */}
      <div aria-hidden="true" className="mt-5 hidden h-1 overflow-hidden rounded-full bg-border lg:block">
        <div className="route-fill h-full origin-left rounded-full bg-brand" style={{ transform: `scaleX(${active / LAST})` }} />
      </div>

      {/* The chosen stage */}
      <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${active}`} aria-live="polite" className="stage-panel site-card mt-6 p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
          <div>
            <p className="text-[13px] font-semibold text-subtle">
              Stage <span className="tabular text-foreground">{pad(active + 1)}</span> of {stages.length} · {phaseName(s.phase)}
            </p>
            <h3 className="mt-3 text-[clamp(1.6rem,2.6vw,2.1rem)] font-bold leading-tight tracking-[-0.02em]">{s.label}</h3>
            <p className="mt-4 max-w-[42ch] text-[16px] leading-relaxed text-secondary-foreground">{s.does}</p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => go(active - 1)}
                disabled={active === 0}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-3 text-[13.5px] font-medium transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" /> Previous
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                disabled={active === LAST}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-3 text-[13.5px] font-medium transition-colors hover:bg-muted disabled:opacity-40"
              >
                Next stage <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>
          <dl className="divide-y divide-border rounded-lg border border-border">
            <div className="grid gap-1.5 p-4 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-4">
              <dt className="eyebrow pt-0.5 text-subtle">{c.breaksLabel}</dt>
              <dd className="text-[15px] leading-relaxed">{s.breaks}</dd>
            </div>
            <div className="grid gap-1.5 p-4 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-4">
              <dt className="eyebrow pt-0.5 text-subtle">{c.numberLabel}</dt>
              <dd className="text-[15px] font-semibold text-brand">{s.metric}</dd>
            </div>
            <div className="grid gap-1.5 p-4 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-4">
              <dt className="eyebrow pt-0.5 text-subtle">{c.learnLabel}</dt>
              <dd className="text-[15px]">
                <Link href="#tracks" className="font-medium underline decoration-input underline-offset-4 hover:decoration-foreground">
                  {c.levelNames[LEVEL_KEY[s.level]]}
                </Link>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Every stage at once, for reading, printing and anyone not using the explorer. */}
      <details className="group mt-6 rounded-xl border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
          All {stages.length} stages in one table
          <span aria-hidden className="text-subtle transition-transform duration-200 group-open:rotate-45">+</span>
        </summary>
        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[56rem] text-left text-[14px]">
            <thead className="bg-muted text-[12px] uppercase tracking-[0.06em] text-subtle">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Stage</th>
                <th scope="col" className="px-4 py-3 font-semibold">What it does</th>
                <th scope="col" className="px-4 py-3 font-semibold">{c.breaksLabel}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{c.numberLabel}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{c.learnLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border align-top">
              {stages.map((st, i) => (
                <tr key={st.id}>
                  <th scope="row" className="px-4 py-3 font-semibold">
                    <span className="tabular mr-2 text-subtle">{pad(i + 1)}</span>
                    {st.label}
                    <span className="mt-0.5 block text-[12.5px] font-normal text-subtle">{phaseName(st.phase)}</span>
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">{st.does}</td>
                  <td className="px-4 py-3 text-muted-foreground">{st.breaks}</td>
                  <td className="px-4 py-3 font-medium text-brand">{st.metric}</td>
                  <td className="px-4 py-3">{c.levelNames[LEVEL_KEY[st.level]]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
