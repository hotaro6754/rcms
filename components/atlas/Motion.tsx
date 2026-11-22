"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * Scroll motion for the homepage below the hero, driven by data attributes so the page stays a
 * server component:
 *   [data-reveal]       fades and rises in as it enters (batched)
 *   [data-scrub-words]  words light up one by one as the reader scrolls through
 *   [data-h-pin]        pins the section and scrolls its [data-h-track] sideways (desktop)
 *   [data-rise]         children grow up from the baseline (charts, the career ladder)
 *   [data-draw]         SVG strokes draw themselves
 *   [data-count]        numbers count up to their value
 *   [data-spin]         flair shapes turn with scroll
 * Nothing runs for reduced-motion users; content is visible by default.
 */
export function Motion() {
  const dummy = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set("[data-reveal]", { y: 34, opacity: 0 });
      ScrollTrigger.batch("[data-reveal]", {
        start: "top 88%",
        onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.08, overwrite: true }),
      });

      gsap.utils.toArray<HTMLElement>("[data-scrub-words]").forEach((el) => {
        const split = SplitText.create(el, { type: "words", wordsClass: "sw" });
        gsap.to(split.words, {
          opacity: 1,
          stagger: 0.1,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 40%", scrub: true },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) => {
        gsap.from(el.children, {
          scaleY: 0,
          transformOrigin: "50% 100%",
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.07,
          scrollTrigger: { trigger: el, start: "top 80%" },
        });
      });

      gsap.utils.toArray<SVGGeometryElement>("[data-draw]").forEach((el) => {
        const len = el.getTotalLength();
        gsap.fromTo(el, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut", scrollTrigger: { trigger: el, start: "top 85%" } });
      });

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const to = Number(el.dataset.count);
        const dec = Number(el.dataset.dec ?? 0);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: to,
          duration: 1.6,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => {
            el.textContent = obj.v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-spin]").forEach((el, i) => {
        gsap.to(el, { rotate: i % 2 ? -180 : 180, y: -60, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 } });
      });
    });

    mm.add("(prefers-reduced-motion: no-preference) and (min-width: 980px)", () => {
      gsap.utils.toArray<HTMLElement>("[data-h-pin]").forEach((section) => {
        const track = section.querySelector<HTMLElement>("[data-h-track]");
        if (!track) return;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: section, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true },
        });
      });
    });
  });

  return <span ref={dummy} hidden />;
}
