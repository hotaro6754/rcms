"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { INTRO, stageFloat } from "./three/journeyMath";
import j from "./journey.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

const World = dynamic(() => import("./three/CycleWorld"), { ssr: false, loading: () => <div className={j.loading} aria-hidden /> });

export type JourneyStage = { label: string; does: string; breaks: string; metric: string; phase: string };

/**
 * The homepage hero as a pinned, scroll-driven 3D journey. First frame: the headline over the
 * whole revenue cycle in 3D. Scrolling scrubs one claim through the ten stages: the camera flies
 * platform to platform, the claim card travels the path, and the stage copy (what happens, how it
 * breaks, the number to watch) changes with it. Under reduced motion nothing is pinned: the world
 * renders once and the ten stages are listed as plain text.
 */
export function ClaimJourney3D({
  titleA,
  accent,
  lead,
  primary,
  secondary,
  levels,
  stages,
}: {
  titleA: string;
  accent: string;
  lead: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** Published learning levels, in order (e.g. Beginner … Executive Leadership). */
  levels: string[];
  stages: JourneyStage[];
}) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [idx, setIdx] = useState(-1);
  const reduce = useReducedMotion();
  // Render the 3D world only while the journey is on screen.
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create("[data-j-h1]", { type: "lines", mask: "lines" });
        const waiting = document.documentElement.dataset.preload === "run";
        const intro = gsap.timeline({ paused: waiting, defaults: { ease: "expo.out" } });
        intro.from(split.lines, { yPercent: 105, duration: 1.1, stagger: 0.08 }).from("[data-j-in]", { y: 16, opacity: 0, duration: 0.8, stagger: 0.06 }, "-=0.8");
        const guard = window.setTimeout(() => intro.progress(1), 4500);
        const play = () => intro.play();
        if (waiting) window.addEventListener("rcx:loaded", play, { once: true });

        let last = -2;
        const copy = root.current?.querySelector<HTMLElement>("[data-j-copy]");
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: () => `+=${window.innerHeight * 5}`,
          pin: true,
          scrub: 0.6,
          onUpdate: (self) => {
            progress.current = self.progress;
            // The headline steps aside the moment scrolling starts, leaving the 3D world.
            const k = Math.min(1, self.progress / (INTRO * 0.6));
            if (copy) gsap.set(copy, { autoAlpha: 1 - k, y: -40 * k, filter: `blur(${(6 * k).toFixed(1)}px)` });
            // Same mapping as the camera: the caption names the stage the camera is centred on.
            const i = self.progress < INTRO ? -1 : Math.round(stageFloat(self.progress));
            if (i !== last) {
              last = i;
              setIdx(i);
            }
          },
        });

        return () => {
          window.removeEventListener("rcx:loaded", play);
          window.clearTimeout(guard);
          st.kill();
          split.revert();
        };
      });
    },
    { scope: root },
  );

  const st = idx >= 0 ? stages[idx] : null;

  return (
    <section ref={root} className={j.journey} aria-labelledby="journey-title">
      <div className={j.world}>
        <World progress={progress} still={!!reduce} active={onScreen} />
      </div>

      <div className={j.copy} data-j-copy>
        <h1 className={j.h1} id="journey-title" data-j-h1>
          {titleA} <em>{accent}</em>
        </h1>
        <p className={j.lead} data-j-in>
          {lead}
        </p>
        <div className={j.ctas} data-j-in>
          <Link href={primary.href} className={j.btn}>
            {primary.label} <ArrowRight aria-hidden />
          </Link>
          <Link href={secondary.href} className={j.btnLine}>
            {secondary.label}
          </Link>
        </div>
        <div className={j.path} data-j-in>
          <ol aria-label="Learning levels">
            {levels.map((l, i) => (
              <li key={l} data-first={i === 0 || undefined}>
                <i aria-hidden>{String(i + 1).padStart(2, "0")}</i>
                <span>{l}</span>
              </li>
            ))}
          </ol>
          <p>
            {levels.length} levels · video, practice cases and an assessment in every module · a verifiable certificate for every course
          </p>
        </div>
        {!reduce && (
          <span className={j.cue} data-j-in aria-hidden>
            Scroll to follow one claim
          </span>
        )}
      </div>

      {!reduce && (
        <div className={j.panel} aria-live="polite">
          <AnimatePresence mode="wait">
            {st && (
              <motion.div
                key={idx}
                className={j.card}
                initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className={j.kicker}>
                  {String(idx + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")} · {st.phase}
                </span>
                <h2 className={j.stage}>{st.label}</h2>
                <p className={j.does}>{st.does}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <ol className={j.rail} aria-hidden>
            {stages.map((s, i) => (
              <li key={s.label} data-on={i <= idx || undefined} data-now={i === idx || undefined}>
                <i />
                <span>{s.label}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {reduce && (
        <ol className={j.list}>
          {stages.map((s, i) => (
            <li key={s.label}>
              <b>
                {String(i + 1).padStart(2, "0")} · {s.label}
              </b>{" "}
              {s.does}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
