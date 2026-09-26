"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP, SplitText, ScrollTrigger } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { LevelStrip } from "./LevelStrip";
import { AuroraField } from "@/components/environment/AuroraField";
import { WaveSeam } from "@/components/environment/WaveSeam";
import { ClaimDocument } from "@/components/illustration/ClaimDocument";
import { aurora } from "@/lib/environment";
import { introDone } from "@/lib/intro";

/**
 * The hero.
 *
 * Left: what the Academy is, in one headline, one paragraph and two actions. Right: the
 * claim, the revenue cycle's one real artefact, filled in stage by stage as it goes round
 * (components/illustration/ClaimDocument.tsx).
 *
 * The headline is on screen within about a second of the page (or the preloader) letting
 * go: four lines rise in quick succession and the two emphasised words fill with the accent.
 * The illustration builds in parallel, never first. Resting state is the finished headline,
 * so without JavaScript or under reduced motion there is nothing to wait for.
 *
 * Behind both: the daylight sky (AuroraField), a scrim that keeps the text column calm,
 * grain, and a wave seam that hands over to the page.
 */
export function HeroSequence() {
  const root = useRef<HTMLDivElement>(null);

  // Scroll through the hero lifts and quietens the sky, and retires the scroll cue.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cue = el.querySelector<HTMLElement>(".scroll-cue");
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        aurora.scroll = self.progress;
        if (cue) cue.style.opacity = String(Math.max(0, 1 - self.progress * 6));
      },
    });
    return () => {
      st.kill();
      aurora.scroll = 0;
    };
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      let split: SplitText | null = null;
      let cancelled = false;

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(el);
        const h1 = q("h1")[0];
        const rest = q(".hero-after");
        // Hidden before first paint; the reveal below brings them back.
        gsap.set([h1, ...rest], { autoAlpha: 0 });
        gsap.set(rest, { y: 10 });

        const fonts = document.fonts?.ready ?? Promise.resolve();
        Promise.all([fonts, introDone()]).then(() => {
          if (cancelled) return;
          // One split against the real font metrics. Each phrase is a single short line.
          split = SplitText.create(q(".hero-phrase"), { type: "lines", mask: "lines", linesClass: "hero-line" });
          const lines = split.lines as HTMLElement[];
          gsap.set(h1, { autoAlpha: 1 });
          gsap.set(lines, { yPercent: 108 });

          // The two emphasised words fill left to right with the brand colour.
          const fills = q(".hero-accent .hero-line").map((line) => {
            const st = (line as HTMLElement).style;
            st.backgroundImage = "linear-gradient(90deg, var(--brand) 50%, var(--foreground) 50%)";
            st.backgroundSize = "200% 100%";
            st.backgroundPosition = "100% 0";
            st.setProperty("-webkit-background-clip", "text");
            st.backgroundClip = "text";
            st.color = "transparent";
            return line;
          });

          gsap
            .timeline({ defaults: { ease: EASE.exec } })
            .to(lines, { yPercent: 0, duration: 0.7, stagger: 0.09 }, 0.05)
            .to(fills, { backgroundPosition: "0% 0", duration: 0.8, stagger: 0.12 }, 0.35)
            .to(rest, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.4);
        });

        return () => {
          cancelled = true;
          split?.revert();
          split = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} data-gsap-scope className="hero-root relative isolate bg-background">
      <AuroraField className="-z-10" />
      {/* Scrim: the text column sits on calmer sky than the drawing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(244_239_230/0.85)_0%,rgb(244_239_230/0.5)_40%,transparent_66%)] max-lg:bg-[linear-gradient(180deg,rgb(244_239_230/0.7)_0%,rgb(244_239_230/0.45)_65%,transparent_100%)]"
      />
      <div aria-hidden="true" className="grain absolute inset-0 -z-10" />

      <div className="relative mx-auto grid max-w-[1320px] items-center gap-10 px-6 pb-[calc(clamp(40px,5vw,84px)+1.5rem)] pt-24 lg:min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:pt-24">
        <div>
          <p className="hero-after label-caps">RCMS Operations Academy</p>

          <h1 className="mt-5 text-[clamp(2.5rem,min(5.4vw,8.8vh),5rem)] leading-[1.02]">
            <span className="hero-phrase block w-fit whitespace-nowrap">From RCM</span>
            <span className="hero-phrase hero-accent block w-fit whitespace-nowrap pb-[0.06em] italic">
              beginner.
            </span>
            <span className="hero-phrase mt-2 block w-fit whitespace-nowrap">To operations</span>
            <span className="hero-phrase hero-accent block w-fit whitespace-nowrap pb-[0.06em] italic">
              leader.
            </span>
          </h1>

          <p className="hero-after mt-6 max-w-[50ch] text-[15.5px] leading-relaxed text-muted-foreground">
            End-to-end learning and practical mentoring for people building careers in US
            healthcare revenue cycle operations, from your first claim to leading teams, clients
            and the operation itself. One level at a time, each built on the last.
          </p>

          <div className="hero-after mt-7 flex flex-wrap gap-3">
            <a
              href="#tracks"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Explore learning paths
            </a>
            <a
              href="/mentoring"
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-card/70 px-5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-card"
            >
              1:1 mentoring
            </a>
          </div>

          <div className="hero-after">
            <LevelStrip area={root} />
          </div>
        </div>

        {/* The Academy's signature visual: one claim, filled in as it moves round the cycle. */}
        <ClaimDocument className="mx-auto w-full max-w-[40rem]" />
      </div>

      <a
        href="#metrics"
        className="scroll-cue absolute bottom-[calc(clamp(40px,5vw,84px)+0.5rem)] left-1/2 hidden -translate-x-1/2 items-center gap-2.5 text-micro text-muted-foreground transition-colors hover:text-foreground lg:flex"
      >
        <span className="label-caps">Scroll to explore</span>
        <span aria-hidden="true" className="h-6 w-px bg-input" />
      </a>

      <WaveSeam className="absolute inset-x-0 bottom-0" />
    </div>
  );
}
