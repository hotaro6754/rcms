"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { BrandMark } from "./BrandMark";
import p from "./preloader.module.css";

gsap.registerPlugin(SplitText, useGSAP);

const SEEN = "rcx.preloaded";

/**
 * First-visit preloader in the logo's own colours: the RCMExcel mark builds itself (the four
 * bars rise in turn, then the teal arrow sweeps up beneath them), the wordmark and "Learner to
 * Leader" land, a counter and a navy-to-teal bar fill, then navy and teal panels wipe upward to
 * reveal the page. Once per browser session; never under reduced motion. When it finishes it sets
 * html[data-preload="done"] and fires "rcx:loaded" for the hero.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const html = document.documentElement;
      const finish = () => {
        html.dataset.preload = "done";
        window.dispatchEvent(new Event("rcx:loaded"));
      };
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (html.dataset.preload !== "run" || reduce) {
        finish();
        return;
      }
      try {
        sessionStorage.setItem(SEEN, "1");
      } catch {
        /* storage blocked: it may show again next time */
      }
      document.body.style.overflow = "hidden";
      const split = SplitText.create("[data-pl-word]", { type: "chars", mask: "chars" });
      const count = { v: 0 };
      const num = root.current?.querySelector<HTMLElement>("[data-pl-num]");
      const tl = gsap.timeline({
        defaults: { ease: "expo.out" },
        onComplete: () => {
          document.body.style.overflow = "";
          finish();
        },
      });
      tl.from("[data-mark-bar]", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.9, stagger: 0.12, ease: "back.out(1.6)" })
        .from("[data-mark-arrow]", { opacity: 0, x: -60, y: 30, scale: 0.85, transformOrigin: "0% 100%", duration: 0.9, ease: "power3.out" }, 0.45)
        .from(split.chars, { yPercent: 110, duration: 0.8, stagger: 0.035 }, 0.6)
        .from("[data-pl-tag]", { y: 10, opacity: 0, duration: 0.6 }, 1.05)
        .to(count, { v: 100, duration: 1.5, ease: "power2.inOut", onUpdate: () => num && (num.textContent = String(Math.round(count.v)).padStart(3, "0")) }, 0)
        .from("[data-pl-fill]", { scaleX: 0, transformOrigin: "0 50%", duration: 1.5, ease: "power2.inOut" }, 0)
        .to("[data-pl-center], [data-pl-foot]", { y: -24, opacity: 0, duration: 0.5, ease: "power3.in" }, 1.9)
        .to("[data-pl-panel]", { yPercent: -100, duration: 0.9, ease: "expo.inOut", stagger: 0.08 }, 2.2)
        .set(root.current, { display: "none" });
      // Never hold the page: if frames are throttled, jump to the end.
      const guard = window.setTimeout(() => tl.progress(1), 5000);
      return () => {
        window.clearTimeout(guard);
        split.revert();
        document.body.style.overflow = "";
      };
    },
    { scope: root },
  );

  return (
    <>
      {/* Decide before first paint whether the preloader runs, so repeat visits never flash it. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var d=document.documentElement;var r=matchMedia("(prefers-reduced-motion: reduce)").matches;d.dataset.preload=(!r&&!sessionStorage.getItem("${SEEN}"))?"run":"done"}catch(e){document.documentElement.dataset.preload="done"}})();`,
        }}
      />
      <div ref={root} className={p.root} aria-hidden>
        <div className={p.panels}>
          <i data-pl-panel className={p.white} />
          <i data-pl-panel className={p.navy} />
          <i data-pl-panel className={p.teal} />
        </div>
        <div className={p.center} data-pl-center>
          <BrandMark className={p.mark} id="pl-mark" />
          <span className={p.word} data-pl-word>
            RCMEXCEL
          </span>
          <span className={p.tag} data-pl-tag>
            Learner to Leader
          </span>
        </div>
        <div className={p.foot} data-pl-foot>
          <span className={p.num} data-pl-num>
            000
          </span>
          <span className={p.track}>
            <i data-pl-fill />
          </span>
        </div>
      </div>
    </>
  );
}
