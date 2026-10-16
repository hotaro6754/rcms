"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText } from "@/lib/gsap/register";
import { PROBLEM_LINES } from "@/lib/data/problem";
import { ProblemLine } from "./ProblemLine";
import { cn } from "@/lib/utils";

const N = PROBLEM_LINES.length;

/**
 * The first break in the page's temperature: ink, full width, one claim about the field.
 *
 * Desktop with motion: the chapter pins for a few screens. The statement sits at the top;
 * below it one line at a time ("It's a chain.", "A system." …) with the plain fact that
 * makes it true, an index of the six on the right, and a rule that fills with the reader's
 * progress. The last step lands the resolution: we teach the whole picture.
 *
 * Phones, tablets and reduced motion: the six lines and their facts, stacked, all visible.
 *
 * GSAP owns the pin, the progress rule and the headline's line reveal. Motion owns the
 * line swap (ProblemLine). They never share an element.
 */
export function OpeningStatement() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const resolved = step >= N;
  const index = Math.min(step, N - 1);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // autoSplit re-splits once the serif has loaded or the width changes.
        const split = SplitText.create(title.current, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 105,
              duration: 1.1,
              ease: "power3.out",
              stagger: 0.08,
              scrollTrigger: { trigger: title.current, start: "top 82%", once: true },
            }),
        });
        return () => split.revert();
      });
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const distance = () => window.innerHeight * 0.55 * (N + 1);
        const st = ScrollTrigger.create({
          trigger: stage.current,
          start: "top top",
          end: () => "+=" + distance(),
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => setStep(Math.min(N, Math.floor(self.progress * (N + 1)))),
        });
        const fill = gsap.fromTo(
          bar.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: stage.current, start: "top top", end: () => "+=" + distance(), scrub: 0.4, invalidateOnRefresh: true },
          },
        );
        return () => {
          st.kill();
          fill.scrollTrigger?.kill();
          fill.kill();
          setStep(0);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section id="problem" ref={root} data-env="ink" aria-labelledby="opening-title" className="env-ink relative bg-background">
      <div ref={stage} className="mx-auto flex max-w-[1320px] flex-col px-6 pb-20 pt-28 lg:min-h-screen lg:pb-12 lg:pt-24">
        <div className="flex items-baseline justify-between gap-6">
          <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
            <span className="text-foreground">01</span>
            <span aria-hidden="true" className="mx-1.5">/</span>THE PROBLEM
          </p>
          <p aria-hidden="true" className="text-data hidden text-[11px] tracking-[0.12em] text-subtle lg:motion-safe:block">
            <span className="text-foreground">{String(index + 1).padStart(2, "0")}</span> / {String(N).padStart(2, "0")}
          </p>
        </div>

        <div data-gsap-scope>
          <h2
            id="opening-title"
            ref={title}
            className="mt-8 text-[clamp(2.8rem,6.4vw,6.2rem)] leading-[0.95] tracking-[-0.035em]"
          >
            RCM isn&rsquo;t one process.
          </h2>
        </div>

        {/* Pinned sequence: desktop with motion only. */}
        <div className="mt-auto hidden gap-16 pt-16 lg:motion-safe:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end">
          <div aria-live="polite" className={cn("transition-opacity duration-500", resolved && "opacity-30")}>
            <ProblemLine index={index} />
          </div>
          <ol className="text-data flex flex-col gap-2.5 border-l border-border pl-5 text-[12px] tracking-[0.06em]">
            {PROBLEM_LINES.map((l, i) => (
              <li
                key={l.noun}
                className={cn(
                  "flex items-baseline gap-3 transition-colors duration-300",
                  i === index && !resolved ? "font-semibold text-foreground" : "text-subtle",
                )}
              >
                <span className="w-5">{String(i + 1).padStart(2, "0")}</span>
                {l.noun.replace(".", "").toUpperCase()}
              </li>
            ))}
          </ol>
        </div>

        {/* Stacked: phones, tablets and reduced motion. */}
        <ol className="mt-14 flex flex-col gap-8 lg:motion-safe:hidden">
          {PROBLEM_LINES.map((l) => (
            <li key={l.noun} className="border-t border-border pt-5">
              <p className="font-serif-display text-[clamp(1.9rem,5vw,2.8rem)] leading-[1.05]">
                <span className="text-foreground/60">{l.lead} </span>
                <em className="italic">{l.noun}</em>
              </p>
              <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">{l.fact}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
          <div data-gsap-scope aria-hidden="true" className="hidden h-px bg-foreground/15 lg:motion-safe:block">
            <div ref={bar} className="h-px origin-left scale-x-0 bg-foreground" />
          </div>
          <div
            className={cn(
              "border-l border-foreground pl-6 transition-[opacity,transform] duration-700 ease-[var(--ease-exec)] lg:col-start-2",
              resolved ? "lg:motion-safe:translate-y-0 lg:motion-safe:opacity-100" : "lg:motion-safe:translate-y-3 lg:motion-safe:opacity-0",
            )}
          >
            <p className="font-serif-display text-[1.9rem] leading-tight">We teach the whole picture.</p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              Here RCM is one system, learned one level at a time, until a decision made at
              registration is something you can see arriving as a denial six weeks later.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
