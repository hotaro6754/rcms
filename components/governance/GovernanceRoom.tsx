"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap/register";
import { AGENDA, ACTIONS, ESCALATIONS, RCA, RISKS, type AgendaId } from "@/lib/data/governance";
import {
  CLIENT,
  METRICS,
  formatValue,
  health,
  type MetricId,
} from "@/lib/data/telemetry";
import { StatusChip, StatusDot } from "@/components/dashboard/StatusIndicator";
import { KpiReview } from "./KpiReview";
import { EscalationList } from "./EscalationList";
import { RcaBoard } from "./RcaBoard";
import { RiskMatrix } from "./RiskMatrix";
import { CapacityPlanner } from "./CapacityPlanner";
import { ActionRegister } from "./ActionRegister";
import { ExecutiveNotes } from "./ExecutiveNotes";
import { cn, money } from "@/lib/utils";

const HEADLINE: MetricId[] = ["sla-adherence", "days-in-ar", "ar-over-90", "denial-rate"];

/**
 * A simulated monthly client review the learner conducts.
 *
 * @animation-ownership-exception: holds both libraries, but they touch disjoint things.
 * GSAP creates one ScrollTrigger that pins the section and reads scroll progress; it sets
 * no properties on any element Motion controls. Motion owns the agenda indicator and panel
 * presence. The pin is a scroll-position concern, not a transform on a Motion component.
 */
export function GovernanceRoom({ pinned = false }: { pinned?: boolean }) {
  const [stage, setStage] = useState<AgendaId>("snapshot");
  const index = AGENDA.findIndex((a) => a.id === stage);
  const current = AGENDA[index];
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const lastIndex = useRef(0);

  /**
   * Scroll-locked walkthrough. The section pins and each further scroll advances one
   * agenda stage, so the review plays out in the order an operator would actually run it.
   *
   * GSAP owns only the pin and the progress reading; it never animates a panel. Motion
   * still owns panel presence and the agenda indicator, so the ownership rule holds.
   *
   * Desktop only, and never under reduced motion: pinning hijacks the scroll position,
   * which is exactly the kind of thing a visitor who asked for less motion does not want.
   */
  useGSAP(
    () => {
      if (!pinned || !root.current) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const steps = AGENDA.length - 1;
        trigger.current = ScrollTrigger.create({
          trigger: root.current!,
          // Clear the floating navbar, or the pinned heading sits under it.
          start: "top 104px",
          end: () => "+=" + steps * 62 + "%",
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          snap: { snapTo: 1 / steps, duration: 0.25, ease: "power1.inOut" },
          // The floating navbar reads this and stops hiding while the section is pinned,
          // because snap scrolls the page itself and would otherwise flicker it shut.
          invalidateOnRefresh: true,
          onToggle(self) {
            document.documentElement.dataset.pinned = self.isActive ? "true" : "false";
          },
          onUpdate(self) {
            const i = Math.min(steps, Math.round(self.progress * steps));
            if (i === lastIndex.current) return;
            lastIndex.current = i;
            setStage(AGENDA[i].id);
          },
        });
        return () => {
          trigger.current?.kill();
          trigger.current = null;
          delete document.documentElement.dataset.pinned;
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [pinned] },
  );

  /** A click on the rail scrolls to that stage rather than fighting the pin. */
  const goToStage = (id: AgendaId, i: number) => {
    const st = trigger.current;
    if (!st) {
      setStage(id);
      return;
    }
    const steps = AGENDA.length - 1;
    window.scrollTo({ top: st.start + (i / steps) * (st.end - st.start), behavior: "smooth" });
  };

  return (
    <div ref={root} className={cn("flex flex-col gap-5 p-4 lg:p-6", pinned && "lg:pb-8 lg:pt-4")}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Monthly operating review</p>
          {/* On the homepage this sits under the hero's h1, so it must not be a second
              one. On its own route it is the page heading. */}
          {pinned ? (
            <h3 className="mt-2 font-display text-[clamp(1.5rem,2.2vw,1.9rem)] leading-tight">
              {CLIENT.name}
            </h3>
          ) : (
            <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">{CLIENT.name}</h1>
          )}
        </div>
        <p className="text-data text-micro text-muted-foreground">
          {CLIENT.reviewPeriod} · {CLIENT.specialty} · {CLIENT.providers} providers
        </p>
      </header>

      {/* Agenda rail */}
      <nav aria-label="Review agenda" className="sticky top-[72px] z-30 overflow-x-auto bg-card/85 backdrop-blur-md py-1 -my-1">
        <ol className="flex min-w-max gap-1 rounded-[var(--radius)] border border-border bg-card p-1">
          {AGENDA.map((item, i) => {
            const active = item.id === stage;
            const done = i < index;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goToStage(item.id, i)}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative flex min-h-10 items-center gap-2 rounded-md px-3 text-[13px] transition-colors",
                    active
                      ? "text-primary-foreground"
                      : done
                        ? "text-foreground hover:bg-secondary"
                        : "text-muted-foreground hover:bg-secondary",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="agenda-active"
                      className="absolute inset-0 rounded-md bg-primary"
                      transition={{ duration: 0.26, ease: [0.2, 0, 0.1, 1] }}
                    />
                  )}
                  <span className="text-data relative text-[11px] opacity-70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="relative whitespace-nowrap font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[17px] font-semibold">{current.label}</h2>
        <p className="text-micro text-muted-foreground">{current.detail}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={stage}
          className={pinned ? "gov-panel" : undefined}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0.1, 1] }}
        >
          {stage === "snapshot" && <Snapshot />}
          {stage === "kpi" && <KpiReview />}
          {stage === "escalations" && <EscalationList />}
          {stage === "rca" && <RcaBoard />}
          {stage === "risk" && <RiskMatrix />}
          {stage === "capacity" && <CapacityPlanner />}
          {stage === "actions" && <ActionRegister />}
        </motion.section>
      </AnimatePresence>

      {stage === "actions" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.08 }}
        >
          <ExecutiveNotes />
        </motion.div>
      )}
    </div>
  );
}

