import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicLevel } from "@/lib/services/learning/public-catalog";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import session from "@/public/images/photos/professional-learning-session.webp";
import { Chapter } from "./Chapter";

/**
 * The learning levels, as a progression of three cards.
 *
 * Each card is one published level: its name and title, the outcome, who it is for, its core
 * topics, the released courses with their live prices, the typical effort and the way into
 * the catalogue. Levels, courses and prices come from the CMS and the product catalogue, so
 * this section never advertises something that cannot be bought. A level's colour runs along
 * the top of its card, and on wide screens a connector between the cards reads "each level is
 * built on the one before".
 *
 * Long topic lists show the first five; the rest stay one click away, never removed.
 * Cards enter once in a short stagger (PageReveals) and lift slightly on hover (.site-card).
 */
type Content = PageContent<typeof homePage>["path"];

const NUMBER: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six" };
const ACCENT = ["var(--level-trainee)", "var(--level-professional)", "var(--level-leadership)"];
const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");
const SHOWN = 5;

export function LearningPath({ levels, content: c }: { levels: PublicLevel[]; content: Content }) {
  const count = levels.length ? `${NUMBER[levels.length] ?? levels.length} ${c.countLine}` : c.countLine.charAt(0).toUpperCase() + c.countLine.slice(1);
  return (
    <Chapter id="tracks" folio="03" title={c.runningHead} surface="tint">
      <span id="programs" className="sr-only" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <div>
          <h2 data-reveal className="max-w-[24ch] text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.1]">
            {c.title}
          </h2>
          <p data-reveal className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-muted-foreground">
            {count} {c.lead}
          </p>
          <div data-reveal className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <SiteLink link={c.compare} className="group inline-flex min-h-11 items-center gap-1.5 text-[15px] font-semibold text-brand hover:underline hover:underline-offset-4">
              {c.compare.label}
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </SiteLink>
            <SiteLink link={c.notSure} className="inline-flex min-h-11 items-center text-[15px] font-medium text-foreground underline decoration-input underline-offset-4 hover:decoration-foreground" />
          </div>
        </div>
        <figure data-reveal className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
          <Image src={session} alt="A trainer presenting to colleagues in an office training room" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" placeholder="blur" />
        </figure>
      </div>

      {levels.length === 0 ? (
        <p className="mt-12 text-[15px] text-muted-foreground">
          {c.unavailable} <SiteLink link={c.unavailableLink} className="font-medium underline underline-offset-4" />
          {c.unavailableAfter && ` ${c.unavailableAfter}`}
        </p>
      ) : (
        <ol data-reveal-group className="relative mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {levels.map((lv, i) => (
            <LevelCard key={lv.slug} level={lv} index={i} total={levels.length} c={c} last={i === levels.length - 1} />
          ))}
        </ol>
      )}
    </Chapter>
  );
}

function LevelCard({ level, index, total, c, last }: { level: PublicLevel; index: number; total: number; c: Content; last: boolean }) {
  const accent = ACCENT[index] ?? "var(--brand)";
  const topics = level.coreTopics;
  return (
    <li data-reveal-item className="relative">
      <article data-interactive aria-labelledby={`level-${level.slug}`} className="site-card flex h-full flex-col overflow-hidden">
        <span aria-hidden="true" className="h-1.5 w-full" style={{ background: accent }} />
        <div className="flex flex-1 flex-col p-6 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
              Level {String(index + 1).padStart(2, "0")} of {total}
            </p>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-subtle">{level.displayTitle}</p>
          </div>
          <h3 id={`level-${level.slug}`} className="mt-4 text-[1.9rem] font-bold leading-none tracking-[-0.025em]">
            {level.name}
          </h3>
          <p className="mt-3 text-[16px] font-medium leading-snug">{level.shortDescription}</p>
          {level.audience && <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{level.audience}</p>}

          {topics.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <ul className="grid gap-2 text-[14px] leading-snug text-secondary-foreground">
                {topics.slice(0, SHOWN).map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                    {t}
                  </li>
                ))}
              </ul>
              {topics.length > SHOWN && (
                <details className="group mt-2">
                  <summary className="inline-flex min-h-9 cursor-pointer list-none items-center text-[13.5px] font-semibold text-brand [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">and {topics.length - SHOWN} {c.moreTopics}</span>
                    <span className="hidden group-open:inline">Show fewer</span>
                  </summary>
                  <ul className="grid gap-2 text-[14px] leading-snug text-secondary-foreground">
                    {topics.slice(SHOWN).map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-border pt-5">
            {level.courses.length ? (
              <ul className="grid gap-2 text-[14px]">
                {level.courses.map((course) => (
                  <li key={course.slug} className="flex items-baseline justify-between gap-3">
                    <Link href={`/catalog/${course.slug}`} className="font-medium text-foreground underline decoration-input underline-offset-4 hover:decoration-foreground">
                      {course.name}
                    </Link>
                    <span className="tabular shrink-0 font-semibold">
                      {course.isFree ? c.freeLabel : course.price !== null ? inr(course.price) : <span className="font-normal text-subtle">{c.includedLabel}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-muted-foreground">{c.notReleased}</p>
            )}
            {level.estimatedEffort && (
              <p className="mt-3 text-[13px] text-subtle">
                {c.effortLabel} {level.estimatedEffort}
              </p>
            )}
          </div>

          <div className="mt-auto pt-6">
            <Link
              href={`/catalog?level=${level.slug}`}
              className="group flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              {c.coursesButton}
              <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </article>
      {!last && (
        <span aria-hidden="true" className="absolute -right-[18px] top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-subtle shadow-sm lg:flex">
          <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </li>
  );
}
