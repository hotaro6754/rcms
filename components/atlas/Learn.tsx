"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Award, Check, Play } from "lucide-react";
import s from "./atlas.module.css";
import Image, { type StaticImageData } from "next/image";
import watchArt from "@/public/images/art3d/learn-watch.png";
import readArt from "@/public/images/art3d/learn-read.png";
import practiseArt from "@/public/images/art3d/learn-practise.png";
import proveArt from "@/public/images/art3d/learn-prove.png";
import certifyArt from "@/public/images/art3d/learn-certify.png";
import l from "./lively.module.css";

/* One illustration per step, from the RCMExcel set; decorative, so alt is empty. */
const ART: Record<string, StaticImageData> = { watch: watchArt, read: readArt, practise: practiseArt, prove: proveArt, certify: certifyArt };


type Step = { key: string; title: string; body: string; view: ReactNode };

/** A lecture scene for the video thumbnail: a presenter beside a slide with a claim form. */
function Scene() {
  return (
    <svg viewBox="0 0 320 180" className={s.scene} aria-hidden preserveAspectRatio="xMidYMid slice">
      <rect width="320" height="180" className={s.fSky} />
      <rect x="150" y="28" width="140" height="96" rx="6" className={`${s.fSurface} ${s.ln}`} />
      <path d="M162 44 H240 M162 56 H276 M162 68 H256 M162 80 H276 M162 92 H230" className={s.ln} />
      <rect x="250" y="96" width="30" height="18" rx="3" className={s.fWarm} />
      <circle cx="84" cy="70" r="16" className={`${s.fSurface} ${s.ln}`} />
      <path d="M56 140 V118 A28 28 0 0 1 112 118 V140" className={`${s.fSage} ${s.ln}`} />
      <path d="M108 106 L148 88" className={s.ln} />
      <rect x="0" y="140" width="320" height="40" className={s.fSand} />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    key: "watch",
    title: "Watch",
    body: "Short video lessons recorded from the work: real claim forms, remittances and worklists.",
    view: (
      <div className={s.ui}>
        <div className={s.uiTop}>
          <span className={s.mono}>Module 04 · Remittance</span>
          <span className={s.mono}>View-only</span>
        </div>
        <div className={s.thumb}>
          <Scene />
          <span className={s.play}>
            <Play aria-hidden fill="currentColor" />
          </span>
        </div>
        <div className={s.bar}>
          <i />
        </div>
        <ul className={s.list}>
          <li>
            <span>1 · What an 835 carries</span>
            <span className={s.mono}>04:12</span>
          </li>
          <li data-on>
            <span>2 · Reading CARC and RARC</span>
            <span className={s.mono}>06:40</span>
          </li>
          <li>
            <span>3 · Posting the remittance</span>
            <span className={s.mono}>05:05</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    key: "read",
    title: "Read",
    body: "Each lesson comes with its slide deck and a written reading, on any device.",
    view: (
      <div className={s.ui}>
        <div className={s.uiTop}>
          <span className={s.mono}>Slide 6 of 18</span>
          <span className={s.mono}>Deck</span>
        </div>
        <p className={s.slideTitle}>A clean claim, before it leaves</p>
        <ul className={s.bul}>
          <li>Eligibility verified for the date of service</li>
          <li>Prior authorization number attached</li>
          <li>CPT and ICD-10 pairs support medical necessity</li>
          <li>Modifiers applied where NCCI edits require them</li>
        </ul>
      </div>
    ),
  },
  {
    key: "practise",
    title: "Practise",
    body: "Work real-shaped cases: a denial, a remittance, a month-end number. Decide where to look first.",
    view: (
      <div className={s.ui}>
        <div className={s.uiTop}>
          <span className={s.mono}>Denial inventory</span>
          <span className={s.mono}>Illustrative</span>
        </div>
        <ul className={s.list}>
          <li data-on>
            <span>CO-50 · Not medically necessary</span>
            <span className={s.mono}>312</span>
          </li>
          <li>
            <span>CO-97 · Bundled service</span>
            <span className={s.mono}>1,876</span>
          </li>
          <li>
            <span>CO-16 · Missing information</span>
            <span className={s.mono}>988</span>
          </li>
          <li>
            <span>CO-29 · Timely filing expired</span>
            <span className={s.mono}>742</span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    key: "prove",
    title: "Prove",
    body: "An assessment closes every module, scored on the spot, with what to revisit.",
    view: (
      <div className={s.ui}>
        <div className={s.uiTop}>
          <span className={s.mono}>Question 7 of 10</span>
          <span className={s.mono}>Module test</span>
        </div>
        <p className={s.qText}>A claim denies with CARC 197. What do you check first?</p>
        <ul className={s.opts}>
          <li>
            <em>A</em> Timely filing limit
          </li>
          <li data-on>
            <em>
              <Check aria-hidden width={12} height={12} />
            </em>
            Prior authorization on file
          </li>
          <li>
            <em>C</em> Patient demographics
          </li>
        </ul>
      </div>
    ),
  },
  {
    key: "certify",
    title: "Certify",
    body: "Finish a course to earn its certificate, with a serial anyone can verify. Complete every course in a level for the level badge.",
    view: (
      <div className={s.cert}>
        <span className={s.mono}>Certificate of completion</span>
        <span className={s.certName}>Professional — Execution</span>
        <span className={s.certCourse}>Medical Billing Operations · AR and Denial Management</span>
        <span className={s.certFoot}>
          <span>RCMX-L2-7F3A-21KQ</span>
          <span className={s.seal}>
            <Award aria-hidden />
          </span>
        </span>
      </div>
    ),
  },
];

/** How a course works: five steps as tabs, the matching part of the product beside them. */
export function Learn() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  return (
    <div className={s.learn}>
      <div className={s.tabs} role="tablist" aria-label="How a course works">
        {STEPS.map((st, n) => (
          <button
            key={st.key}
            type="button"
            role="tab"
            id={`learn-tab-${st.key}`}
            aria-selected={n === i}
            aria-controls="learn-panel"
            tabIndex={n === i ? 0 : -1}
            className={s.tab}
            onClick={() => setI(n)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                e.preventDefault();
                setI((n + 1) % STEPS.length);
              }
              if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                e.preventDefault();
                setI((n - 1 + STEPS.length) % STEPS.length);
              }
            }}
          >
            {n === i && <motion.span layoutId="learn-tab" className={s.tabBg} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} />}
            <span className={s.num}>{String(n + 1).padStart(2, "0")}</span>
            <b>{st.title}</b>
            <span>{st.body}</span>
          </button>
        ))}
      </div>
      <div className={`${s.stageBox} ${l.learnBox}`} id="learn-panel" role="tabpanel" aria-labelledby={`learn-tab-${STEPS[i].key}`}>
        <AnimatePresence initial={false}>
          <motion.div
            key={`art-${STEPS[i].key}`}
            className={l.learnArt}
            initial={reduce ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image src={ART[STEPS[i].key]} alt="" fill sizes="(min-width: 1000px) 60vw, 100vw" placeholder="blur" style={{ objectFit: "cover" }} />
          </motion.div>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div
            key={STEPS[i].key}
            className={l.learnUi}
            initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {STEPS[i].view}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
