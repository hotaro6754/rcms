import Link from "next/link";
import { HeroSequence } from "@/components/hero/HeroSequence";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SiteNav } from "@/components/site/SiteNav";
import { CLIENT, HERO_METRICS, METRICS } from "@/lib/data/telemetry";
import { GovernanceRoom } from "@/components/governance/GovernanceRoom";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Preloader } from "@/components/site/Preloader";
import { PageReveals } from "@/components/site/PageReveals";
import { LottieView } from "@/components/illustration/LottieView";
import { SectionField } from "@/components/environment/SectionField";
import { SectionHead } from "@/components/home/SectionHead";
import { OpeningStatement } from "@/components/home/OpeningStatement";
import { SystemFlow } from "@/components/home/SystemFlow";
import { LearningPath } from "@/components/home/LearningPath";
import { OperationsLab } from "@/components/home/OperationsLab";
import { Leadership } from "@/components/home/Leadership";
import { Mentoring } from "@/components/home/Mentoring";
import { Founder } from "@/components/home/Founder";

/**
 * The homepage is one lesson, told in order:
 *
 *   hero          what this is, and the revenue cycle drawn, one claim at a time
 *   metrics       the teaching engagement the lessons work from
 *   01 problem    RCM isn't one process
 *   02 system     the revenue cycle as ten connected stages
 *   03 path       where to start, and where each level leads
 *   04 lab        the question an operator asks first
 *   05 review     a month reviewed, stage by stage
 *   06 leadership the ladder the curriculum climbs
 *   07 mentoring  time with someone who has run the floor
 *   08 founder    the experience behind it
 *   close         the ink band in the footer
 *
 * Content lives in lib/data; these components only present it.
 */
export default function Home() {
  return (
    <>
      <Preloader />
      <PageReveals />
      <SiteNav />

      <main id="top" className="editorial">
        <HeroSequence />

        <section id="metrics" className="bg-background">
          <div className="mx-auto max-w-[1320px] px-6 py-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-caps">A teaching engagement, in numbers</p>
                <h2 className="mt-3 text-[clamp(1.75rem,2.6vw,2.25rem)] leading-tight">{CLIENT.name}</h2>
              </div>
              <p className="max-w-[46ch] text-micro leading-relaxed text-muted-foreground">
                {CLIENT.specialty}, {CLIENT.providers} providers. Illustrative teaching data: every
                lesson, lab and review on this page works from these figures.
              </p>
            </div>

            {/* Phones: a sideways row that snaps card by card, rather than four full-height
                cards stacked into three screens of dashboard. */}
            <div className="-mx-6 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
              {HERO_METRICS.map((id) => (
                <div key={id} className="w-[84%] shrink-0 snap-start sm:w-auto">
                  <MetricCard metric={METRICS[id]} className="h-full" />
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/overview"
                className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Open the practice console
              </Link>
            </div>
          </div>
        </section>

        <OpeningStatement />

        <section id="system" className="border-t border-border bg-card/60">
          <div className="mx-auto max-w-[1320px] px-6 py-24 lg:py-32">
            <SectionHead
              index="02"
              kicker="The revenue cycle"
              title={
                <>
                  Ten stages. <em>One system.</em>
                </>
              }
              lead="Scroll to walk the cycle, stage by stage: what each one does, how it usually breaks, the number that gives it away, and where the Academy teaches it."
            />
            <SystemFlow />
          </div>
        </section>

        <LearningPath />

        <OperationsLab />

        {/* The month's review, stage by stage, in reading order. The agenda rail sticks under
            the nav and follows the stage being read. */}
        <section id="governance" className="relative isolate border-t border-border bg-card">
          <SectionField variant="radial" />
          <div className="mx-auto max-w-[1320px] px-6 pt-24 lg:pt-32">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end lg:gap-16">
              <SectionHead
                index="05"
                kicker="The monthly review"
                title={
                  <>
                    Watch a month <em>get reviewed.</em>
                  </>
                }
              />
              <div className="flex flex-col gap-5">
                <LottieView name="reporting" className="mx-auto w-full max-w-[17rem]" />
                <p data-reveal className="text-[15px] leading-relaxed text-muted-foreground">
                  Seven stages, in the order an operator actually runs them, from the snapshot to
                  the actions everyone leaves with. The agenda follows you as you read.
                </p>
              </div>
            </div>
          </div>
          {/* The review sits in the page's column, aligned with the heading above it, and in
              normal flow: every stage fully visible, nothing held or clipped. */}
          <div className="mx-auto max-w-[1320px] px-6 pb-24 pt-14 lg:pb-32">
            <GovernanceRoom flow />
          </div>
        </section>

        <Leadership />
        <Mentoring />
        <Founder />
      </main>

      <SiteFooter />
    </>
  );
}
