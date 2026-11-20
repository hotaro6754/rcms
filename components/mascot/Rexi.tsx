"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import s from "./rexi.module.css";

export type RexiMood = "idle" | "happy" | "cheer" | "think" | "wow" | "sad";

/**
 * Rexi, RCMExcel's guide: drawn entirely in code from the logo (a rising bar, with the teal arrow
 * as a tuft). The eyes follow the pointer, it blinks on its own, bobs while idle and jumps when
 * clicked. Moods change the eyes, mouth and arms. Motion is skipped for reduced-motion users.
 *
 * Decorative unless `label` is given; `say` shows a speech bubble beside it.
 */
export function Rexi({ mood = "idle", size = 180, say, label, track = true, className, bubble = "right" }: { mood?: RexiMood; size?: number; say?: string; label?: string; track?: boolean; className?: string; bubble?: "right" | "left" }) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const body = useAnimationControls();

  // Eyes follow the pointer (throttled to animation frames).
  useEffect(() => {
    if (!track || reduce) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = svgRef.current?.getBoundingClientRect();
        if (!r) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.45;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 260);
        setLook({ x: (dx / d) * 6 * k, y: (dy / d) * 5 * k });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [track, reduce]);

  // Blink every few seconds, at a slightly random rhythm.
  useEffect(() => {
    if (reduce) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2600 + Math.random() * 2600);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduce]);

  // A cheer is a little jump on arrival.
  useEffect(() => {
    if (reduce) return;
    if (mood === "cheer" || mood === "happy") body.start({ y: [0, -16, 0, -6, 0], scaleY: [1, 1.04, 0.94, 1.02, 1], transition: { duration: 0.9, ease: "easeOut" } });
  }, [mood, body, reduce]);

  const jump = () => {
    if (reduce) return;
    body.start({ y: [0, 4, -22, 0], scaleY: [1, 0.86, 1.08, 1], scaleX: [1, 1.08, 0.95, 1], transition: { duration: 0.65, ease: "easeOut" } });
  };

  const closed = blink || mood === "happy" || mood === "cheer";
  const eyeY = mood === "sad" ? 112 : 106;
  const p = { x: look.x, y: look.y + (mood === "think" ? -4 : 0) };

  return (
    <span className={`${s.wrap} ${className ?? ""}`} style={{ width: size }}>
      {say && (
        <motion.span className={s.bubble} data-side={bubble} key={say} initial={{ opacity: 0, y: 6, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
          {say}
        </motion.span>
      )}
      <svg ref={svgRef} viewBox="0 0 200 230" className={s.svg} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} onClick={jump}>
        {/* shadow */}
        <motion.ellipse cx="100" cy="214" rx="46" ry="7" className={s.shadow} animate={reduce ? undefined : { rx: [46, 40, 46], opacity: [0.28, 0.18, 0.28] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
        <motion.g animate={reduce ? undefined : { y: [0, -5, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
          <motion.g animate={body} style={{ originX: "100px", originY: "205px" }}>
            {/* arms */}
            <g className={s.arm}>
              {mood === "cheer" ? (
                <>
                  <motion.path d="M48 128 C 30 112, 26 92, 30 76" animate={reduce ? undefined : { rotate: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity }} style={{ originX: "48px", originY: "128px" }} />
                  <motion.path d="M152 128 C 170 112, 174 92, 170 76" animate={reduce ? undefined : { rotate: [0, 8, 0] }} transition={{ duration: 0.6, repeat: Infinity }} style={{ originX: "152px", originY: "128px" }} />
                </>
              ) : mood === "think" ? (
                <>
                  <path d="M48 140 C 36 150, 34 162, 40 170" />
                  <path d="M152 140 C 142 134, 128 132, 118 140" />
                </>
              ) : mood === "sad" ? (
                <>
                  <path d="M48 140 C 40 156, 40 170, 44 180" />
                  <path d="M152 140 C 160 156, 160 170, 156 180" />
                </>
              ) : (
                <>
                  <path d="M48 140 C 36 150, 34 162, 40 172" />
                  <motion.path
                    d="M152 136 C 168 124, 174 108, 172 94"
                    animate={reduce || mood !== "idle" ? undefined : { rotate: [0, 14, -4, 14, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 3.5 }}
                    style={{ originX: "152px", originY: "136px" }}
                  />
                </>
              )}
            </g>
            {/* body: the logo bar */}
            <rect x="48" y="58" width="104" height="150" rx="34" className={s.body} />
            <rect x="58" y="66" width="30" height="64" rx="15" className={s.shine} />
            {/* tuft: the logo arrow */}
            <path d="M92 60 C 92 40, 104 28, 124 22" className={s.tuft} />
            <path d="M114 18 L126 21 L121 33" className={s.tuft} />
            {/* cheeks */}
            <ellipse cx="68" cy="134" rx="9" ry="5" className={s.cheek} />
            <ellipse cx="132" cy="134" rx="9" ry="5" className={s.cheek} />
            {/* eyes */}
            {closed ? (
              <g className={s.lid}>
                <path d={mood === "cheer" || mood === "happy" ? `M70 ${eyeY + 2} q12 -12 24 0` : `M70 ${eyeY} h24`} />
                <path d={mood === "cheer" || mood === "happy" ? `M106 ${eyeY + 2} q12 -12 24 0` : `M106 ${eyeY} h24`} />
              </g>
            ) : (
              <g>
                <ellipse cx="82" cy={eyeY} rx="14" ry={mood === "wow" ? 18 : 16} className={s.white} />
                <ellipse cx="118" cy={eyeY} rx="14" ry={mood === "wow" ? 18 : 16} className={s.white} />
                <circle cx={82 + p.x} cy={eyeY + p.y} r={mood === "wow" ? 6 : 7.5} className={s.pupil} />
                <circle cx={118 + p.x} cy={eyeY + p.y} r={mood === "wow" ? 6 : 7.5} className={s.pupil} />
                <circle cx={85 + p.x} cy={eyeY - 3 + p.y} r="2.4" className={s.glint} />
                <circle cx={121 + p.x} cy={eyeY - 3 + p.y} r="2.4" className={s.glint} />
                {mood === "sad" && (
                  <>
                    <path d="M68 92 l24 6" className={s.brow} />
                    <path d="M132 92 l-24 6" className={s.brow} />
                  </>
                )}
                {mood === "think" && <path d="M106 88 q12 -8 24 -2" className={s.brow} />}
              </g>
            )}
            {/* mouth */}
            {mood === "wow" ? (
              <ellipse cx="100" cy="146" rx="8" ry="10" className={s.mouthFill} />
            ) : mood === "cheer" || mood === "happy" ? (
              <path d="M84 138 q16 22 32 0 z" className={s.mouthFill} />
            ) : mood === "sad" ? (
              <path d="M88 150 q12 -10 24 0" className={s.mouth} />
            ) : mood === "think" ? (
              <path d="M90 146 q8 -4 20 2" className={s.mouth} />
            ) : (
              <path d="M88 140 q12 12 24 0" className={s.mouth} />
            )}
            {/* feet */}
            <ellipse cx="80" cy="208" rx="14" ry="7" className={s.foot} />
            <ellipse cx="120" cy="208" rx="14" ry="7" className={s.foot} />
          </motion.g>
          {/* think bubbles / cheer sparks */}
          {mood === "think" && (
            <motion.g className={s.dots} animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }}>
              <circle cx="160" cy="58" r="4" />
              <circle cx="172" cy="42" r="6" />
              <circle cx="188" cy="22" r="8" />
            </motion.g>
          )}
          {mood === "cheer" && (
            <motion.g className={s.spark} animate={reduce ? undefined : { scale: [0.6, 1.1, 0.6], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.1, repeat: Infinity }} style={{ originX: "100px", originY: "40px" }}>
              <path d="M30 40 v14 M23 47 h14" />
              <path d="M172 54 v12 M166 60 h12" />
              <path d="M150 20 v10 M145 25 h10" />
            </motion.g>
          )}
        </motion.g>
      </svg>
    </span>
  );
}
