"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { ClaimDocument } from "@/components/illustration/ClaimDocument";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";

/**
 * The hero.
 *
 * Left: what RCMExcel is, in a label, a two-line headline, one paragraph, two actions and the
 * case file's details. Right: Claim #20481, the revenue cycle's one real artefact, filled in
 * stage by stage (components/illustration/ClaimDocument.tsx) — the walkthrough the rest of the
 * page keeps returning to.
 *
 * The copy is on screen at once. With motion allowed it rises into place in well under a
 * second; nothing waits for a preloader and there is no scroll prompt. Without JavaScript or
 * under reduced motion the resting state is simply the finished hero.
 */
export function HeroSequence({ content: c }: { content: PageContent<typeof homePage>["hero"] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Movement only: the copy is never hidden, so a slow or throttled frame can't blank the hero.
        gsap.from(gsap.utils.toArray<HTMLElement>(".hero-in", root.current), {
          y: 12,
          duration: 0.55,
          ease: EASE.exec,
          stagger: 0.06,
          clearProps: "all",
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative border-b border-border bg-background">
      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pb-20 lg:pt-32">
        <div>
          {c.eyebrow && <p className="hero-in eyebrow">{c.eyebrow}</p>}
          <h1 className="hero-in mt-4 text-[clamp(2.4rem,5vw,4rem)] leading-[1.04]">
            <span className="block">
              {c.line1} <em>{c.line2}</em>
            </span>
            <span className="block">
              {c.line3} <em>{c.line4}</em>
            </span>
          </h1>

          <p className="hero-in mt-6 max-w-[46ch] text-[17px] leading-relaxed text-secondary-foreground">{c.lead}</p>

          <div className="hero-in mt-8 flex flex-wrap items-center gap-3">
            <SiteLink
              link={c.primary}
              className="group inline-flex min-h-12 items-center gap-2 rounded-md bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {c.primary.label}
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </SiteLink>
            <SiteLink
              link={c.secondary}
              className="inline-flex min-h-12 items-center rounded-md border border-input bg-background px-5 text-[15px] font-semibold text-foreground transition-colors hover:border-foreground/40 hover:bg-muted"
            />
          </div>

          {/* The case file's details: the claim on the right is a real teaching record. */}
          {c.facts.length > 0 && (
            <dl className="hero-in mt-12 grid max-w-[30rem] grid-cols-3 divide-x divide-border rounded-lg border border-border bg-card">
              {c.facts.map((f, i) => (
                <div key={i} className="px-4 py-3">
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-subtle">{f.label}</dt>
                  <dd className="tabular mt-1 text-[14.5px] font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <ClaimDocument className="hero-in w-full" />
      </div>
    </div>
  );
}
