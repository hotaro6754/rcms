"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";

/** Each line: lead-in, then the emphasised noun. Lit one by one as the reader scrolls. */
const LINES: [string, string][] = [
  ["It's a ", "chain."],
  ["A ", "system."],
  ["A set of ", "decisions."],
  ["A set of ", "people."],
  ["A set of ", "rules."],
  ["A set of ", "financial outcomes."],
];

/**
 * The first narrative moment after the hero: why RCM is hard to learn, in one statement
 * that builds.
 *
 *   RCM isn't one process.
 *   It's a chain. A system. A set of decisions. A set of people. …
 *   We teach the whole picture.
 *
 * Each line is lit by scroll position, not played on a timer, so the reader sets the pace
 * and scrolling back unlights it. Lines stay dim until reached, the way the subject feels
 * before someone connects it for you.
 *
 * GSAP owns the scrubbed opacity. Under reduced motion every line is simply lit.
 */
export function OpeningStatement() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);
        const lines = q(".between");
        gsap.set(lines, { opacity: 0.16 });
        gsap.set(q(".resolve"), { opacity: 0, y: 16 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top 70%",
            end: "bottom 60%",
            scrub: 0.6,
          },
        });
        lines.forEach((l, i) => tl.to(l, { opacity: 1, duration: 1, ease: "none" }, i * 0.8));
        tl.to(q(".resolve"), { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, lines.length * 0.8 + 0.2);
        return () => tl.scrollTrigger?.kill();
      });
      ScrollTrigger.refresh();
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} data-gsap-scope aria-labelledby="opening-title" className="border-t border-border">
      <div className="mx-auto max-w-[1320px] px-6 py-28 lg:py-40">
        <p className="label-caps flex items-center gap-3">
          <span className="text-brand">01</span>
          <span aria-hidden="true" className="h-px w-8 bg-input" />
          The problem
        </p>
        <h2 id="opening-title" className="mt-8 max-w-[16ch] text-[clamp(2.6rem,6vw,5.4rem)] leading-[1.02]">
          RCM isn&rsquo;t one process.
        </h2>

        <p className="mt-14 grid gap-x-10 gap-y-2 text-[clamp(1.6rem,3.4vw,3rem)] leading-[1.15] lg:ml-[33%]">
          {LINES.map(([lead, word]) => (
            <span key={word} className="between font-serif-display">
              {lead}
              <em className="italic text-brand">{word}</em>
            </span>
          ))}
        </p>

        <div className="resolve mt-16 grid gap-6 border-t border-border pt-8 lg:ml-[33%] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="font-serif-display text-[clamp(1.8rem,3vw,2.6rem)] leading-tight">
              We teach the whole picture.
            </p>
            <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-secondary-foreground">
              Most people meet RCM as disconnected terms, departments and screens. Here it is one
              connected system, learned one level at a time, until you can see how a decision at
              registration shows up as a denial six weeks later.
            </p>
          </div>
          <a
            href="#system"
            className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-brand underline-offset-4 hover:underline"
          >
            See the whole system <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
