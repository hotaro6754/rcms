"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP, SplitText, ScrollTrigger } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { ClaimDocument } from "@/components/illustration/ClaimDocument";
import { introDone } from "@/lib/intro";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";

/**
 * The hero.
 *
 * Left: what the Academy is, in one headline, one paragraph and two actions. Right: the
 * claim, the revenue cycle's one real artefact, filled in stage by stage as it goes round
 * (components/illustration/ClaimDocument.tsx).
 *
 * The headline is on screen within about a second of the page (or the preloader) letting
 * go: four lines rise in quick succession and the two emphasised words fill with the accent.
 * The illustration builds in parallel, never first. Resting state is the finished headline,
 * so without JavaScript or under reduced motion there is nothing to wait for.
 *
 * No sky, no blobs, no grain behind it: a plain desk, so the one warm object on screen is
 * the claim. The hero ends on a hairline, the way a page ends, not on a decorative wave.
 */
export function HeroSequence({ content: c }: { content: PageContent<typeof homePage>["hero"] }) {
  const root = useRef<HTMLDivElement>(null);

  // The scroll cue retires as soon as the reader starts scrolling.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cue = el.querySelector<HTMLElement>(".scroll-cue");
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => {
        if (cue) cue.style.opacity = String(Math.max(0, 1 - self.progress * 6));
      },
    });
    return () => st.kill();
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      let split: SplitText | null = null;
      let cancelled = false;

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(el);
        const h1 = q("h1")[0];
        const rest = q(".hero-after");
        // Hidden before first paint; the reveal below brings them back.
        gsap.set([h1, ...rest], { autoAlpha: 0 });
        gsap.set(rest, { y: 10 });

        const fonts = document.fonts?.ready ?? Promise.resolve();
        Promise.all([fonts, introDone()]).then(() => {
          if (cancelled) return;
          // One split against the real font metrics. Each phrase is a single short line.
          split = SplitText.create(q(".hero-phrase"), { type: "lines", mask: "lines", linesClass: "hero-line", aria: "none" });
          const lines = split.lines as HTMLElement[];
          gsap.set(h1, { autoAlpha: 1 });
          gsap.set(lines, { yPercent: 108 });

          // The two emphasised words fill left to right with the brand colour.
          const fills = q(".hero-accent .hero-line").map((line) => {
            const st = (line as HTMLElement).style;
            st.backgroundImage = "linear-gradient(90deg, var(--brand) 50%, var(--foreground) 50%)";
            st.backgroundSize = "200% 100%";
            st.backgroundPosition = "100% 0";
            st.setProperty("-webkit-background-clip", "text");
            st.backgroundClip = "text";
            st.color = "transparent";
            return line;
          });

          gsap
            .timeline({ defaults: { ease: EASE.exec } })
            .to(lines, { yPercent: 0, duration: 0.7, stagger: 0.09 }, 0.05)
            .to(fills, { backgroundPosition: "0% 0", duration: 0.8, stagger: 0.12 }, 0.35)
            .to(rest, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.4);
        });

        return () => {
          cancelled = true;
          split?.revert();
          split = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} data-gsap-scope className="hero-root relative border-b border-border bg-background">
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-6 pb-14 pt-24 lg:min-h-[100svh] lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16 lg:pb-16">
        <div>
          <h1 className="text-[clamp(2.5rem,min(5vw,8.4vh),4.75rem)] leading-[1.02]">
            <span className="hero-phrase block w-fit whitespace-nowrap">{c.line1}</span>
            <span className="hero-phrase hero-accent block w-fit whitespace-nowrap pb-[0.06em] italic">
              {c.line2}
            </span>
            <span className="hero-phrase mt-2 block w-fit whitespace-nowrap">{c.line3}</span>
            <span className="hero-phrase hero-accent block w-fit whitespace-nowrap pb-[0.06em] italic">
              {c.line4}
            </span>
          </h1>

          <p className="hero-after mt-7 max-w-[40ch] text-[16px] leading-relaxed text-secondary-foreground">
            {c.lead}
          </p>

          <div className="hero-after mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <SiteLink
              link={c.primary}
              className="inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            />
            <SiteLink
              link={c.secondary}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline decoration-input underline-offset-[6px] transition-colors hover:decoration-foreground"
            />
          </div>

          {/* File metadata: the hero reads as the first page of a case file. */}
          <dl className="hero-after text-data mt-14 grid max-w-[26rem] grid-cols-3 gap-4 border-t border-border pt-4 text-[11px] leading-snug">
            {c.facts.map((f, i) => (
              <div key={i}>
                <dt className="text-subtle">{f.label}</dt>
                <dd className="mt-1">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The Academy's signature visual: one claim, filled in as it moves round the cycle. */}
        <ClaimDocument className="w-full" />
      </div>

      {c.scrollCue.label.trim() && (
        <SiteLink
          link={c.scrollCue}
          className="scroll-cue absolute bottom-5 left-6 hidden items-center gap-2 text-data text-[11px] tracking-[0.08em] text-subtle transition-colors hover:text-foreground lg:flex xl:left-[max(1.5rem,calc((100vw-1320px)/2+1.5rem))]"
        >
          {c.scrollCue.label} <span aria-hidden="true">↓</span>
        </SiteLink>
      )}
    </div>
  );
}
