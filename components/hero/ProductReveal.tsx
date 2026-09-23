"use client";

import { Flip, ScrollTrigger, gsap } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { REVEAL_PAIRS } from "./reveal-pairs";

/** The central interaction: the object the hero resolved to becomes the dashboard metric. */

interface RevealOptions {
  /** Called once every pair has landed. */
  onComplete?: () => void;
}

/**
 * Implementation note, deliberate:
 *
 * This uses `Flip.fit()` rather than getState/mutate/Flip.from. Both are the Flip plugin and
 * both move the real element to the real target geometry — this is not a crossfade. fit() is
 * used because the destination lives in a different scroll region of the page: reparenting an
 * absolutely-positioned overlay across that boundary reintroduces exactly the layout-collapse
 * class of bug that `absolute: true` exists to paper over, whereas fit() animates the element
 * to the target's measured box without touching either parent's flow.
 *
 * `absolute: true` is still passed so the element is taken out of flow for the duration.
 *
 * The chrome (border, shadow) is handed to CSS transitions on the same elements. That is not
 * an ownership conflict: GSAP owns transform and geometry, CSS owns colour and shadow, and the
 * two property sets do not intersect.
 */
/**
 * Failsafe. The hero hides every landing slot pre-paint so an object can fly into it; if a
 * flight never happens, those slots must be given back or the dashboard renders as blank
 * space. Any exit path from the reveal calls this.
 */
export function revealTargets() {
  document
    .querySelectorAll<HTMLElement>("[data-flip-target]")
    .forEach((t) => (t.style.visibility = ""));
}

export function runProductReveal({ onComplete }: RevealOptions = {}) {
  let landed = 0;

  REVEAL_PAIRS.forEach((id, i) => {
    const source = document.querySelector<HTMLElement>(`[data-flip-id="${id}"]`);
    const target = document.querySelector<HTMLElement>(`[data-flip-target="${id}"]`);
    // Nothing to fly, or nowhere to fly to: show the card rather than leave a hole.
    if (!source || !target) {
      if (target) target.style.visibility = "";
      return;
    }

    const land = () => {
      // Target is measured while hidden but laid out, so its box is real.
      const tween = Flip.fit(source, target, {
        duration: 0.95,
        ease: EASE.exec,
        absolute: true,
        scale: false,
        delay: i * 0.08,
        onStart: () => {
          source.dataset.flying = "true";
        },
        onComplete: () => {
          target.style.visibility = "";
          gsap.to(source, {
            autoAlpha: 0,
            duration: 0.2,
            ease: EASE.ui,
            onComplete: () => source.remove(),
          });
          landed += 1;
          if (landed === REVEAL_PAIRS.length) onComplete?.();
        },
      });
      return tween;
    };

    // If the destination is already on screen, land immediately. If the visitor has not
    // scrolled that far, wait until it is visible — the transformation is only legible if
    // both ends of it are in view.
    const rect = target.getBoundingClientRect();
    const visible = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;

    if (visible) {
      land();
    } else {
      ScrollTrigger.create({
        trigger: target,
        start: "top 88%",
        once: true,
        onEnter: land,
      });
    }
  });
}
