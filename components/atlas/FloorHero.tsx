"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { ArrowRight, Pause, Play } from "lucide-react";
import s from "./atlas.module.css";
import f from "./floor.module.css";

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin, SplitText, useGSAP);

export type FloorStage = { label: string; short: string; metric: string };

/* Where each of the ten stages happens in the section drawing (viewBox 0 130 1440 450). */
const NODES: [number, number][] = [
  [96, 392],
  [168, 360],
  [240, 392],
  [410, 380],
  [545, 380],
  [745, 372],
  [980, 372],
  [1165, 405],
  [1262, 405],
  [1190, 262],
];
/* The room each stage lights up: front desk, clinic, clearinghouse, payer, ops floor, ops mezzanine. */
const ROOM_OF = [0, 0, 0, 1, 1, 2, 3, 4, 4, 5];
const ROOMS = [
  { name: "Front desk", x: 40, y: 230, w: 290, h: 270 },
  { name: "Clinic and coding", x: 330, y: 230, w: 270, h: 270 },
  { name: "Clearinghouse", x: 660, y: 330, w: 170, h: 170 },
  { name: "Payer", x: 880, y: 350, w: 200, h: 130 },
  { name: "Revenue cycle team", x: 1120, y: 370, w: 280, h: 130 },
  { name: "Revenue cycle leads", x: 1120, y: 230, w: 280, h: 132 },
];

/* Catmull-Rom through the nodes, as cubic Béziers, rounded so server and client agree. */
const r = (n: number) => +n.toFixed(1);
const ROUTE = (() => {
  const p = [[44, 420] as [number, number], ...NODES, [1236, 246] as [number, number]];
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    d += ` C${r(p1[0] + (p2[0] - p0[0]) / 6)} ${r(p1[1] + (p2[1] - p0[1]) / 6)} ${r(p2[0] - (p3[0] - p1[0]) / 6)} ${r(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`;
  }
  return d;
})();

/* ---------- drawing primitives: faceless monoline figures and furniture ---------- */
function Standing({ x, y = 500, solid }: { x: number; y?: number; solid?: boolean }) {
  const c = solid ? f.solid : f.body;
  return (
    <g>
      <circle cx={x} cy={y - 66} r="8.5" className={c} />
      <path d={`M${x - 13} ${y - 30} v-16 a13 13 0 0 1 26 0 v16 Z`} className={c} />
      <path d={`M${x - 6} ${y - 30} V${y} M${x + 6} ${y - 30} V${y}`} className={f.ln} />
    </g>
  );
}
function Seated({ x, y = 500, solid, face = 1 }: { x: number; y?: number; solid?: boolean; face?: 1 | -1 }) {
  const c = solid ? f.solid : f.body;
  return (
    <g>
      <circle cx={x} cy={y - 60} r="8.5" className={c} />
      <path d={`M${x - 12} ${y - 26} v-14 a12 12 0 0 1 24 0 v14 Z`} className={c} />
      <path d={`M${x - 14} ${y - 26} h28 M${x} ${y - 26} V${y - 4} M${x - 10} ${y} h20 M${x + 4 * face} ${y - 26} h${16 * face} V${y}`} className={f.ln} />
    </g>
  );
}
function Desk({ x, w, y = 500, screens = 1 }: { x: number; w: number; y?: number; screens?: number }) {
  return (
    <g>
      <path d={`M${x} ${y - 36} h${w} M${x + 5} ${y - 36} V${y} M${x + w - 5} ${y - 36} V${y}`} className={f.ln} />
      {Array.from({ length: screens }, (_, i) => {
        const sx = x + 10 + i * 30;
        return <path key={i} d={`M${sx} ${y - 58} h24 v16 h-24 Z M${sx + 12} ${y - 42} v6`} className={f.ln} />;
      })}
    </g>
  );
}

/**
 * The hero, "The Floor": a cutaway section drawing of a US healthcare revenue cycle, from the
 * provider's front desk to the clearinghouse, the payer and the revenue cycle team, in the
 * manner of an architect's section. Claim #20481 (illustrative) runs the cobalt route through all
 * ten stages. Visitors can step through the stages themselves; the loop pauses when they do.
 */
