"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import l from "./lively.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * One illustration from the RCMExcel set, framed as a rounded plate. It opens from a slightly
 * inset clip as it enters the viewport, and the picture drifts a little against the frame while
 * the reader scrolls. Static under reduced motion.
 */
export function ArtPlate({
  src,
  alt,
  ratio = "4 / 3",
  className,
  sizes = "(min-width: 1080px) 50vw, 100vw",
  children,
}: {
  src: StaticImageData;
  alt: string;
  ratio?: string;
  className?: string;
  sizes?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = ref.current;
        if (!el) return;
        gsap.fromTo(
          el,
          { clipPath: "inset(8% 6% 8% 6% round 36px)" },
          { clipPath: "inset(0% 0% 0% 0% round 24px)", duration: 1.3, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } },
        );
        gsap.fromTo(
          el.querySelector("img"),
          { yPercent: -2.5 },
          { yPercent: 2.5, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } },
        );
      });
    },
    { scope: ref },
  );
  return (
    <figure ref={ref} className={`${l.plate} ${className ?? ""}`} style={{ aspectRatio: ratio }}>
      <Image src={src} alt={alt} fill sizes={sizes} placeholder="blur" className={l.plateImg} />
      {children}
    </figure>
  );
}
