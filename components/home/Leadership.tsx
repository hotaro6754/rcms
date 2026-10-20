"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap/register";
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
 * THE CLAIM REVEALS THE PEOPLE BEHIND IT. Every number on the claim belongs to someone.
 *
 * The statement is set large and plain; its second sentence steps back in tone rather than
 * switching colour. Below it, the ladder as a ledger: six rows on one left edge. Point at (or tab to) a role and its
 * row turns to ink and draws the metric that role is trusted to own, from the same teaching
 * data the rest of the page uses, with its current value. A reader sees what changes as you
 * climb: the number you answer for.
 *
 * GSAP owns the entrances: the second sentence of the statement inks in word by word as it
 * is read (scrubbed), the rows rise in turn, each resting trend line draws itself and each
 * value counts up once. CSS owns the hover and focus states, on different properties.
 */
export function Leadership({ content: c }: { content: PageContent<typeof homePage>["people"] }) {
  const roles = c.roles;
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(root);
        const split = SplitText.create(q(".second")[0], { type: "words", aria: "none" });
        gsap.fromTo(
          split.words,
          { opacity: 0.6 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.12,
            scrollTrigger: { trigger: q(".statement")[0], start: "top 70%", end: "bottom 38%", scrub: 0.5 },
          },
        );

        const tl = gsap.timeline({ scrollTrigger: { trigger: q(".ledger")[0], start: "top 90%", once: true } });
        tl.from(q(".ledger-rule"), { scaleX: 0, transformOrigin: "left center", duration: 0.7, ease: "power3.inOut" })
          .from(q(".row"), { y: 22, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }, "-=0.45")
          .from(q(".rest-line"), { drawSVG: "0%", duration: 1.1, ease: "power2.inOut", stagger: 0.08 }, "<0.15");
        q(".now").forEach((el, i) => {
          const m = METRICS[roles[i].metric];
          const box = { v: 0 };
          tl.to(box, { v: m.current, duration: 1.2, ease: "power2.out", onUpdate: () => void (el.textContent = formatValue(m, box.v)) }, 0.35 + i * 0.08);
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Chapter folio="06" title={c.runningHead}>
      <div ref={root} data-gsap-scope>
      <h2 className="statement max-w-[24ch] text-[clamp(2.4rem,5vw,4.6rem)] leading-[1.02]">
        {c.statement}{" "}
        <span className="second text-muted-foreground motion-safe:text-foreground">{c.statementSecond}</span>
      </h2>

      <div className="ledger relative mt-16">
        <span aria-hidden="true" className="ledger-rule absolute inset-x-0 top-0 h-0.5 bg-foreground" />
        <div className="text-data hidden grid-cols-[3rem_minmax(0,1.3fr)_minmax(0,1fr)_9rem_6rem] gap-6 border-b border-border px-2 py-3 text-[10.5px] tracking-[0.12em] text-subtle md:grid">
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
                className="row group grid grid-cols-[2.25rem_minmax(0,1fr)_5.5rem] items-center gap-x-4 gap-y-2 border-b border-border px-2 py-5 outline-none transition-colors duration-[var(--dur-med)] hover:bg-[#161513] hover:text-[#f4efe6] focus-visible:bg-[#161513] focus-visible:text-[#f4efe6] md:grid-cols-[3rem_minmax(0,1.3fr)_minmax(0,1fr)_9rem_6rem] md:gap-x-6"
              >
                <span className="text-data text-[12px] text-subtle transition-colors group-hover:text-[#9cc3b2] group-focus-visible:text-[#9cc3b2]">
                  {r.level}
                </span>
                <span className="font-serif-display text-[clamp(1.5rem,2.2vw,2rem)] leading-tight">
                  {r.role}
                </span>
                <span className="col-start-2 row-start-2 text-[14px] leading-snug text-muted-foreground transition-colors group-hover:text-[#b9b2a7] group-focus-visible:text-[#b9b2a7] md:col-start-auto md:row-start-auto">
                  {r.owns}
                  <span className="text-data mt-1 block text-[11px] text-subtle group-hover:text-[#8f887e] group-focus-visible:text-[#8f887e]">{m.label}</span>
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
                    stroke="#9cc3b2"
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
        <p className="text-data mt-4 text-[11px] text-subtle">Teaching data, one engagement, {PERIODS[0]} to {PERIODS[PERIODS.length - 1]}.</p>
      </div>
      </div>
    </Chapter>
  );
}
