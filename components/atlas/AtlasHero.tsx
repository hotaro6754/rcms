"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { Actor, type ActorId } from "./Actors";
import s from "./atlas.module.css";

gsap.registerPlugin(MotionPathPlugin, SplitText, useGSAP);

export type AtlasStage = { label: string; short: string; metric: string };

/* Route: three rows joined by half-circle turns (viewBox 640 x 480). */
const ROUTE = "M70 214 H560 A55 55 0 0 1 560 324 H80 A55 55 0 0 0 80 434 H570";
const ARC = Math.PI * 55;
const ROW = 490;
const TOTAL = ROW + ARC + 480 + ARC + ROW;
const STOPS = [
  { x: 130, y: 214, at: 60 },
  { x: 260, y: 214, at: 190 },
  { x: 390, y: 214, at: 320 },
  { x: 520, y: 214, at: 450 },
  { x: 470, y: 324, at: ROW + ARC + 90 },
  { x: 330, y: 324, at: ROW + ARC + 230 },
  { x: 170, y: 324, at: ROW + ARC + 390 },
  { x: 190, y: 434, at: ROW + ARC + 480 + ARC + 110 },
  { x: 340, y: 434, at: ROW + ARC + 480 + ARC + 260 },
  { x: 490, y: 434, at: ROW + ARC + 480 + ARC + 410 },
];
/* Who does the work at each stage. */
const ACTORS: { id: ActorId; name: string; role: string; x: number; stages: number[] }[] = [
  { id: "frontdesk", name: "Front desk", role: "Patient access", x: 20, stages: [0, 1, 2] },
  { id: "clinic", name: "Provider", role: "Charges · coding", x: 142, stages: [3, 4] },
  { id: "clearinghouse", name: "Clearinghouse", role: "837 claim", x: 264, stages: [5] },
  { id: "payer", name: "Payer", role: "835 remittance", x: 386, stages: [6] },
  { id: "billing", name: "Billing office", role: "Posting · A/R", x: 508, stages: [7, 8, 9] },
];

/**
 * The hero: an editorial headline beside the Revenue Cycle Atlas, the map of who touches a
 * claim at each of the ten stages. Claim #20481 travels the route; each stage and the party
 * that works it light up as it passes. Teaching data, labelled illustrative.
 */
