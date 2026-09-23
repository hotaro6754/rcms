"use client";

import { useRef } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap/register";
import { EASE, HERO_BEATS } from "@/lib/gsap/eases";
import { METRICS } from "@/lib/data/telemetry";
import { BlueprintGrid } from "./BlueprintGrid";
import { ClaimFlowPath } from "./ClaimFlowPath";
import { QueueNodes, QueueCounter } from "./QueueField";
import { MetricLine, KpiObject } from "./MetricResolve";
import { runProductReveal, revealTargets } from "./ProductReveal";
import { VIEW, queueNodes, survivorTargets } from "./geometry";

const QUEUE = METRICS["queue-depth"];
const DAYS = METRICS["days-in-ar"];

/**
 * The hero.
 *
 * Resting state is the RESOLVED composition: headline fully readable, metric line drawn,
 * counters showing where the operation landed. The timeline sets the "before" state inside
 * useGSAP, which runs before first paint, so there is no flash and a visitor without
 * JavaScript still gets a meaningful hero and a usable thumbnail.
 *
 * One master timeline with labels. Every beat is named in lib/gsap/eases.ts.
 */
export function HeroSequence() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      let cancelled = false;
      const splits: SplitText[] = [];
      const cleanups: (() => void)[] = [];
      let master: gsap.core.Timeline | null = null;
      const mm = gsap.matchMedia();

      const build = () => {
        if (cancelled || !root.current) return;
        // The build is asynchronous (it waits on document.fonts.ready), so an effect that
        // mounts, tears down and remounts can land two builds on the same element. That
        // produces nested SplitText masks and a second pass of "before" sets that re-hides
        // everything the first timeline already animated. Gate on the element itself.
        if (root.current.dataset.heroBuilt === "1") return;
        root.current.dataset.heroBuilt = "1";
        const q = gsap.utils.selector(root.current);

        mm.add(
          {
            reduced: "(prefers-reduced-motion: reduce)",
            desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
            tablet: "(min-width: 641px) and (max-width: 1023px) and (prefers-reduced-motion: no-preference)",
            mobile: "(max-width: 640px) and (prefers-reduced-motion: no-preference)",
          },
          (ctx) => {
            const { reduced, desktop, tablet } = ctx.conditions as Record<string, boolean>;

            // ---------------------------------------------------------------
            // Reduced motion: no sequence at all. The resolved composition is
            // already in the markup, so there is nothing to do but leave it.
            // ---------------------------------------------------------------
            if (reduced) {
              gsap.set(q(".claim-node"), { autoAlpha: 0 });
              survivorTargets.forEach((t) => {
                const home = queueNodes[t.nodeIndex];
                gsap.set(q(`[data-node="${t.nodeIndex}"]`), {
                  autoAlpha: 1,
                  x: t.x - home.x,
                  y: t.y - home.y,
                  fill: "var(--chart-1)",
                });
              });
              gsap.set(q(".queue-frame"), { autoAlpha: 0 });
              return;
            }

            const nodeCount = desktop ? 40 : tablet ? 24 : 0;
            const nodes = q(".claim-node").slice(0, nodeCount);
            const hiddenNodes = q(".claim-node").slice(nodeCount);

            // ---------------------------------------------------------------
            // "Before" state, applied pre-paint.
            // ---------------------------------------------------------------
            gsap.set(q(".bp-rule, .bp-tick"), { drawSVG: "0%" });
            gsap.set(q(".flow-rail, .stage-drop"), { drawSVG: "0%" });
            gsap.set(q(".metric-path"), { drawSVG: "0%" });
            gsap.set(
              q(".stage-label, .stage-node, .flow-caption, .metric-caption, .metric-vertex, .metric-axis"),
              { autoAlpha: 0 },
            );
            gsap.set(q(".metric-area"), { autoAlpha: 0, scaleY: 0, transformOrigin: "bottom" });
            gsap.set(q(".metric-callout"), { autoAlpha: 0, y: 6 });
            gsap.set(q(".queue-frame"), { autoAlpha: 0 });
            gsap.set(q(".kpi-object, .queue-counter"), { autoAlpha: 0, y: 10 });
            gsap.set(hiddenNodes, { autoAlpha: 0 });
            gsap.set(nodes, { autoAlpha: 0, scale: 0, transformOrigin: "center" });

            // Counters start at the "before" figure and are driven up/down by the timeline.
            const counter = { queue: QUEUE.before, days: DAYS.before };
            const queueEl = root.current!.querySelector<HTMLElement>(".queue-count");
            const kpiEl = root.current!.querySelector<HTMLElement>(".kpi-value");
            const paintCounters = () => {
              if (queueEl) queueEl.textContent = Math.round(counter.queue).toLocaleString("en-US");
              if (kpiEl) kpiEl.textContent = String(Math.round(counter.days));
            };
            paintCounters();

            // The Flip destinations are hidden pre-paint so the hero objects can land in
            // them. Restored by runProductReveal, or immediately if the flight never runs.
            const targets = document.querySelectorAll<HTMLElement>("[data-flip-target]");
            targets.forEach((t) => (t.style.visibility = "hidden"));

            // ---------------------------------------------------------------
            // Headline. One SplitText per phrase so each beat lands exactly.
            // ---------------------------------------------------------------
            const phraseSelectors = [".h-stop", ".h-queue", ".h-own", ".h-metric"];
            const lines: HTMLElement[][] = phraseSelectors.map((sel) => {
              // autoSplit is deliberately OFF. It re-splits on font load and resize,
              // which replaces the line elements and silently orphans every reference
              // the master timeline holds — the headline then appears un-animated while
              // the timeline animates detached nodes. GSAP's guidance is to build the
              // animation inside onSplit() when autoSplit is on; here the sequence has to
              // interleave four phrases with SVG beats in one timeline, so instead we
              // split once against the real font metrics (we already awaited
              // document.fonts.ready) and keep stable references. Each phrase is a short
              // single line by design, so re-wrapping on resize is not a concern.
              const split = SplitText.create(q(sel), {
                type: "lines",
                mask: "lines",
                autoSplit: false,
                linesClass: "hero-line",
              });
              splits.push(split);
              return split.lines as HTMLElement[];
            });

            gsap.set(lines.flat(), { yPercent: 108 });

            // Accent fill sweep, applied to both accent phrases: "step by step." and
            // "leadership.". Written straight to the element because GSAP does not pass
            // the vendor-prefixed background-clip through, and without it
            // `color: transparent` would simply erase the word. GSAP owns only the one
            // property that animates.
            const armFill = (el: HTMLElement | undefined) => {
              if (!el) return null;
              const st = el.style;
              st.backgroundImage =
                "linear-gradient(90deg, var(--primary) 50%, var(--foreground) 50%)";
              st.backgroundSize = "200% 100%";
              st.backgroundPosition = "100% 0";
              st.setProperty("-webkit-background-clip", "text");
              st.backgroundClip = "text";
              st.color = "transparent";
              return el;
            };
            const queueLine = armFill(lines[1][0]);
            const metricLine = armFill(lines[3][0]);

            // ---------------------------------------------------------------
            // Master timeline.
            // ---------------------------------------------------------------
            master = gsap.timeline({ defaults: { ease: EASE.exec } });
            const tl = master;

            // blueprint — the substrate is drawn first
            tl.addLabel("blueprint", HERO_BEATS.blueprint)
              .from(q(".hero-col"), { scaleY: 0, duration: 0.8, stagger: 0.035, ease: EASE.signal }, "blueprint")
              .from(q(".hero-rows"), { scaleY: 0, duration: 0.9, ease: EASE.signal }, "blueprint+=0.1")
              .to(q(".bp-rule"), { drawSVG: "100%", duration: 0.7, stagger: 0.05, ease: EASE.signal }, "blueprint")
              .to(q(".bp-tick"), { drawSVG: "100%", duration: 0.35, stagger: 0.012 }, "blueprint+=0.15");

            // flow — the claim lifecycle, left to right
            tl.addLabel("flow", HERO_BEATS.flow)
              .to(q(".flow-rail"), { drawSVG: "100%", duration: 0.85, ease: EASE.signal }, "flow")
              .to(q(".flow-caption"), { autoAlpha: 1, duration: 0.3 }, "flow+=0.1")
              .to(q(".stage-drop"), { drawSVG: "100%", duration: 0.25, stagger: 0.09 }, "flow+=0.25")
              .to(q(".stage-node"), { autoAlpha: 1, duration: 0.25, stagger: 0.09 }, "flow+=0.28")
              .to(q(".stage-label"), { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.09 }, "flow+=0.32");

            // stop — "Learn RCM" rises out of its mask
            tl.addLabel("stop", HERO_BEATS.stop).to(
              lines[0],
              { yPercent: 0, duration: 0.72 },
              "stop",
            );

            // queue — "step by step." locks, then work accumulates
            tl.addLabel("queue", HERO_BEATS.queue).to(
              lines[1],
              { yPercent: 0, duration: 0.72 },
              "queue",
            );
            if (queueLine) {
              tl.to(queueLine, { backgroundPosition: "0% 0", duration: 0.85 }, "queue+=0.1");
            }
            tl.to(q(".queue-frame"), { autoAlpha: 1, duration: 0.4 }, "queue+=0.15");
            tl.to(q(".queue-counter"), { autoAlpha: 1, y: 0, duration: 0.45 }, "queue+=0.2");

            if (nodeCount > 0) {
              tl.to(
                nodes,
                {
                  motionPath: {
                    path: "#flow-rail",
                    align: "#flow-rail",
                    alignOrigin: [0.5, 0.5],
                    start: 0,
                    end: 1,
                  },
                  autoAlpha: 1,
                  scale: 1,
                  duration: desktop ? 0.8 : 0.65,
                  ease: EASE.signal,
                  stagger: { each: desktop ? 0.014 : 0.02, from: "start" },
                },
                "queue+=0.1",
              ).to(
                nodes,
                {
                  x: 0,
                  y: 0,
                  duration: 0.5,
                  stagger: { each: desktop ? 0.012 : 0.018, from: "start" },
                },
                "queue+=0.9",
              );
            } else {
              // Mobile: no swarm. The block simply fills, which reads the same at that size.
              tl.to(
                q(".claim-node"),
                { autoAlpha: 1, scale: 1, duration: 0.5, stagger: { each: 0.012, grid: "auto", from: "start" } },
                "queue+=0.1",
              );
            }

            tl.to(
              counter,
              {
                queue: QUEUE.before,
                duration: 0.9,
                ease: "none",
                onUpdate: paintCounters,
                onStart: () => {
                  counter.queue = 0;
                },
              },
              "queue+=0.1",
            );

            // break — the queue resolves and recomposes into the metric's vertices
            tl.addLabel("break", HERO_BEATS.break);

            const survivorSel = survivorTargets.map((t) => `[data-node="${t.nodeIndex}"]`).join(",");
            const clearing = q(".claim-node").filter((n) => !n.matches(survivorSel));

            tl.to(
              clearing,
              {
                autoAlpha: 0,
                scale: 0,
                duration: 0.5,
                stagger: { each: 0.012, grid: [5, 8], from: "end" },
              },
              "break",
            );

            survivorTargets.forEach((t, i) => {
              const home = queueNodes[t.nodeIndex];
              tl.to(
                q(`[data-node="${t.nodeIndex}"]`),
                {
                  x: t.x - home.x,
                  y: t.y - home.y,
                  fill: "var(--chart-1)",
                  r: 3,
                  duration: 0.8,
                  delay: i * 0.05,
                },
                "break+=0.15",
              );
            });

            tl.to(q(".queue-frame"), { autoAlpha: 0, duration: 0.4 }, "break+=0.3")
              .to(
                counter,
                {
                  queue: QUEUE.current,
                  duration: 0.85,
                  ease: EASE.exec,
                  onUpdate: paintCounters,
                },
                "break+=0.15",
              );

            // own — "Grow into" arrives as a change in control
            tl.addLabel("own", HERO_BEATS.own).to(lines[2], { yPercent: 0, duration: 0.72 }, "own");

            // metric — the line draws through the surviving nodes and the word fills with the accent
            tl.addLabel("metric", HERO_BEATS.metric)
              .to(lines[3], { yPercent: 0, duration: 0.72 }, "metric")
              .to(q(".metric-caption"), { autoAlpha: 1, duration: 0.3 }, "metric")
              .to(q(".metric-axis"), { autoAlpha: 1, duration: 0.35, stagger: 0.05 }, "metric")
              .to(q(".metric-path"), { drawSVG: "100%", duration: 1.05, ease: EASE.signal }, "metric+=0.1")
              .to(q(".metric-area"), { autoAlpha: 1, scaleY: 1, duration: 0.7 }, "metric+=0.45")
              .to(q(".metric-callout"), { autoAlpha: 1, y: 0, duration: 0.5 }, "metric+=0.75")
              .to(q(".metric-vertex"), { autoAlpha: 1, duration: 0.3, stagger: 0.07 }, "metric+=0.25")
              .to(
                counter,
                { days: DAYS.current, duration: 0.9, ease: EASE.exec, onUpdate: paintCounters },
                "metric+=0.2",
              )
              .to(q(".kpi-object"), { autoAlpha: 1, y: 0, duration: 0.5 }, "metric+=0.35");

            if (metricLine) {
              tl.to(
                metricLine,
                { backgroundPosition: "0% 0", duration: 0.9, ease: EASE.exec },
                "metric+=0.15",
              );
            }

            // Section reveals across the page. Reversible on purpose: scrolling back up
            // puts them away again, so the page reads the same in both directions.
            gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
              gsap.from(node, {
                y: 22,
                autoAlpha: 0,
                duration: 0.6,
                ease: EASE.exec,
                scrollTrigger: {
                  trigger: node,
                  start: "top 88%",
                  end: "top 45%",
                  toggleActions: "play reverse play reverse",
                },
              });
            });

            // reveal — the hero objects become the dashboard metrics
            tl.addLabel("reveal", HERO_BEATS.reveal).call(
              () => runProductReveal(),
              undefined,
              "reveal",
            );

            // -----------------------------------------------------------
            // The hero must never sit parked in its "before" state.
            //
            // GSAP's ticker is driven by requestAnimationFrame, which a
            // browser does not fire for a hidden or backgrounded tab. A page
            // opened in a background tab therefore builds the timeline, holds
            // the headline inside its mask, and renders nothing until the tab
            // is looked at. So: hold at frame zero until the document is
            // actually visible, then play. And if the clock has passed the
            // point where the sequence should have finished and it still has
            // not started, snap to the resolved composition rather than show
            // an empty hero.
            // -----------------------------------------------------------
            tl.pause(0);

            const play = () => {
              if (document.visibilityState === "visible") tl.play();
            };
            document.addEventListener("visibilitychange", play);
            cleanups.push(() => document.removeEventListener("visibilitychange", play));
            play();

            const watchdog = window.setTimeout(
              () => {
                if (tl.progress() === 0) tl.progress(1);
                // Whatever happened above, no landing slot stays hidden.
                revealTargets();
              },
              (tl.totalDuration() + 3) * 1000,
            );
            cleanups.push(() => window.clearTimeout(watchdog));
          },
        );
      };

      /**
       * Tear the sequence down completely: timeline, SplitText instances, matchMedia
       * contexts and any listeners. Leaves the DOM exactly as it was rendered.
       */
      const teardown = () => {
        cleanups.splice(0).forEach((fn) => fn());
        master?.kill();
        master = null;
        splits.splice(0).forEach((s) => s.revert());
        mm.revert();
        revealTargets();
        if (root.current) delete root.current.dataset.heroBuilt;
      };

      // Split against the real font metrics, never the fallback.
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(build);
      } else {
        build();
      }

      /**
       * With autoSplit off we own re-splitting. Line boxes are measured from the container,
       * so any width change leaves them stale — and a container measured at zero width (a
       * hidden or not-yet-laid-out pane) produces line boxes that never render. Rebuilding
       * the whole sequence on a settled resize keeps one master timeline while still
       * surviving font load, orientation change and a late first layout.
       */
      let resizeTimer = 0;
      let lastWidth = el.getBoundingClientRect().width;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        if (Math.abs(width - lastWidth) < 2) return;
        lastWidth = width;
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (cancelled) return;
          teardown();
          build();
        }, 180);
      });
      observer.observe(el);

      return () => {
        cancelled = true;
        observer.disconnect();
        window.clearTimeout(resizeTimer);
        teardown();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} data-gsap-scope className="hero-root relative">
      {/* The grid the layout is actually built on, made visible: twelve columns on
          desktop and four on mobile, crossed by six horizontal rules. It is the drawing
          surface the hero SVG sits on, not decoration. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mx-auto max-w-[1320px] px-6"
      >
        <div className="grid h-full grid-cols-4 lg:grid-cols-12">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className={`hero-col block h-full origin-top border-l border-border ${
                i === 11 ? "border-r" : ""
              } ${i > 3 ? "hidden lg:block" : ""}`}
            />
          ))}
        </div>
      </div>
      {/* Horizontal rules at a regular 88px interval rather than fractions of an
          arbitrary container height, which is what made them look uneven. Faded at both
          ends so they never collide with a section border. */}
      <div
        aria-hidden="true"
        className="hero-rows pointer-events-none absolute inset-0 mx-auto max-w-[1320px] origin-top px-6"
      />

      <div className="relative mx-auto grid max-w-[1320px] items-center gap-12 px-6 pb-14 pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)] lg:gap-16 lg:pb-20 lg:pt-32">
        {/* ---------------------------------------------------------------- */}
        <div>
          <p className="label-caps">RCM and operations management</p>

          <h1 className="mt-6 text-[clamp(2.05rem,5.6vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.045em]">
            <span className="h-stop phrase block w-fit whitespace-nowrap">Learn RCM</span>
            <span className="h-queue phrase block w-fit whitespace-nowrap">step by step.</span>
            <span className="h-own phrase mt-2 block w-fit whitespace-nowrap">Grow into</span>
            <span className="h-metric phrase block w-fit whitespace-nowrap">leadership.</span>
          </h1>

          <p className="mt-7 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
            A structured path through US healthcare revenue cycle and operations management, from
            your first claim to running a team and a client. Each level builds on the one before,
            with practical work at every step, so you always know what to learn next and why it
            matters.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#programs"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              See the learning path
            </a>
            <a
              href="/governance"
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              See how a monthly review runs
            </a>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t border-border pt-6 text-micro text-muted-foreground">
            <div>
              <dt className="inline font-semibold text-foreground">6 levels</dt>{" "}
              <dd className="inline">mapped, associate to AVP</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-foreground">HFMA MAP Keys</dt>{" "}
              <dd className="inline">used throughout</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-foreground">Live scenarios</dt>{" "}
              <dd className="inline">not quizzes</dd>
            </div>
          </dl>
        </div>

        {/* ---------------------------------------------------------------- */}
        <div className="relative">
          <svg
            viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
            className="block w-full overflow-visible"
            role="img"
            aria-label={`Claim lifecycle from charge to posting, with an accumulated worklist of ${QUEUE.before.toLocaleString("en-US")} claims resolving to ${QUEUE.current.toLocaleString("en-US")}, and days in accounts receivable falling from ${DAYS.before} to ${DAYS.current}.`}
          >
            <BlueprintGrid />
            <ClaimFlowPath />
            <QueueNodes />
            <MetricLine />
          </svg>
          <QueueCounter />
          <KpiObject />
        </div>
      </div>
    </div>
  );
}
