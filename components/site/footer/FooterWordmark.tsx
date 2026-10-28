"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap/register";

/**
 * The name, set as wide as the page and cut off by its bottom edge, the way a masthead
 * runs off a printed sheet. As the footer comes into view the letters rise into place,
 * tied to the scroll.
 *
 * GSAP owns the letters. Under reduced motion they are simply there.
 */
export function FooterWordmark({ text }: { text: string }) {
  const root = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create(word.current, { type: "chars", aria: "none" });
        gsap.fromTo(
          split.chars,
          { yPercent: 70 },
          {
            yPercent: 0,
            ease: "none",
            stagger: 0.06,
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
          },
        );
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} data-gsap-scope aria-hidden="true" className="relative mt-16 h-[clamp(5.5rem,17vw,19rem)] overflow-hidden">
      <p
        ref={word}
        className="font-serif-display absolute inset-x-0 top-0 select-none whitespace-nowrap pt-[0.06em] text-center text-[clamp(7rem,23vw,26rem)] leading-[0.9] tracking-[-0.05em] text-foreground"
      >
        {text}
      </p>
    </div>
  );
}
