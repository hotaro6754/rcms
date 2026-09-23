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

export const HERO_BEATS = {
  blueprint: 0,
  flow: 0.7,
  stop: 1.4,
  queue: 2.0,
  break: 3.6,
  own: 4.5,
  metric: 5.1,
  reveal: 6.4,
} as const;

export { gsap };
