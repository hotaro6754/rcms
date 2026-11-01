"use client";

import { gsap, useGSAP } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";

/**
 * Page-wide entrances, once each, as content first comes into view:
 *
 *   [data-reveal]        headings and introductions rise a little and fade in;
 *   [data-reveal-group]  its [data-reveal-item] children (cards, rows) follow in a short stagger.
 *
 * Distances are small and durations short so nothing is ever waited for, and an entrance never
 * reverses: a heading that disappears behind the reader leaves a section looking empty on the
 * way back. Under reduced motion nothing is hidden in the first place.
 */
export function PageReveals() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
        gsap.from(node, {
          y: 14,
          autoAlpha: 0,
          duration: 0.5,
          ease: EASE.exec,
          scrollTrigger: { trigger: node, start: "top 90%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
        const items = group.querySelectorAll<HTMLElement>("[data-reveal-item]");
        if (!items.length) return;
        gsap.from(items, {
          y: 16,
          autoAlpha: 0,
          duration: 0.5,
          ease: EASE.exec,
          stagger: 0.06,
          clearProps: "transform",
          scrollTrigger: { trigger: group, start: "top 86%", once: true },
        });
      });
    });
    return () => mm.revert();
  });
  return null;
}
