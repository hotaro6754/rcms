"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import s from "./atlas.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type CycleStage = { label: string; does: string; breaks: string; metric: string; phase: "Front end" | "Middle" | "Back end"; taught: string };

const FILL = { "Front end": "var(--sage)", Middle: "var(--sky)", "Back end": "var(--sand)" } as const;

function arc(a0: number, a1: number, r0: number, r1: number) {
  const p = (a: number, r: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${(300 + r * Math.cos(t)).toFixed(2)} ${(300 + r * Math.sin(t)).toFixed(2)}`;
  };
  return `M${p(a0, r1)} A${r1} ${r1} 0 0 1 ${p(a1, r1)} L${p(a1, r0)} A${r0} ${r0} 0 0 0 ${p(a0, r0)} Z`;
}
const at = (a: number, r: number) => {
  const t = ((a - 90) * Math.PI) / 180;
  return { x: +(300 + r * Math.cos(t)).toFixed(2), y: +(300 + r * Math.sin(t)).toFixed(2) };
};

/**
 * The cycle, explained in order. The ring stays in view while the reader scrolls through the
 * ten stages; the stage in the middle of the screen is the one lit on the ring. The page scrolls
 * normally (nothing is pinned or hijacked). Clicking a segment jumps to that stage.
 */
export function CycleScroll({ stages }: { stages: CycleStage[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const step = 360 / stages.length;

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>("[data-stage]").forEach((el, n) => {
        ScrollTrigger.create({ trigger: el, start: "top 55%", end: "bottom 55%", onToggle: (self) => self.isActive && setI(n) });
      });
    },
    { scope: root },
  );

  const go = (n: number) => {
    setI(n);
    root.current?.querySelectorAll<HTMLElement>("[data-stage]")[n]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  };
  const st = stages[i];

  return (
    <div className={s.cycle} ref={root}>
      <div className={s.cycleFig}>
        <svg viewBox="0 0 600 600" className={s.ring} role="group" aria-label="Revenue cycle ring: choose a stage">
          {/* phase labels */}
          {(["Front end", "Middle", "Back end"] as const).map((ph) => {
            const idx = stages.map((x, n) => (x.phase === ph ? n : -1)).filter((n) => n >= 0);
            if (!idx.length) return null;
            const mid = ((idx[0] + idx[idx.length - 1] + 1) / 2) * step;
            const p = at(mid, 290);
            return (
              <text key={ph} x={p.x} y={p.y} textAnchor="middle" className={s.phaseLabel}>
                {ph}
              </text>
            );
          })}
          {stages.map((x, n) => {
            const a0 = n * step + 1;
            const a1 = (n + 1) * step - 1;
            const m = at((a0 + a1) / 2, 199);
            const on = n === i;
            return (
              <g
                key={x.label}
                className={s.arc}
                data-on={on || undefined}
                role="button"
                tabIndex={0}
                aria-label={`Stage ${n + 1}: ${x.label}`}
                aria-pressed={on}
                onClick={() => go(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    go(n);
                  }
                }}
              >
                <path d={arc(a0, a1, 158, 240)} fill={on ? "var(--ink)" : FILL[x.phase]} />
                <text x={m.x} y={m.y} style={{ fill: on ? "var(--bg)" : undefined }}>
                  {String(n + 1).padStart(2, "0")}
                </text>
              </g>
            );
          })}
          <circle cx="300" cy="300" r="146" fill="var(--surface)" stroke="var(--line)" />
          <text x="300" y="270" className={s.ringSub}>
            {st.phase} · stage {String(i + 1).padStart(2, "0")}
          </text>
          <foreignObject x="180" y="282" width="240" height="90">
            <p style={{ margin: 0, textAlign: "center", font: "400 26px/1.15 var(--display)", color: "var(--ink)" }}>{st.label}</p>
          </foreignObject>
          <text x="300" y="392" className={s.ringSub}>
            {st.taught}
          </text>
        </svg>
      </div>

      <ol className={s.stages}>
        {stages.map((x, n) => (
          <li key={x.label} className={s.stage} data-stage data-on={n === i || undefined}>
            <div className={s.stageTop}>
              <span className={s.num}>{String(n + 1).padStart(2, "0")}</span>
              <span className={s.mono}>{x.phase}</span>
            </div>
            <h3 className={s.h3}>{x.label}</h3>
            <p>{x.does}</p>
            <dl className={s.kv}>
              <div>
                <dt>How it breaks</dt>
                <dd>{x.breaks}</dd>
              </div>
              <div>
                <dt>The number to watch</dt>
                <dd>{x.metric}</dd>
                <dt style={{ marginTop: 12 }}>Taught in</dt>
                <dd>{x.taught}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </div>
  );
}
