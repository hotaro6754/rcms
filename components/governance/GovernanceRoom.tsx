"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
 * Two layouts, one review:
 *
 *   tabs (default, /governance)  one stage at a time; the agenda rail switches stages.
 *   flow (homepage)              every stage in order, in normal document flow, fully
 *                                visible. The agenda rail sticks under the nav and follows
 *                                the stage being read; a click scrolls to that stage.
 *
 * The homepage used to pin the room and advance stages on scroll. Long stages then had to
 * scroll inside a fixed frame, which read as the page being stuck. Flow mode never holds
 * the scroll and never clips a stage.
 *
 * Motion owns the agenda indicator and, in tabs mode, stage presence. No GSAP here.
 */
export function GovernanceRoom({ flow = false }: { flow?: boolean }) {
  const [stage, setStage] = useState<AgendaId>("snapshot");
  const index = AGENDA.findIndex((a) => a.id === stage);
  const current = AGENDA[index];
  const root = useRef<HTMLDivElement>(null);

  // Flow mode: follow the stage in the reading band, and keep the site nav on screen while
  // the review is in view so the sticky agenda rail always sits in the same place under it.
  useEffect(() => {
    if (!flow || !root.current) return;
    const el = root.current;
    const html = document.documentElement;
    const sections = AGENDA.map((a) => el.querySelector<HTMLElement>(`#review-${a.id}`)).filter(
      (n): n is HTMLElement => !!n,
    );
    const spy = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setStage(hit.target.id.replace("review-", "") as AgendaId);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach((s) => spy.observe(s));
    const hold = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) html.dataset.holdNav = "true";
      else delete html.dataset.holdNav;
    });
    hold.observe(el);
    return () => {
      spy.disconnect();
      hold.disconnect();
      delete html.dataset.holdNav;
    };
  }, [flow]);

  const goToStage = (id: AgendaId) => {
    if (!flow) {
      setStage(id);
      return;
    }
    root.current?.querySelector(`#review-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const rail = (
    <nav
      aria-label="Review agenda"
      className={cn(
        "sticky z-30 -my-1 overflow-x-auto py-1 backdrop-blur-md [scrollbar-width:none]",
        flow ? "top-[84px] bg-background/85" : "top-[72px] bg-card/85",
      )}
    >
      <ol className="flex min-w-max gap-1 rounded-[var(--radius)] border border-border bg-card p-1">
        {AGENDA.map((item, i) => {
          const active = item.id === stage;
          const done = i < index;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => goToStage(item.id)}
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
                    layoutId={flow ? "agenda-active-flow" : "agenda-active"}
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
  );

  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label-caps">Monthly operating review</p>
        {/* On the homepage this sits under the page's h1, so it must not be a second one. */}
        {flow ? (
          <h3 className="mt-2 font-display text-[clamp(1.5rem,2.2vw,1.9rem)] leading-tight">{CLIENT.name}</h3>
        ) : (
          <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">{CLIENT.name}</h1>
        )}
      </div>
      <p className="text-data text-micro text-muted-foreground">
        {CLIENT.reviewPeriod} · {CLIENT.specialty} · {CLIENT.providers} providers
      </p>
    </header>
  );

  if (flow) {
    return (
      <div ref={root} className="flex flex-col gap-6">
        {header}
        {rail}
        {AGENDA.map((item, i) => (
          <section
            key={item.id}
            id={`review-${item.id}`}
            aria-labelledby={`review-${item.id}-title`}
            className={cn("scroll-mt-[150px]", i > 0 && "border-t border-border pt-10")}
          >
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
              <h4 id={`review-${item.id}-title`} className="flex items-baseline gap-3 text-[17px] font-semibold">
                <span className="text-data text-micro text-brand">{String(i + 1).padStart(2, "0")}</span>
                {item.label}
              </h4>
              <p className="text-micro text-muted-foreground">{item.detail}</p>
            </div>
            <StageBody id={item.id} />
            {item.id === "actions" && (
              <div className="mt-6">
                <ExecutiveNotes />
              </div>
            )}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div ref={root} className="flex flex-col gap-5 p-4 lg:p-6">
      {header}
      {rail}

      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[17px] font-semibold">{current.label}</h2>
        <p className="text-micro text-muted-foreground">{current.detail}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0.1, 1] }}
        >
          <StageBody id={stage} />
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

function StageBody({ id }: { id: AgendaId }) {
  switch (id) {
    case "snapshot":
      return <Snapshot />;
    case "kpi":
      return <KpiReview />;
    case "escalations":
      return <EscalationList />;
    case "rca":
      return <RcaBoard />;
    case "risk":
      return <RiskMatrix />;
    case "capacity":
      return <CapacityPlanner />;
    case "actions":
      return <ActionRegister />;
    default:
      return null;
  }
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
