"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { ArrowDownRight, ArrowRight, FileCheck2, PlayCircle } from "lucide-react";
import { METRICS, formatValue } from "@/lib/data/telemetry";
import art from "@/public/images/art/ops-floor-v1.png";
import s from "./atlas.module.css";
import l from "./lively.module.css";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * The hero: one large illustrated scene of a revenue cycle operations floor (front desk, coders,
 * the billing team, a lead at the KPI board, a clinician, a learner on a lesson), with four
 * colour tiles that carry what RCMExcel is: the numbers the floor is run by, a lesson, and a
 * certificate. Tile figures are illustrative teaching data from lib/data/telemetry.
 */
export function LivelyHero({
  titleA,
  titleB,
  accent,
  lead,
  primary,
  secondary,
  stages,
  facts,
  variant = "stack",
  sceneNode,
}: {
  /** Replaces the picture in the stack layout (e.g. an interactive InfoScene); tiles go below it. */
  sceneNode?: React.ReactNode;
  variant?: "stack" | "compact";
  eyebrow?: string;
  titleA: string;
  titleB: string;
  accent: string;
  lead: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  stages: string[];
  facts: { value: string; label: string }[];
}) {
  const root = useRef<HTMLElement>(null);
  const clean = METRICS["clean-claim"];
  const ar = METRICS["days-in-ar"];
  const hi = Math.max(...clean.series);
  const lo = Math.min(...clean.series);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const split = SplitText.create("[data-lh-h1]", { type: "lines", mask: "lines" });
        // Wait for the first-visit preloader, if it is running, before playing the intro.
        const waiting = document.documentElement.dataset.preload === "run";
        const intro = gsap.timeline({ defaults: { ease: "expo.out" }, paused: waiting });
        let guard = 0;
        const start = () => {
          intro.play();
          guard = window.setTimeout(() => intro.progress(1), 3000);
        };
        if (waiting) window.addEventListener("rcx:loaded", start, { once: true });
        else start();
        intro
          .from(split.lines, { yPercent: 105, duration: 1.1, stagger: 0.08 })
          .from("[data-lh-in]", { y: 16, opacity: 0, duration: 0.8, stagger: 0.06 }, "-=0.8")
          .fromTo("[data-lh-art]", { clipPath: "inset(6% 4% 6% 4% round 40px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 1.4, ease: "expo.inOut" }, 0.1)
          .from("[data-lh-img]", { scale: 1.18, duration: 1.8, ease: "expo.out" }, 0.1)
          .from("[data-lh-tile]", { y: 40, scale: 0.86, opacity: 0, duration: 0.9, ease: "back.out(1.6)", stagger: 0.1 }, 0.8)
          .from("[data-lh-bar]", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.7, stagger: 0.05, ease: "power3.out" }, 1.1);

        // Count the tile figures up from their "before" values.
        root.current?.querySelectorAll<HTMLElement>("[data-lh-count]").forEach((el) => {
          const to = Number(el.dataset.to);
          const from = Number(el.dataset.from);
          const dec = Number(el.dataset.dec ?? 0);
          const o = { v: from };
          intro.to(o, { v: to, duration: 1.6, ease: "power2.out", onUpdate: () => (el.textContent = o.v.toFixed(dec)) }, 1);
        });

        // Tiles drift gently, each on its own beat.
        gsap.utils.toArray<HTMLElement>("[data-lh-float]").forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? 7 : -7, duration: 3 + i * 0.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2 + i * 0.3 });
        });

        // The scene settles as the reader scrolls past it.
        gsap.to("[data-lh-img]", { yPercent: 6, ease: "none", scrollTrigger: { trigger: "[data-lh-art]", start: "top 30%", end: "bottom top", scrub: true } });

        return () => {
          window.removeEventListener("rcx:loaded", start);
          window.clearTimeout(guard);
          split.revert();
        };
      });

      // Pointer parallax on devices with a fine pointer.
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const stage = root.current?.querySelector<HTMLElement>("[data-lh-stage]");
        if (!stage) return;
        const movers = gsap.utils.toArray<HTMLElement>("[data-lh-tile]").map((el, i) => ({
          x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3.out" }),
          k: 10 + i * 5,
        }));
        const move = (e: PointerEvent) => {
          const r = stage.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          movers.forEach((m) => {
            m.x(nx * m.k);
            m.y(ny * m.k);
          });
        };
        stage.addEventListener("pointermove", move);
        return () => stage.removeEventListener("pointermove", move);
      });
    },
    { scope: root },
  );

  const stack = variant !== "compact";
  const heading = (
    <h1 className={l.h1} data-lh-h1>
      {titleA} {titleB} <em>{accent}</em>
    </h1>
  );
  const intro = (
    <>
      <p className={`${s.lead} ${l.lead}`} data-lh-in>
        {lead}
      </p>
      <div className={s.heroCtas} data-lh-in>
        <Link href={primary.href} className={`${s.btn} ${l.cta}`}>
          {primary.label} <ArrowRight aria-hidden />
        </Link>
        <Link href={secondary.href} className={s.btnLine}>
          {secondary.label}
        </Link>
      </div>
    </>
  );
  const tiles = (
    <>
          {/* tile 1: the number a billing floor is judged by */}
          <div className={`${l.tile} ${l.cobalt} ${l.t1}`} data-lh-tile>
            <div data-lh-float>
              <span className={l.k}>{clean.label}</span>
              <b className={l.big}>
                <span data-lh-count data-from={clean.before} data-to={clean.current} data-dec={clean.precision}>
                  {formatValue(clean)}
                </span>
                %
              </b>
              <span className={l.bars} aria-hidden>
                {clean.series.map((v, i) => (
                  <i key={i} data-lh-bar style={{ height: `${28 + ((v - lo) / (hi - lo || 1)) * 72}%` }} />
                ))}
              </span>
              <span className={l.small}>Six months · teaching data</span>
            </div>
          </div>

          {/* tile 2: days in A/R, falling */}
          <div className={`${l.tile} ${l.coral} ${l.t2}`} data-lh-tile>
            <div data-lh-float>
              <span className={l.k}>{ar.label}</span>
              <b className={l.big}>
                <span data-lh-count data-from={ar.before} data-to={ar.current}>
                  {formatValue(ar)}
                </span>
                <ArrowDownRight aria-hidden className={l.arrow} />
              </b>
              <span className={l.small}>
                From {ar.before} against a target of {ar.target}
              </span>
            </div>
          </div>

          {/* tile 3: a lesson */}
          <div className={`${l.tile} ${l.teal} ${l.t3}`} data-lh-tile>
            <div data-lh-float className={l.row}>
              <PlayCircle aria-hidden className={l.ico} />
              <span>
                <span className={l.k}>Video lesson</span>
                <b className={l.mid}>Reading a remittance: CARC and RARC codes</b>
                <span className={l.progress} aria-hidden>
                  <i />
                </span>
              </span>
            </div>
          </div>

          {/* tile 4: the certificate */}
          <div className={`${l.tile} ${l.sun} ${l.t4}`} data-lh-tile>
            <div data-lh-float className={l.row}>
              <FileCheck2 aria-hidden className={l.ico} />
              <span>
                <span className={l.k}>Certificate of completion</span>
                <b className={l.mid}>Issued per course, with a serial anyone can verify</b>
              </span>
            </div>
          </div>
    </>
  );
  const scene = (
        <div className={l.stage} data-lh-stage>
          <figure className={l.art} data-lh-art>
            <Image
              src={art}
              alt="An illustrated revenue cycle operations floor: a front desk checking in a patient, coders and a billing team at their screens, a team lead at a board of charts, a clinician handing over a record, and a learner watching a video lesson, with claims flowing between the desks."
              priority
              placeholder="blur"
              sizes="(min-width: 1280px) 1200px, 100vw"
              className={l.img}
              data-lh-img
            />
          </figure>

          {tiles}
        </div>
  );

  return (
    <section className={`${s.hero} ${l.hero} ${stack ? l.stack : l.compact}`} ref={root}>
      <div className={`${s.wrap} ${stack ? "" : l.fill}`}>
        {stack ? (
          <>
            <div className={l.top}>
              <div className={l.copy}>{heading}</div>
              <div className={l.aside}>{intro}</div>
            </div>
            {sceneNode ? (
              <div className={l.sceneWrap} data-lh-stage>
                {sceneNode}
                <div className={l.tileRow}>{tiles}</div>
              </div>
            ) : (
              scene
            )}
          </>
        ) : (
          <div className={l.grid}>
            <div className={l.copy}>
              {heading}
              {intro}
            </div>
            {scene}
          </div>
        )}

        <div className={l.ticker} aria-label="The ten stages of the revenue cycle">
          <ul className={l.track}>
            {[...stages, ...stages].map((x, i) => (
              <li key={i} aria-hidden={i >= stages.length || undefined} data-tone={i % 4}>
                <span>{String((i % stages.length) + 1).padStart(2, "0")}</span>
                {x}
              </li>
            ))}
          </ul>
        </div>

        <dl className={l.facts} data-lh-in>
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
