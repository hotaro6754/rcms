import Link from "next/link";
import { HeroSequence } from "@/components/hero/HeroSequence";
import { FlipTarget, REVEAL_PAIRS } from "@/components/hero/reveal-pairs";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SiteNav } from "@/components/site/SiteNav";
import { CLIENT, HERO_METRICS, METRICS } from "@/lib/data/telemetry";
import { PROGRAMS, inr } from "@/lib/data/catalog";
import { GovernanceRoom } from "@/components/governance/GovernanceRoom";
import { SiteFooter } from "@/components/site/SiteFooter";

const LADDER = [
  { level: "L1", role: "Associate", owns: "Own your output", metrics: "Touches/day, QA score" },
  { level: "L2", role: "Senior Analyst", owns: "Own a payer or denial category", metrics: "First-pass, appeal win rate" },
  { level: "L3", role: "Subject Matter Expert", owns: "Explain why the number moved", metrics: "Denial trend, RCA closure" },
  { level: "L4", role: "Team Lead", owns: "Own a capacity model", metrics: "Productivity, shrinkage, SLA" },
  { level: "L5", role: "Operations Manager", owns: "Own a P&L line and a client", metrics: "A/R > 90, cost to collect, DNFB" },
  { level: "L6", role: "Director / AVP", owns: "Own a portfolio", metrics: "Margin, net collection rate, automation ROI" },
];

export default function Home() {
  return (
    <>
      <SiteNav />

      <main id="top">
        <HeroSequence />

        {/* ============================================================
            The Flip destination. Sits directly below the hero so the
            transformation is visible without scrolling on most screens.
            ============================================================ */}
        <section id="metrics" className="border-t border-border bg-card/60">
          <div className="mx-auto max-w-[1320px] px-6 py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-caps">Live engagement</p>
                <h2 className="mt-3 text-[clamp(1.75rem,2.6vw,2.25rem)] leading-tight">
                  {CLIENT.name}
                </h2>
              </div>
              <p className="max-w-[46ch] text-micro leading-relaxed text-muted-foreground">
                {CLIENT.specialty}, {CLIENT.providers} providers. The figures the hero resolved to
                are these figures. Same module, same numbers, no second dataset.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {HERO_METRICS.map((id) => {
                const card = <MetricCard metric={METRICS[id]} className="h-full" />;
                return REVEAL_PAIRS.includes(id) ? (
                  <FlipTarget key={id} id={id}>
                    {card}
                  </FlipTarget>
                ) : (
                  <div key={id}>{card}</div>
                );
              })}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/overview"
                className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Open the operations console
              </Link>
              <Link
                href="/governance"
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Run the {CLIENT.reviewPeriod} review
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        <section id="tracks" className="border-t border-border">
          <span id="programs" className="sr-only" />
          <div className="mx-auto max-w-[1320px] px-6 py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
              <h2 className="text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.05]">
                Four tiers. One continuous ladder.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You enter at the level you actually work at and exit at the level you want to be
                hired for. Every tier ends with a portfolio artefact a hiring manager can read, not
                a completion certificate.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PROGRAMS.slice(0, 4).map((p) => (
                <article
                  key={p.name}
                  className={`flex flex-col rounded-[var(--radius)] border bg-card p-5 transition-colors ${
                    p.flag ? "border-primary" : "border-border hover:border-input"
                  }`}
                >
                  <div className="flex min-h-6 items-center justify-between gap-2">
                    <span className="text-data text-micro font-semibold text-muted-foreground">
                      {p.tier}
                    </span>
                    {p.flag && (
                      <span className="rounded-full bg-accent px-2.5 py-0.5 text-micro font-semibold text-accent-foreground">
                        {p.flag}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-[1.55rem] leading-tight">{p.name}</h3>
                  <p className="mt-2 text-micro leading-relaxed text-muted-foreground">{p.who}</p>
                  <p className="text-data mt-4 border-t border-border pt-4 text-lg font-medium">
                    {inr(p.price)}{" "}
                    <span className="font-sans text-micro font-normal text-muted-foreground">
                      / {p.weeks}
                    </span>
                  </p>
                  <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                    {p.outcomes.slice(0, 4).map((o) => (
                      <li key={o} className="flex gap-2.5 text-micro leading-relaxed">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-[1px] bg-primary" />
                        <span className="text-secondary-foreground">{o}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        <section id="ladder" className="border-t border-border bg-card/60">
          <div className="mx-auto max-w-[1320px] px-6 py-20">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
              <h2 className="text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.05]">
                Each level is the metric you are trusted to own.
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Working claims, then managing queues, then understanding metrics, then diagnosing
                root causes, then owning outcomes. The Academy teaches the same progression the
                product performs.
              </p>
            </div>

            <div className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[46rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="label-caps py-3 pr-4 font-medium">Level</th>
                    <th className="label-caps py-3 pr-4 font-medium">Role</th>
                    <th className="label-caps py-3 pr-4 font-medium">What you own</th>
                    <th className="label-caps py-3 font-medium">Metrics owned</th>
                  </tr>
                </thead>
                <tbody>
                  {LADDER.map((r) => (
                    <tr key={r.level} className="border-b border-border last:border-0">
                      <td className="text-data py-3.5 pr-4 text-micro font-semibold text-primary">
                        {r.level}
                      </td>
                      <td className="py-3.5 pr-4 text-[13.5px] font-medium">{r.role}</td>
                      <td className="py-3.5 pr-4 text-[13.5px] text-muted-foreground">{r.owns}</td>
                      <td className="text-data py-3.5 text-micro text-muted-foreground">
                        {r.metrics}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        {/* ============================================================
            Scroll-locked walkthrough. The section pins and each further
            scroll advances one agenda stage, so a visitor sees the whole
            review run without clicking anything.
            ============================================================ */}
        <section id="governance" className="border-t border-border bg-card">
          <div className="mx-auto max-w-[1320px] px-6 pt-16">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-end">
              <h2 data-reveal className="text-[clamp(1.8rem,3.2vw,2.6rem)] leading-[1.05]">
                Watch a month get reviewed.
              </h2>
              <p data-reveal className="max-w-[58ch] text-[14px] leading-relaxed text-muted-foreground">
                Keep scrolling. The review advances one stage at a time, in the order an operator
                actually runs it, from the snapshot through to the actions they leave with.
              </p>
            </div>
          </div>
          <GovernanceRoom pinned />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
