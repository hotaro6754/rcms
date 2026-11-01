"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap/register";
import progression from "@/public/images/figma/career-progression-guidance.webp";
import { METRICS, PERIODS, formatValue } from "@/lib/data/telemetry";
import type { PageContent } from "@/lib/site/fields";
import type { homePage } from "@/lib/site/pages/home";
import { Chapter } from "./Chapter";

const W = 132;
const H = 36;

/** A metric's six periods as a line, scaled into a small box. */
function spark(series: number[]) {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  return series
    .map((v, i) => `${i === 0 ? "M" : "L"} ${((i / (series.length - 1)) * W).toFixed(1)} ${(H - 3 - ((v - min) / span) * (H - 6)).toFixed(1)}`)
    .join(" ");
}

/**
 * THE PEOPLE BEHIND EVERY NUMBER. Six levels of career progression, set as a table: level,
 * role, what the role owns, the measure it answers for (from the same teaching data the rest
 * of the page uses) and its current value. Pointing at or tabbing to a row turns it navy and
 * draws that measure's trend, so a reader sees what changes as you climb: the number you
 * answer for. An illustration of the climb (made with Figma) sits beside the statement.
 *
 * GSAP owns the one-time entrance: the rows rise in turn, each resting trend line draws itself
 * and each value counts up once. CSS owns hover and focus. Nothing is tied to scroll position.
 */
export function Leadership({ content: c }: { content: PageContent<typeof homePage>["people"] }) {
  const roles = c.roles;
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);
        const tl = gsap.timeline({ scrollTrigger: { trigger: q(".ledger")[0], start: "top 90%", once: true } });
        tl.from(q(".ledger-rule"), { scaleX: 0, transformOrigin: "left center", duration: 0.7, ease: "power3.inOut" })
          .from(q(".row"), { y: 22, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }, "-=0.45")
          .from(q(".rest-line"), { drawSVG: "0%", duration: 1.1, ease: "power2.inOut", stagger: 0.08 }, "<0.15");
        q(".now").forEach((el, i) => {
          const m = METRICS[roles[i].metric];
          const box = { v: 0 };
          tl.to(box, { v: m.current, duration: 1.2, ease: "power2.out", onUpdate: () => void (el.textContent = formatValue(m, box.v)) }, 0.35 + i * 0.08);
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Chapter id="people" folio="06" title={c.runningHead}>
      <div ref={root} data-gsap-scope>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
        <h2 data-reveal className="statement max-w-[24ch] text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.1]">
          {c.statement} <span className="second text-muted-foreground">{c.statementSecond}</span>
        </h2>
        <figure data-reveal className="overflow-hidden rounded-xl border border-border bg-[#f6f8fb]">
          <Image src={progression} alt="" sizes="(min-width: 1024px) 40vw, 100vw" className="h-auto w-full" />
        </figure>
      </div>

      <div className="ledger site-card relative mt-12 overflow-hidden">
        <span aria-hidden="true" className="ledger-rule absolute inset-x-0 top-0 h-1 bg-brand" />
        <div className="hidden grid-cols-[3rem_minmax(0,1.3fr)_minmax(0,1fr)_9rem_6rem] gap-6 border-b border-border bg-muted px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-subtle md:grid">
          <span>LEVEL</span>
          <span>ROLE</span>
          <span>OWNS</span>
          <span>{PERIODS[0].toUpperCase()} → {PERIODS[PERIODS.length - 1].toUpperCase()}</span>
          <span className="text-right">NOW</span>
        </div>
        <ol>
          {roles.map((r, i) => {
            const m = METRICS[r.metric];
            const d = spark(m.series);
            return (
              <li
                key={i}
                tabIndex={0}
                className="row group grid grid-cols-[2.25rem_minmax(0,1fr)_5.5rem] items-center gap-x-4 gap-y-2 border-b border-border px-5 py-5 outline-none transition-colors duration-[var(--dur-med)] hover:bg-[#13235b] hover:text-white focus-visible:bg-[#13235b] focus-visible:text-white md:grid-cols-[3rem_minmax(0,1.3fr)_minmax(0,1fr)_9rem_6rem] md:gap-x-6"
              >
                <span className="text-data text-[12px] text-subtle transition-colors group-hover:text-[#6fd3c9] group-focus-visible:text-[#6fd3c9]">
                  {r.level}
                </span>
                <span className="text-[clamp(1.15rem,1.6vw,1.4rem)] font-bold leading-tight tracking-[-0.015em]">
                  {r.role}
                </span>
                <span className="col-start-2 row-start-2 text-[14px] leading-snug text-muted-foreground transition-colors group-hover:text-[#cdd6e6] group-focus-visible:text-[#cdd6e6] md:col-start-auto md:row-start-auto">
                  {r.owns}
                  <span className="text-data mt-1 block text-[12px] text-subtle group-hover:text-[#a9b5cb] group-focus-visible:text-[#a9b5cb]">{m.label}</span>
                </span>
                <svg
                  viewBox={`-2 -2 ${W + 4} ${H + 4}`}
                  className="col-start-3 row-start-2 h-8 w-full overflow-visible md:col-start-auto md:row-start-auto md:h-9 md:w-[9rem]"
                  role="img"
                  aria-label={`${m.label}, ${PERIODS[0]} to ${PERIODS[PERIODS.length - 1]}: ${m.series.join(", ")}`}
                >
                  <path d={d} fill="none" stroke="currentColor" strokeWidth={1.25} className="rest-line text-input group-hover:opacity-0 group-focus-visible:opacity-0" />
                  <path
                    d={d}
                    fill="none"
                    stroke="#6fd3c9"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={100}
                    strokeDasharray="100 100"
                    className="[stroke-dashoffset:100] transition-[stroke-dashoffset] duration-[900ms] ease-[var(--ease-exec)] group-hover:[stroke-dashoffset:0] group-focus-visible:[stroke-dashoffset:0]"
                  />
                </svg>
                <span className="now text-data col-start-3 row-start-1 text-right text-[15px] tabular-nums md:col-start-auto md:row-start-auto">
                  {formatValue(m)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="border-t border-border px-5 py-3 text-[12.5px] text-subtle">Teaching data, one engagement, {PERIODS[0]} to {PERIODS[PERIODS.length - 1]}.</p>
      </div>
      </div>
    </Chapter>
  );
}
