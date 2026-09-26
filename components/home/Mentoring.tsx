"use client";

import { useState } from "react";
import Link from "next/link";
import { MENTORING, inr } from "@/lib/data/catalog";
import { AdvisoryWeek } from "@/components/illustration/AdvisoryWeek";

/**
 * From system to person. Mentoring is presented as time in someone's advisory calendar,
 * not a pricing table: each session is a line with its length, who it is for and what you
 * walk out holding. The drawn week shows when sessions actually run; the rows carry the facts.
 * Pointing at (or tabbing to) a session shows it on the calendar: its slot, and its length.
 */
export function Mentoring() {
  const [focus, setFocus] = useState<number | null>(null);
  return (
    <section id="mentoring" className="border-t border-border">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 lg:py-32">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative -rotate-[0.5deg] overflow-hidden rounded-[6px] border border-border bg-[#fcfaf5] p-5 shadow-[0_1px_2px_rgb(22_21_19/0.05),0_24px_48px_-24px_rgb(22_21_19/0.35)]">
            <div aria-hidden="true" className="grain absolute inset-0 !opacity-[0.1]" />
            <p className="text-data relative text-[10.5px] tracking-[0.14em] text-muted-foreground">ADVISORY CALENDAR · IST</p>
            <AdvisoryWeek className="mt-3" focus={focus} />
          </div>
          <p className="mt-4 max-w-[40ch] text-micro leading-relaxed text-subtle">
            One-to-one, on video, in the evenings and on Saturday mornings to fit US-shift
            schedules.
          </p>
        </div>

        <div>
          <p data-reveal className="label-caps flex items-center gap-3">
            <span className="text-brand">07</span>
            <span aria-hidden="true" className="h-px w-8 bg-input" />
            1:1 mentoring
          </p>
          <h2 data-reveal className="mt-6 max-w-[18ch] text-[clamp(2.3rem,4.4vw,3.8rem)] leading-[1.02]">
            The fastest way to understand operations is to <em>talk to someone who has run one.</em>
          </h2>

          <ul className="mt-12 border-t border-border" onMouseLeave={() => setFocus(null)}>
            {MENTORING.map((m, i) => (
              <li key={m.id} className="border-b border-border" onMouseEnter={() => setFocus(i)} onFocus={() => setFocus(i)} onBlur={() => setFocus(null)}>
                <Link
                  href={`/mentoring#${m.id}`}
                  className={`group grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-5 gap-y-3 py-7 transition-colors duration-[var(--dur-med)] sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:px-3 ${focus === i ? "bg-accent/50" : ""}`}
                >
                  <span className="flex flex-col">
                    <span className={`font-serif-display text-[2.6rem] leading-none transition-colors duration-[var(--dur-med)] ${focus === i ? "text-brand" : ""}`}>{m.minutes}</span>
                    <span className="label-caps mt-1 text-[11px]">minutes</span>
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[17px] font-medium">{m.name}</span>
                    <span className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{m.who}</span>
                    <span className="mt-3 text-[13px] leading-relaxed text-secondary-foreground">
                      <span className="italic text-brand">You leave with </span>
                      {m.leaveWith.charAt(0).toLowerCase() + m.leaveWith.slice(1)}.
                    </span>
                  </span>
                  <span className="col-start-2 flex items-center gap-3 sm:col-start-auto sm:flex-col sm:items-end sm:justify-between">
                    <span className="text-data text-[15px] font-medium">{inr(m.price)}</span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                      Request a time
                      <span aria-hidden="true" className="transition-transform duration-[var(--dur-med)] group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