function Snapshot() {
  const openEsc = ESCALATIONS.filter((e) => e.status !== "resolved");
  const openActions = ACTIONS.filter((a) => a.status !== "complete");
  const topRisk = [...RISKS].sort((a, b) => b.probability * b.impact - a.probability * a.impact)[0];
  const atRisk = HEADLINE.map((id) => METRICS[id]).filter((m) => health(m) !== "on-target");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {HEADLINE.map((id) => {
          const m = METRICS[id];
          const s = health(m);
          return (
            <div key={id} className="bg-card p-4">
              <div className="flex items-center gap-2">
                <StatusDot status={s} />
                <span className="label-caps truncate text-[11px]">{m.short}</span>
              </div>
              <p className="text-data mt-2.5 text-[26px] font-medium leading-none">
                {formatValue(m)}
              </p>
              <p className="text-data mt-2 text-micro text-muted-foreground">
                target {formatValue(m, m.target)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="The one thing">
          <p className="text-[13.5px] leading-relaxed text-secondary-foreground">
            Inventory is winning: worklist depth, days in A/R and first-pass resolution all beat
            plan. {atRisk.length === 1 ? "One metric" : `${atRisk.length} metrics`} moved the wrong
            way, and it is the same cause each time.
          </p>
          <p className="mt-3 text-[13.5px] leading-relaxed text-secondary-foreground">
            {RCA.conclusion}
          </p>
        </Panel>

        <Panel title="Open escalations">
          <ul className="flex flex-col gap-3">
            {openEsc.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium">{e.title}</span>
                  <span className="text-data block text-micro text-muted-foreground">
                    {e.owner} · {e.slaHoursRemaining}h of SLA left
                  </span>
                </span>
                <span className="text-data shrink-0 text-micro text-muted-foreground">
                  {e.financialImpact ? money(e.financialImpact) : "—"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Decisions needed today">
          <ul className="flex flex-col gap-3">
            {openActions.slice(0, 3).map((a) => (
              <li key={a.id}>
                <span className="block text-[13.5px] leading-snug">{a.action}</span>
                <span className="text-data mt-1 block text-micro text-muted-foreground">
                  {a.owner} · due {a.due}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-micro font-semibold">Top risk</p>
            <p className="mt-1 text-micro leading-relaxed text-muted-foreground">
              {topRisk.title}. {topRisk.mitigation}
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-4">
      <h3 className="mb-3 text-[13.5px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export { StatusChip };
