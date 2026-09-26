"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Walks a diagram through its steps: 0, 1, 2 … count-1, a pause, then round again.
 *
 * Runs only while the diagram is on screen (IntersectionObserver) and the tab is visible.
 * Under reduced motion it never starts, and `done` is true, so the diagram renders
 * finished and still. Pass `hold` to stop on a given step (a parent that is driving the
 * diagram itself, e.g. from scroll).
 */
export function useStepper(
  target: RefObject<Element | null>,
  count: number,
  { interval = 1100, pause = 1600, hold }: { interval?: number; pause?: number; hold?: number } = {},
) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const visible = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    const el = target.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.25 });
    io.observe(el);

    let timer = 0;
    let cur = 0;
    const tick = () => {
      const wait = cur === count - 1 ? pause : interval;
      timer = window.setTimeout(() => {
        if (visible.current && !document.hidden && hold === undefined) {
          cur = (cur + 1) % count;
          setStep(cur);
        }
        tick();
      }, wait);
    };
    tick();
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [target, count, interval, pause, hold]);

  return { step: hold ?? step, done };
}

/** data-state for node i given the current step: idle before it, active on it, done after. */
export function stateOf(i: number, step: number, done: boolean) {
  if (done) return "done";
  return i === step ? "active" : i < step ? "done" : "idle";
}
