"use client";

import { CustomEase, gsap } from "./register";

/**
 * One motion personality for the whole product.
 *
 * "exec" — a decisive curve: almost no anticipation, a long confident settle. Used for
 * headline movement, metric resolution, every major hero beat and the Flip. If a motion
 * feels like it belongs to this product, it is because it used this ease.
 *
 * "signal" — for things that travel: claim nodes on the lifecycle path, the metric line
 * drawing. Even pacing, no easing drama, so the eye reads distance rather than acceleration.
 */

let created = false;

export function registerEases() {
  if (created || typeof window === "undefined") return;
  CustomEase.create("exec", "M0,0 C0.2,0 0.1,1 1,1");
  CustomEase.create("signal", "M0,0 C0.35,0 0.15,1 1,1");
  created = true;
}

registerEases();

export const EASE = {
  exec: "exec",
  signal: "signal",
  ui: "power2.out",
} as const;

/** Mirrors the --dur-* CSS tokens in app/globals.css, in seconds for GSAP. */
export const DUR = {
  fast: 0.16,
  med: 0.48,
  slow: 1.2,
  ambient: 18,
} as const;

export { gsap };