export function AtlasHero({
  eyebrow,
  title,
  accent,
  lead,
  primary,
  secondary,
  stages,
  facts,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  lead: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  stages: AtlasStage[];
  facts: { value: string; label: string }[];
}) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(-1);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ ok: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        if ((ctx.conditions as { reduce: boolean }).reduce) {
          setActive(stages.length - 1);
          setDone(true);
          return;
        }
        const split = SplitText.create("[data-hero-h1]", { type: "lines", mask: "lines" });
        // The headline must never wait on animation: if the tab is hidden or frames are being
        // throttled, the intro jumps to its end instead of holding content invisible.
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        const guard = window.setTimeout(() => intro.progress(1), 2600);
        intro
          .from(split.lines, { yPercent: 105, duration: 1, stagger: 0.09 })
          .from("[data-hero-in]", { y: 16, opacity: 0, duration: 0.8, stagger: 0.07 }, "-=0.65")
          .from("[data-atlas]", { y: 28, opacity: 0, duration: 1 }, 0.15)
          .from("[data-actor]", { y: 14, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.45)
          .from("[data-route]", { opacity: 0, duration: 0.6 }, 0.7)
          .from("[data-stop]", { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.2)", stagger: 0.04 }, 0.8);

        const live = root.current?.querySelector<SVGPathElement>("[data-live]");
        const len = live?.getTotalLength() ?? TOTAL;
        if (live) gsap.set(live, { strokeDasharray: len, strokeDashoffset: len });
        let last = -1;
        gsap
          .timeline({ repeat: -1, repeatDelay: 0.5, delay: 1.6 })
          .call(() => {
            last = -1;
            setActive(-1);
            setDone(false);
          })
          .set("[data-claim]", { opacity: 1 })
          .to("[data-claim]", {
            duration: 15,
            ease: "none",
            motionPath: { path: "#atlas-route", align: "#atlas-route", alignOrigin: [0.5, 0.5], autoRotate: false },
            onUpdate() {
              const p = this.progress();
              if (live) live.style.strokeDashoffset = String(len * (1 - p));
              const idx = STOPS.reduce((acc, st, i) => (st.at / TOTAL <= p ? i : acc), -1);
              if (idx !== last) {
                last = idx;
                setActive(idx);
              }
            },
          })
          .call(() => setDone(true))
          .to({}, { duration: 3 })
          .to("[data-claim]", { opacity: 0, duration: 0.3 });

        return () => {
          window.clearTimeout(guard);
          split.revert();
        };
      });
    },
    { scope: root },
  );

  const owner = ACTORS.find((a) => a.stages.includes(active));
  const st = active >= 0 ? stages[active] : null;

  return (
    <section className={s.hero} ref={root}>
      <div className={s.wrap}>
        <div className={s.heroGrid}>
          <div className={s.heroCopy}>
            <span className={s.label} data-hero-in>
              {eyebrow}
            </span>
            <h1 className={s.h1} data-hero-h1>
              {title} <em>{accent}</em>
            </h1>
            <p className={s.lead} data-hero-in>
              {lead}
            </p>
            <div className={s.heroCtas} data-hero-in>
              <Link href={primary.href} className={s.btn}>
                {primary.label} <ArrowRight aria-hidden />
              </Link>
              <Link href={secondary.href} className={s.btnLine}>
                {secondary.label}
              </Link>
            </div>
            <dl className={s.facts} data-hero-in>
              {facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <figure className={s.atlas} data-atlas>
            <div className={s.atlasHead}>
              <b>The revenue cycle, one claim at a time</b>
              <span className={s.mono}>Claim #20481 · cardiology · illustrative</span>
            </div>
            <div className={s.atlasScroll}>
            <svg viewBox="0 0 640 480" className={s.atlasSvg} role="img" aria-labelledby="atlas-title atlas-desc">
              <title id="atlas-title">The ten stages of the revenue cycle and who works each one</title>
              <desc id="atlas-desc">
                A claim travels from the front desk (registration, eligibility, authorization) to the provider (charge capture, coding), through the clearinghouse (claim submission), to the payer
                (remittance), and back to the billing office (payment posting, A/R follow-up, denials and recovery).
              </desc>
              {ACTORS.map((a) => {
                const on = owner?.id === a.id;
                return (
                  <g key={a.id} data-actor transform={`translate(${a.x} 18)`} style={{ opacity: active < 0 || on || done ? 1 : 0.55, transition: "opacity .4s" }}>
                    <Actor id={a.id} />
                    {on && <rect x="-3" y="-3" width="106" height="102" rx="18" fill="none" stroke="var(--teal)" strokeWidth="2" />}
                    <text x="50" y="114" textAnchor="middle" className={s.annStrong}>
                      {a.name}
                    </text>
                    <text x="50" y="128" textAnchor="middle" className={s.ann}>
                      {a.role}
                    </text>
                  </g>
                );
              })}
              <g data-route>
                <path d={ROUTE} className={s.route} />
                <path id="atlas-route" d={ROUTE} className={s.routeLive} data-live />
                <text x="12" y="218" className={s.ann}>
                  Front
                </text>
                <text x="590" y="328" className={s.ann}>
                  Middle
                </text>
                <text x="12" y="438" className={s.ann}>
                  Back
                </text>
              </g>
              {STOPS.map((p, i) => (
                <g key={i} className={s.stop} data-on={i <= active || undefined} data-stop>
                  <circle cx={p.x} cy={p.y} r="14" />
                  <text x={p.x} y={p.y + 3.4} className={s.stopNum}>
                    {String(i + 1).padStart(2, "0")}
                  </text>
                  <text x={p.x} y={p.y + 32} className={`${s.ann} ${s.stopLbl}`}>
                    {stages[i]?.short}
                  </text>
                </g>
              ))}
              <g data-claim style={{ opacity: 0 }} className={s.claimTok}>
                <rect x="-11" y="-14" width="22" height="28" rx="3" />
                <path d="M-6 -6 H6 M-6 -1 H4 M-6 4 H6" />
              </g>
              <g transform="translate(588 434)">
                <circle r="16" className={s.fTeal} opacity={done ? 1 : 0.25} style={{ transition: "opacity .4s" }} />
                <text y="4" textAnchor="middle" style={{ font: "600 12px var(--mono)", fill: "#fff" }}>
                  $
                </text>
              </g>
            </svg>
            </div>
            <figcaption className={s.atlasFoot} aria-live="polite">
              <span className={s.now}>
                <i style={done ? { background: "var(--ok)" } : undefined} />
                <span>
                  <b>{done ? "Paid $986.40 and reconciled" : st ? `${String(active + 1).padStart(2, "0")} · ${st.label}` : "A patient arrives at the front desk"}</b>
                  <span>{done ? "One CO-50 denial on the way, worked back to its root cause" : st ? `${owner?.name} · watch: ${st.metric}` : "Registration starts the claim"}</span>
                </span>
              </span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
