"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { MENTORING } from "@/lib/data/catalog";
import { AdvisoryWeek } from "@/components/illustration/AdvisoryWeek";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import mentoringPhoto from "@/public/images/photos/one-to-one-mentoring.webp";
import { Chapter } from "./Chapter";

/**
 * One-to-one mentoring, presented as sessions chosen by the length of the problem: each card
 * carries its length, who it is for, what you leave with, its live price and the way to
 * request a time. Beside them, a photograph of the work and the drawn week that shows when
 * sessions usually run; pointing at (or tabbing to) a session marks its slot on that week.
 */
const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

/** `prices` maps product SKUs (mentoring-<id>) to the active price in paise; sessions without an active product are not shown. */
export function Mentoring({ prices, content: c }: { prices: Record<string, number>; content: PageContent<typeof homePage>["mentoring"] }) {
  const sessions = MENTORING.filter((m) => prices[`mentoring-${m.id}`] !== undefined);
  const [focus, setFocus] = useState<number | null>(null);

  return (
    <Chapter id="mentoring" folio="07" title={c.runningHead} surface="tint">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
        <div>
          <h2 data-reveal className="max-w-[22ch] text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.1]">
            {c.title}
          </h2>
          <p data-reveal className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-muted-foreground">
            {c.lead}
          </p>

          <ul data-reveal-group className="mt-10 grid gap-4 sm:grid-cols-2" onMouseLeave={() => setFocus(null)}>
            {sessions.map((m, i) => (
              <li key={m.id} data-reveal-item onMouseEnter={() => setFocus(i)} onFocus={() => setFocus(i)} onBlur={() => setFocus(null)}>
                <Link href={`/mentoring#${m.id}`} data-interactive className="site-card group flex h-full flex-col p-6">
                  <span className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[12.5px] font-semibold text-accent-foreground">
                      <Clock aria-hidden className="h-3.5 w-3.5" />
                      {m.minutes} {c.minutesLabel}
                    </span>
                    <span className="tabular text-[17px] font-bold">{inr(prices[`mentoring-${m.id}`])}</span>
                  </span>
                  <span className="mt-4 text-[18px] font-bold tracking-[-0.01em]">{m.name}</span>
                  <span className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{m.who}</span>
                  <span className="mt-4 border-t border-border pt-4 text-[14px] leading-relaxed text-secondary-foreground">
                    <span className="mb-1 block text-[11.5px] font-bold uppercase tracking-[0.06em] text-subtle">{c.leaveWithLabel}</span>
                    {m.leaveWith}.
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[14.5px] font-semibold text-brand">
                    {c.requestLabel}
                    <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <figure data-reveal className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
            <Image src={mentoringPhoto} alt="Two colleagues working through a problem together at a laptop" fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" placeholder="blur" />
          </figure>
          <div className="site-card env-paper p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-subtle">{c.calendarLabel}</p>
            <AdvisoryWeek className="mt-3" focus={focus} />
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{c.calendarNote}</p>
          </div>
        </div>
      </div>
    </Chapter>
  );
}