export function FloorHero({
  eyebrow,
  titleA,
  titleB,
  accent,
  lead,
  primary,
  secondary,
  stages,
  facts,
}: {
  eyebrow: string;
  titleA: string;
  titleB: string;
  accent: string;
  lead: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  stages: FloorStage[];
  facts: { value: string; label: string }[];
}) {
  const root = useRef<HTMLElement>(null);
  const loop = useRef<gsap.core.Timeline | null>(null);
  const fracs = useRef<number[]>([]);
  const [active, setActive] = useState(-1);
  const [done, setDone] = useState(false);
  const [playing, setPlaying] = useState(true);

  const { contextSafe } = useGSAP(
    () => {
      const host = root.current;
      const route = host?.querySelector<SVGPathElement>("#floor-route");
      const live = host?.querySelector<SVGPathElement>("[data-live]");
      if (!host || !route || !live) return;
      const len = route.getTotalLength();
      fracs.current = NODES.map(([x, y]) => {
        let best = 0;
        let bd = Infinity;
        for (let l = 0; l <= len; l += 2) {
          const p = route.getPointAtLength(l);
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bd) {
            bd = d;
            best = l;
          }
        }
        return best / len;
      });
      gsap.set(live, { strokeDasharray: len, strokeDashoffset: len });

      const mm = gsap.matchMedia();
      mm.add({ ok: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        if ((ctx.conditions as { reduce: boolean }).reduce) {
          gsap.set(live, { strokeDashoffset: 0 });
          setActive(NODES.length - 1);
          setDone(true);
          setPlaying(false);
          return;
        }
        const split = SplitText.create("[data-floor-h1]", { type: "lines", mask: "lines" });
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        // Content never waits on animation: if frames are throttled the intro jumps to its end.
        const guard = window.setTimeout(() => intro.progress(1), 3200);
        intro
          .from(split.lines, { yPercent: 105, duration: 1, stagger: 0.08 })
          .from("[data-floor-in]", { y: 14, opacity: 0, duration: 0.8, stagger: 0.06 }, "-=0.7")
          .from(
            "[data-fdraw] path, [data-fdraw] line, [data-fdraw] rect, [data-fdraw] circle",
            { drawSVG: "0%", duration: 1.6, ease: "power2.inOut", stagger: { each: 0.004, from: "start" } },
            0.2,
          )
          .from("[data-fdraw] text", { opacity: 0, duration: 0.6, stagger: 0.02 }, 1.1)
          .from("[data-node]", { scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(2.4)", stagger: 0.05 }, 1.4);

        let last = -1;
        const tl = gsap
          .timeline({ repeat: -1, repeatDelay: 0.6, delay: 2.2 })
          .call(() => {
            last = -1;
            setActive(-1);
            setDone(false);
          })
          .set("[data-token]", { opacity: 1 })
          .to("[data-token]", {
            duration: 16,
            ease: "none",
            motionPath: { path: route, autoRotate: false },
            onUpdate() {
              const p = this.progress();
              live.style.strokeDashoffset = String(len * (1 - p));
              const idx = fracs.current.reduce((acc, fr, i) => (fr <= p + 0.002 ? i : acc), -1);
              if (idx !== last) {
                last = idx;
                setActive(idx);
              }
            },
          })
          .call(() => setDone(true))
          .to({}, { duration: 3 })
          .to("[data-token]", { opacity: 0, duration: 0.3 });
        loop.current = tl;

        return () => {
          window.clearTimeout(guard);
          split.revert();
          loop.current = null;
        };
      });
    },
    { scope: root },
  );

  /* A visitor picks a stage: stop the loop and put the claim there. */
  const pick = contextSafe((i: number) => {
    const host = root.current;
    const route = host?.querySelector<SVGPathElement>("#floor-route");
    const live = host?.querySelector<SVGPathElement>("[data-live]");
    if (!route || !live) return;
    loop.current?.pause();
    setPlaying(false);
    const len = route.getTotalLength();
    const fr = fracs.current[i] ?? 0;
    const pt = route.getPointAtLength(fr * len);
    gsap.to("[data-token]", { x: pt.x, y: pt.y, opacity: 1, duration: 0.5, ease: "power3.out" });
    gsap.to(live, { strokeDashoffset: len * (1 - fr), duration: 0.5, ease: "power3.out" });
    setActive(i);
    setDone(i === NODES.length - 1);
  });
  const toggle = () => {
    if (!loop.current) return;
    if (playing) {
      loop.current.pause();
      setPlaying(false);
    } else {
      loop.current.restart(true);
      setPlaying(true);
    }
  };

  const st = active >= 0 ? stages[active] : null;
  const room = active >= 0 ? ROOMS[ROOM_OF[active]] : null;
  const node = active >= 0 ? NODES[active] : null;
  const tag = st ? `${String(active + 1).padStart(2, "0")} ${st.short.toUpperCase()}` : "";

  return (
    <section className={`${s.hero} ${f.floor}`} ref={root}>
      <div className={s.wrap}>
        <div className={f.top}>
          <div className={f.copy}>
            <span className={s.label} data-floor-in>
              {eyebrow}
            </span>
            <h1 className={f.h1} data-floor-h1>
              {titleA}
              <span className={f.chip} aria-hidden>
                <svg viewBox="0 0 64 28">
                  <path d="M6 20 C 18 4, 30 26, 42 10 S 56 12, 58 8" />
                  <circle cx="6" cy="20" r="3" />
                  <circle cx="24" cy="15" r="3" />
                  <circle cx="42" cy="10" r="3" />
                  <circle cx="58" cy="8" r="3" />
                </svg>
              </span>{" "}
              {titleB} <em>{accent}</em>
            </h1>
          </div>
          <div className={f.aside}>
            <p className={s.lead} data-floor-in>
              {lead}
            </p>
            <div className={s.heroCtas} data-floor-in>
              <Link href={primary.href} className={s.btn}>
                {primary.label} <ArrowRight aria-hidden />
              </Link>
              <Link href={secondary.href} className={s.btnLine}>
                {secondary.label}
              </Link>
            </div>
          </div>
        </div>

        <figure className={f.plate} data-floor-in>
          <div className={f.plateHead}>
            <span className={s.mono}>Section A–A · one claim, ten stages</span>
            <span className={s.mono}>Claim #20481 · illustrative teaching data</span>
          </div>
          <div className={f.scroll}>
            <svg viewBox="0 130 1440 450" className={f.svg} role="img" aria-labelledby="floor-t floor-d">
              <title id="floor-t">A cutaway drawing of the US healthcare revenue cycle</title>
              <desc id="floor-d">
                A claim starts at the provider&apos;s front desk (registration, eligibility, authorization), moves through the clinic (charge capture, coding), is sent through the
                clearinghouse, adjudicated by the payer, and returns to the revenue cycle team for payment posting, A/R follow-up and denial recovery.
              </desc>
              <defs>
                <pattern id="fl-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="7" className={f.hatchLn} />
                </pattern>
              </defs>

              {/* room washes behind the drawing */}
              {ROOMS.map((rm, i) => (
                <rect key={rm.name} x={rm.x} y={rm.y} width={rm.w} height={rm.h} className={f.wash} data-on={room === rm || (done && i >= 4) || undefined} />
              ))}

              <g data-fdraw>
                {/* dimension chain: the three phases */}
                <path d="M40 172 H1400 M40 162 v20 M330 162 v20 M860 162 v20 M1400 162 v20" className={f.thin} />
                <text x="185" y="158" textAnchor="middle" className={f.note}>
                  FRONT END · 01–03
                </text>
                <text x="595" y="158" textAnchor="middle" className={f.note}>
                  MIDDLE · 04–06
                </text>
                <text x="1130" y="158" textAnchor="middle" className={f.note}>
                  BACK END · 07–10
                </text>

                {/* ground, earth hatch and the EDI conduit */}
                <rect x="0" y="500" width="1440" height="14" fill="url(#fl-hatch)" stroke="none" />
                <path d="M0 500 H1440" className={f.ln} />
                <path d="M600 500 V530 H1120 V500 M745 500 V530 M980 500 V530" className={f.conduit} />
                <text x="672" y="550" className={f.note}>
                  EDI 837 CLAIM →
                </text>
                <text x="1000" y="550" className={f.note}>
                  ← EDI 835 REMITTANCE
                </text>

                {/* provider building: front desk | clinic and coding */}
                <rect x="30" y="218" width="580" height="12" fill="url(#fl-hatch)" className={f.ln} />
                <path d="M40 230 V500 M600 230 V500 M330 230 V422" className={f.ln} />
                <text x="54" y="252" className={f.note}>
                  FRONT DESK · PATIENT ACCESS
                </text>
                <text x="344" y="252" className={f.note}>
                  CLINIC · CHARGES · CODING
                </text>
                <path d="M110 230 v14 M250 230 v14 M420 230 v14 M540 230 v14" className={f.thin} />
                {/* front desk: patient, counter with screen, staff */}
                <Standing x={92} solid={active >= 0 && active <= 2} />
                <path d="M120 500 V458 h84 V500 M116 458 h92" className={f.ln} />
                <path d="M150 436 h26 v18 h-26 Z M163 454 v4" className={f.ln} />
                <Seated x={244} face={-1} />
                <path d="M290 330 h24 v34 h-24 Z M296 340 h12 M296 348 h12" className={f.thin} />
                {/* clinic: exam table, provider, coder */}
                <path d="M356 462 h96 M362 462 V500 M446 462 V500 M356 454 q0 -8 10 -8 h20" className={f.ln} />
                <Standing x={478} solid={active === 3} />
                <Desk x={500} w={92} screens={2} />
                <Seated x={548} solid={active === 4} face={-1} />

                {/* clearinghouse */}
                <rect x="652" y="320" width="186" height="10" fill="url(#fl-hatch)" className={f.ln} />
                <path d="M660 330 V500 M830 330 V500" className={f.ln} />
                <text x="672" y="350" className={f.note}>
                  CLEARINGHOUSE
                </text>
                {[680, 716, 752, 788].map((x) => (
                  <g key={x}>
                    <rect x={x} y="370" width="28" height="126" className={f.ln} />
                    {[0, 1, 2, 3, 4, 5].map((k) => (
                      <path key={k} d={`M${x + 5} ${384 + k * 18} h12`} className={active === 5 && k % 2 === 0 ? f.led : f.thin} />
                    ))}
                  </g>
                ))}

                {/* payer */}
                <path d="M872 336 L980 286 L1088 336 Z M880 336 h200 v14 h-200 Z" className={f.ln} />
                {[905, 942, 980, 1018, 1055].map((x) => (
                  <path key={x} d={`M${x - 6} 350 V480 M${x + 6} 350 V480`} className={f.ln} />
                ))}
                <path d="M870 500 h220 M878 490 h204 M886 480 h188" className={f.ln} />
                <text x="980" y="272" textAnchor="middle" className={f.note}>
                  PAYER · ADJUDICATION
                </text>

                {/* revenue cycle team: floor and mezzanine with a stair */}
                <rect x="1110" y="218" width="300" height="12" fill="url(#fl-hatch)" className={f.ln} />
                <path d="M1120 230 V500 M1400 230 V500" className={f.ln} />
                <rect x="1120" y="362" width="200" height="8" fill="url(#fl-hatch)" className={f.ln} />
                <path d="M1320 370 h12 v18 h12 v18 h12 v18 h12 v18 h12 v18 h12 v20 M1320 362 L1394 500" className={f.thin} />
                <text x="1134" y="252" className={f.note}>
                  REVENUE CYCLE TEAM
                </text>
                <Desk x={1134} w={64} />
                <Seated x={1170} solid={active === 7} face={-1} />
                <Desk x={1222} w={64} />
                <Seated x={1262} solid={active === 8} face={-1} />
                {/* mezzanine: lead at a review board */}
                <Standing x={1160} y={362} solid={active === 9} />
                <path d="M1210 268 h96 v58 h-96 Z M1222 316 v-14 M1238 316 v-26 M1254 316 v-20 M1270 316 v-34 M1286 316 v-10" className={f.ln} />
                <path d="M1258 326 v30" className={f.thin} />

                <text x="40" y="572" className={f.note}>
                  SECTION A–A · A TEACHING DRAWING, NOT TO SCALE
                </text>
              </g>

              {/* node ties, the route and the stage nodes */}
              <g>
                <path id="floor-route" d={ROUTE} className={f.routeBase} />
                <path d={ROUTE} className={f.route} data-live />
                {NODES.map(([x, y], i) => (
                  <g key={i} className={f.node} data-on={i <= active || undefined} data-node>
                    <circle cx={x} cy={y} r="12" />
                    <text x={x} y={y + 3.6} textAnchor="middle">
                      {String(i + 1).padStart(2, "0")}
                    </text>
                  </g>
                ))}
                <g data-token style={{ opacity: 0 }} className={f.token}>
                  <rect x="-9" y="-12" width="18" height="24" rx="2.5" />
                  <path d="M-5 -5 h10 M-5 0 h8 M-5 5 h10" />
                </g>
                {node && st && (
                  <g className={f.tag} transform={`translate(${node[0]} ${node[1] - 30})`}>
                    <rect x={-(tag.length * 3.7 + 12)} y="-13" width={tag.length * 7.4 + 24} height="24" rx="12" />
                    <text y="3.6" textAnchor="middle">
                      {tag}
                    </text>
                  </g>
                )}
              </g>
            </svg>
          </div>

          <figcaption className={f.foot}>
            <span className={f.now} aria-live="polite">
              <b>
                {done
                  ? "Paid, posted and reconciled"
                  : st
                    ? `${String(active + 1).padStart(2, "0")} · ${st.label}`
                    : "A patient arrives at the front desk"}
              </b>
              <span>{done ? "The one denial on the way was worked back to its root cause." : st && room ? `${room.name} · watch: ${st.metric}` : "Registration starts the claim."}</span>
            </span>
            <div className={f.steps} role="group" aria-label="Step through the ten stages">
              <button type="button" className={f.play} onClick={toggle} aria-label={playing ? "Pause the claim" : "Play the claim"}>
                {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
              </button>
              {stages.map((x, i) => (
                <button key={x.label} type="button" className={f.step} aria-pressed={i === active} data-on={i <= active || undefined} onClick={() => pick(i)} title={x.label}>
                  {String(i + 1).padStart(2, "0")}
                  <span className={f.sr}>{x.label}</span>
                </button>
              ))}
            </div>
          </figcaption>
        </figure>

        <dl className={f.facts} data-floor-in>
          {facts.map((x) => (
            <div key={x.label}>
              <dt>{x.label}</dt>
              <dd>{x.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
