"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import sc from "./scene.module.css";

gsap.registerPlugin(MotionPathPlugin, ScrollTrigger, useGSAP);

export type SceneSpot = {
  /** Position on the source image, in its pixels. */
  x: number;
  y: number;
  /** Short RCM term shown in mono, e.g. "837", "CO-50". */
  term: string;
  title: string;
  body: string;
};

/**
 * An interactive 3D isometric illustration. Numbered hotspots sit on the objects in the picture;
 * each opens a card with the RCM term it stands for. Motion handles the hotspots and cards; GSAP
 * runs the claim token along an optional route, an auto-tour that steps through the hotspots
 * while the scene is on screen (it stops for good once the visitor takes over), and a gentle 3D
 * tilt that follows the pointer. Everything is readable without motion: the cards are real
 * buttons and text, and under reduced motion the tour, token and tilt are off.
 */
export function InfoScene({
  src,
  alt,
  w,
  h,
  crop,
  spots,
  route,
  className,
  sizes = "(min-width: 1080px) 50vw, 100vw",
  priority,
  label,
}: {
  src: StaticImageData;
  alt: string;
  w: number;
  h: number;
  /** Show only a horizontal band of the image: its top edge and height, in image pixels. */
  crop?: { top: number; height: number };
  spots: SceneSpot[];
  /** Optional route the claim token follows, as image-pixel points. */
  route?: [number, number][];
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Accessible name for the group of hotspots. */
  label: string;
}) {
  const root = useRef<HTMLElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const touched = useRef(false);
  const reduce = useReducedMotion();
  const id = useId();
  const top = crop?.top ?? 0;
  const ch = crop?.height ?? h;
  const objectPosition = crop ? `50% ${((top / Math.max(h - ch, 1)) * 100).toFixed(2)}%` : "50% 50%";
  const pathD = route ? route.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") : "";

  // Escape closes the open card.
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Claim token along the route.
        const token = el.querySelector<SVGGElement>("[data-token]");
        const path = el.querySelector<SVGPathElement>("[data-route]");
        if (token && path) {
          gsap.set(token, { opacity: 1 });
          gsap.to(token, { duration: 9, ease: "none", repeat: -1, motionPath: { path, align: path, alignOrigin: [0.5, 0.5] } });
          gsap.fromTo(path, { strokeDashoffset: 0 }, { strokeDashoffset: -40, duration: 2, ease: "none", repeat: -1 });
        }

        // Auto-tour while on screen, until the visitor interacts.
        let i = -1;
        let timer = 0;
        const step = () => {
          if (touched.current) return;
          i = (i + 1) % spots.length;
          setActive(i);
        };
        const start = () => {
          if (touched.current || timer) return;
          step();
          timer = window.setInterval(step, 3200);
        };
        const stop = () => {
          window.clearInterval(timer);
          timer = 0;
        };
        const st = ScrollTrigger.create({ trigger: el, start: "top 70%", end: "bottom 20%", onEnter: start, onEnterBack: start, onLeave: stop, onLeaveBack: stop });

        // Entrance: the scene rises and the hotspots pop in. Nothing is hidden up front, so if the
        // trigger never fires (a jump past it, a throttled tab) the scene is simply already there.
        const enter = ScrollTrigger.create({
          trigger: el,
          start: "top 85%",
          once: true,
          onEnter: () => {
            gsap.fromTo(el.querySelector("[data-scene-img]"), { y: 36, scale: 0.97 }, { y: 0, scale: 1, duration: 1.2, ease: "expo.out" });
            gsap.fromTo(el.querySelectorAll("[data-spot]"), { scale: 0.4 }, { scale: 1, duration: 0.6, ease: "back.out(2.4)", stagger: 0.08 });
          },
        });

        return () => {
          stop();
          st.kill();
          enter.kill();
        };
      });

      // 3D tilt with the pointer, fine pointers only.
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const t = tilt.current;
        if (!t) return;
        const rx = gsap.quickTo(t, "rotationX", { duration: 0.8, ease: "power3.out" });
        const ry = gsap.quickTo(t, "rotationY", { duration: 0.8, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 6);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 5);
        };
        const leave = () => {
          rx(0);
          ry(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
    },
    { scope: root, dependencies: [spots.length] },
  );

  const take = (n: number | null) => {
    touched.current = true;
    setActive(n);
  };
  const spot = active !== null ? spots[active] : null;
  const left = (x: number) => `${((x / w) * 100).toFixed(3)}%`;
  const topPct = (y: number) => `${(((y - top) / ch) * 100).toFixed(3)}%`;

  return (
    <figure ref={root} className={`${sc.scene} ${w / ch > 2.4 ? sc.wide : ""} ${className ?? ""}`}>
      <div className={sc.stage}>
        <div ref={tilt} className={sc.tilt} style={{ aspectRatio: `${w} / ${ch}` }}>
          <div className={sc.frame} data-scene-img>
            <Image src={src} alt={alt} fill sizes={sizes} priority={priority} placeholder="blur" style={{ objectFit: "cover", objectPosition }} />
            {route && (
              <svg className={sc.overlay} viewBox={`0 ${top} ${w} ${ch}`} preserveAspectRatio="none" aria-hidden>
                <path d={pathD} data-route className={sc.route} />
                <g data-token className={sc.token} style={{ opacity: 0 }}>
                  <rect x="-15" y="-19" width="30" height="38" rx="5" />
                  <path d="M-8 -8 H8 M-8 -1 H5 M-8 6 H8" />
                </g>
              </svg>
            )}
          </div>
          <div className={sc.spots} role="group" aria-label={label}>
            {spots.map((s, n) => (
              <button
                key={s.term + n}
                type="button"
                data-spot
                className={sc.spot}
                style={{ left: left(s.x), top: topPct(s.y) }}
                aria-expanded={active === n}
                aria-controls={`${id}-card`}
                aria-label={`${s.term}: ${s.title}`}
                onMouseEnter={() => take(n)}
                onFocus={() => take(n)}
                onClick={() => take(active === n ? null : n)}
                data-on={active === n || undefined}
              >
                {!reduce && <motion.i className={sc.pulse} animate={{ scale: [1, 1.9], opacity: [0.55, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: n * 0.25 }} />}
                <span>{String(n + 1).padStart(2, "0")}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={sc.cardSlot} id={`${id}-card`} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {spot ? (
            <motion.div
              key={active}
              className={sc.card}
              initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={sc.term}>
                {String((active ?? 0) + 1).padStart(2, "0")} · {spot.term}
              </span>
              <b>{spot.title}</b>
              <p>{spot.body}</p>
            </motion.div>
          ) : (
            <motion.p key="hint" className={sc.hint} initial={false} animate={{ opacity: 1 }}>
              Hover or tap a number to see what happens there.
            </motion.p>
          )}
        </AnimatePresence>
        <div className={sc.legend} aria-hidden>
          {spots.map((s, n) => (
            <button key={n} type="button" tabIndex={-1} className={sc.chip} data-on={active === n || undefined} onClick={() => take(n)}>
              <span>{String(n + 1).padStart(2, "0")}</span>
              {s.term}
            </button>
          ))}
        </div>
      </div>
    </figure>
  );
}
