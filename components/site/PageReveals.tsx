"use client";

import { gsap, useGSAP } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";

/**
 * Page-wide entrances for anything marked [data-reveal]: headings, kickers, leads. Each rises
 * a little and fades in once, as it first comes into view, and then stays. It never reverses:
 * a heading that disappears behind the reader leaves a section looking empty on the way back.
 *
 * Mounted once per page. Under reduced motion nothing is hidden in the first place.
 */
export function PageReveals() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
        gsap.from(node, {
          y: 22,
          autoAlpha: 0,
          duration: 0.6,
          ease: EASE.exec,
          scrollTrigger: { trigger: node, start: "top 90%", once: true },
        });
      });
    });
    return () => mm.revert();
  });
  return null;
}
