"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";
import type { PublicLevel } from "@/lib/services/learning/public-catalog";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import { Chapter } from "./Chapter";
import { cn } from "@/lib/utils";

/**
 * The path, set as a prospectus.
 *
 * The published learning levels, each a full ruled spread in normal document flow: the level
 * set large, the outcome, who it is for, its core topics, and the released courses with their
 * live prices. Levels, courses and prices come from the CMS and the product catalogue, so
 * this section never advertises something that cannot be bought. Nothing pins and nothing
 * snaps; the page scrolls at the reader's pace.
 *
 * Desktop: an index of the levels sits in the margin and stays in view. A line beside it
 * fills continuously with the reader's progress through the chapter, and the level being
 * read is lit. Clicking a level scrolls to it.
 *
 * GSAP owns the index line (scrubbed) and each spread's one-time entrance. CSS owns the
 * index colours.
 */
type Content = PageContent<typeof homePage>["path"];

export function LearningPath({ levels, content: c }: { levels: PublicLevel[]; content: Content }) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const spreads = gsap.utils.toArray<HTMLElement>("[data-level]", root.current);
      const triggers = spreads.map((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => self.isActive && setActive(i),
        }),
      );

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          fill.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top 55%", end: "bottom 55%", scrub: 0.4 },
          },
        );
        spreads.forEach((el) => {
          const parts = el.querySelectorAll("[data-part]");
          gsap.from(parts, {
            y: 18,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.07,
            scrollTrigger: { trigger: el, start: "top 78%", once: true },
          });
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(fill.current, { scaleY: 1 });
      });
      return () => {
        triggers.forEach((t) => t.kill());
        mm.revert();
      };
    },
    { scope: root },
  );

  const goTo = (i: number) => {
    const el = root.current?.querySelector<HTMLElement>(`[data-level="${i}"]`);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
  };

  return (
    <Chapter id="tracks" folio="03" title={c.runningHead} surface="sheet">
      <span id="programs" className="sr-only" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-end">
        <h2 data-reveal className="max-w-[20ch] text-[clamp(2.2rem,3.8vw,3.4rem)] leading-[1.04]">
          {c.title}
        </h2>
        <p data-reveal className="text-[15px] leading-relaxed text-muted-foreground">
          {levels.length ? `${NUMBER[levels.length] ?? levels.length} ${c.countLine}` : c.countLine.charAt(0).toUpperCase() + c.countLine.slice(1)} {c.lead}
        </p>
      </div>

      <div ref={root} className="mt-20 grid gap-x-16 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {/* The index: desktop only, stays in the margin while the spreads scroll. */}
        <nav aria-label="Levels" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-data text-[10.5px] tracking-[0.14em] text-subtle">{c.indexLabel}</p>
            <div className="relative mt-5">
              <span aria-hidden="true" className="absolute inset-y-1 left-0 w-px bg-border" />
              <span ref={fill} aria-hidden="true" className="absolute inset-y-1 left-0 w-px origin-top scale-y-0 bg-foreground" />
              <ol className="flex flex-col">
                {levels.map((l, i) => (
                  <li key={l.slug}>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={i === active ? "step" : undefined}
                      className="group flex w-full items-baseline gap-3 py-2 pl-5 text-left"
                    >
                      <span className={cn("text-data w-5 text-[10.5px] transition-colors", i === active ? "text-brand" : "text-subtle")}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "font-serif-display text-[1.45rem] leading-none transition-colors duration-300",
                          i === active ? "text-foreground" : "text-foreground/60 group-hover:text-foreground/80",
                        )}
                      >
                        {l.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <SiteLink
              link={c.compare}
              className="mt-8 inline-flex min-h-10 items-center pl-5 text-[13px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
            />
          </div>
        </nav>

        <div className="flex flex-col gap-20 lg:gap-28">
          {levels.length === 0 && (
            <p className="text-[15px] text-muted-foreground">
              {c.unavailable} <SiteLink link={c.unavailableLink} className="underline underline-offset-4" />
              {c.unavailableAfter && ` ${c.unavailableAfter}`}
            </p>
          )}
          {levels.map((lv, i) => (
            <LevelSpread key={lv.slug} level={lv} index={i} total={levels.length} c={c} />
          ))}
        </div>
      </div>
    </Chapter>
  );
}

const NUMBER: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six" };

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

function LevelSpread({ level, index, total, c }: { level: PublicLevel; index: number; total: number; c: Content }) {
  const n = index + 1;
  const topics = level.coreTopics;
  return (
    <article data-level={index} aria-labelledby={`level-${level.slug}`} className="border-t-2 border-foreground pt-6">
      <div data-part className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
          LEVEL <span className="text-foreground">{String(n).padStart(2, "0")}</span> OF {total}
        </p>
        <p className="text-data text-[11px] tracking-[0.12em] text-subtle">{level.displayTitle.toUpperCase()}</p>
      </div>

      <div className="mt-6 grid gap-x-12 gap-y-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <h3
          id={`level-${level.slug}`}
          data-part
          className="font-serif-display text-[clamp(3.4rem,6.4vw,5.6rem)] leading-[0.9] tracking-[-0.03em]"
        >
          {level.name}
        </h3>
        <div data-part>
          <p className="font-serif-display text-[clamp(1.4rem,2vw,1.8rem)] leading-snug">{level.shortDescription}</p>
          {level.audience && <p className="mt-4 text-[14.5px] leading-relaxed text-muted-foreground">{level.audience}</p>}
        </div>
      </div>

      <ol data-part className="mt-10 grid gap-x-10 border-t border-border sm:grid-cols-2">
        {topics.map((m, k) => (
          <li
            key={m}
            className={cn(
              "flex gap-4 border-b border-border py-3 text-[14px] leading-snug text-secondary-foreground",
              k >= 4 && "max-sm:hidden",
            )}
          >
            <span className="text-data w-5 shrink-0 pt-px text-[10.5px] text-subtle">{String(k + 1).padStart(2, "0")}</span>
            {m}
          </li>
        ))}
      </ol>
      {topics.length > 4 && <p className="mt-3 text-[13px] text-subtle sm:hidden">and {topics.length - 4} {c.moreTopics}</p>}

      <div data-part className="mt-7 flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        {level.courses.length ? (
          <ul className="flex flex-col gap-1 text-[14px] text-muted-foreground">
            {level.courses.map((course) => (
              <li key={course.slug}>
                <Link href={`/catalog/${course.slug}`} className="text-foreground underline decoration-input underline-offset-[5px] hover:decoration-foreground">
                  {course.name}
                </Link>
                <span className="text-data">
                  {" "}
                  · {course.isFree ? c.freeLabel : course.price !== null ? inr(course.price) : c.includedLabel}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">{c.notReleased}</p>
        )}
        <div className="flex items-center gap-6">
          <SiteLink
            link={c.notSure}
            className="hidden min-h-11 items-center text-[13.5px] underline decoration-input underline-offset-[6px] hover:decoration-foreground sm:inline-flex"
          />
          <Link
            href={`/catalog?level=${level.slug}`}
            className="inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {c.coursesButton}
          </Link>
        </div>
      </div>
      {level.estimatedEffort && <p className="mt-3 text-[12.5px] text-subtle">{c.effortLabel} {level.estimatedEffort}</p>}
    </article>
  );
}
