import Link from "next/link";
import { HeroSequence } from "@/components/hero/HeroSequence";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Preloader } from "@/components/site/Preloader";
import { PageReveals } from "@/components/site/PageReveals";
import { Chapter } from "@/components/home/Chapter";
import { OpeningStatement } from "@/components/home/OpeningStatement";
import { SystemFlow } from "@/components/home/SystemFlow";
import { LearningPath } from "@/components/home/LearningPath";
import { OperationsLab } from "@/components/home/OperationsLab";
import { Leadership } from "@/components/home/Leadership";
import { Mentoring } from "@/components/home/Mentoring";
import { Founder } from "@/components/home/Founder";
import { ReviewPack } from "@/components/home/ReviewPack";
import { LottieView } from "@/components/illustration/LottieView";

/**
 * The homepage is one case file: the claim, at a different moment in each chapter, on a
 * surface chosen for that moment.
 *
 *   hero        the claim is written                 desk, the claim as the one warm object
 *   01 problem  RCM isn't one process                ink, type across the viewport
 *   02 cycle    the claim moves through a system     desk, a ledger spread
 *   03 path     the claim, decoded level by level    white sheet, a prospectus
 *   04 lab      the claim, investigated              charcoal desk, papers on it
 *   05 review   the claim becomes data               desk, one page of the board pack
 *   06 people   the people behind every number       desk, a ledger that draws on hover
 *   07 advice   someone who has run the floor        charcoal, a paper calendar on it
 *   08 author   who wrote the curriculum             desk, set like a colophon
 *   close       the file closes                      ink
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

        <OpeningStatement />

        <Chapter id="system" folio="02" title="The cycle">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
            <h2 data-reveal className="text-[clamp(2.2rem,3.8vw,3.4rem)] leading-[1.04]">
              Ten stages, and a claim has to clear every one of them.
            </h2>
            <p data-reveal className="max-w-[40ch] text-[15px] leading-relaxed text-muted-foreground">
              Scroll through them in order: what each stage does, how it usually breaks, the number
              that gives it away, and where the Academy teaches it.
            </p>
          </div>
          <div className="mt-14">
            <SystemFlow />
          </div>
        </Chapter>

        <LearningPath />

        <OperationsLab />

        {/* The month's review, as the first page of the board pack. */}
        <Chapter id="governance" folio="05" title="The review">
          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div>
              <h2 data-reveal className="max-w-[18ch] text-[clamp(2.2rem,3.8vw,3.4rem)] leading-[1.04]">
                Then it becomes a number someone has to explain.
              </h2>
              <p data-reveal className="mt-6 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
                The lab found the cause. At month end it goes upward as a page like this one: the
                measures against target, why each one moved, and what has to be decided before the
                client call.
              </p>
            </div>
            <LottieView name="reporting" className="hidden w-full max-w-[17rem] lg:block" />
          </div>
          <div className="mt-14">
            <ReviewPack />
          </div>
          <Link
            href="/governance"
            className="mt-10 inline-flex min-h-11 items-center gap-2 text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
          >
            Run the full seven-stage review: escalations, risk, capacity and actions
          </Link>
        </Chapter>

        <Leadership />
        <Mentoring />
        <Founder />
      </main>

      <SiteFooter />
    </>
  );
}
