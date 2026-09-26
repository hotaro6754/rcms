"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { aurora } from "@/lib/environment";
import { finishIntro, markIntroDone } from "@/lib/intro";

const TERMS = ["Revenue cycle", "Operations", "Leadership"];

/**
 * The site coming online, not a progress bar.
 *
 * A curtain of warm stone with the wordmark, one rule drawing across, three words of what
 * the Academy covers. The curtain thins while the sky underneath is lit from zero, so the
 * mist ribbon emerges through it; the hero's own sequence starts before the words leave,
 * and the preloader is gone by about 1.4 s. It stays mounted (CSS hides it) so nothing
 * reverts the tween that lit the sky.
 *
 * Plays once per session, never under reduced motion, only on the homepage, and never
 * without JavaScript: the pre-paint script in app/layout.tsx decides, and CSS keeps the
 * curtain `display: none` unless it said "play". Presentational only; the real content is
 * in the DOM underneath the whole time.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (document.documentElement.dataset.intro !== "play") {
        aurora.intensity = 1;
        return;
      }

      aurora.intensity = 0;
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({
        defaults: { ease: EASE.exec },
        onComplete: finishIntro,
      });

      tl.from(q(".pl-mark"), { autoAlpha: 0, y: 10, duration: 0.45 }, 0)
        .from(
          q(".pl-rule"),
          { scaleX: 0, transformOrigin: "left center", duration: 0.7, ease: EASE.signal },
          0.15,
        )
        .from(q(".pl-term"), { autoAlpha: 0, y: 6, duration: 0.35, stagger: 0.08 }, 0.35)
        // The sky wakes underneath while the curtain thins.
        .to(aurora, { intensity: 1, duration: 1.1, ease: "power1.inOut" }, 0.3)
        .to(q(".pl-veil"), { autoAlpha: 0, duration: 0.8, ease: "power1.inOut" }, 0.45)
        // Hand over: the hero starts drawing while the words are still leaving.
        .call(markIntroDone, undefined, 0.75)
        .to(q(".pl-content"), { autoAlpha: 0, y: -8, duration: 0.35 }, 1.05);

      // If rAF is throttled (background tab), never leave the page covered.
      const bail = window.setTimeout(() => {
        tl.progress(1);
        aurora.intensity = 1;
        finishIntro();
      }, 3200);
      return () => window.clearTimeout(bail);
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      data-gsap-scope
      role="presentation"
      aria-hidden="true"
      className="preloader pointer-events-none fixed inset-0 z-[70] items-center"
    >
      <div className="pl-veil absolute inset-0 bg-background" />
      <div className="pl-content relative mx-auto w-full max-w-[1320px] px-6">
        <p className="pl-mark flex items-baseline gap-3">
          <span className="text-data rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-semibold leading-none text-background">
            RCMS
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Operations <span className="font-normal text-muted-foreground">Academy</span>
          </span>
        </p>
        <span className="pl-rule mt-5 block h-px w-[min(26rem,70vw)] bg-brand" />
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          {TERMS.map((t) => (
            <span key={t} className="pl-term label-caps">
              {t}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
