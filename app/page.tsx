import { HeroSequence } from "@/components/hero/HeroSequence";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PreviewBar } from "@/components/site/PreviewBar";
import { ThemeStyle } from "@/components/site/ThemeStyle";
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
import { SiteLink } from "@/components/site/SiteLink";
import { getPageContent } from "@/lib/site/content";
import { homePage } from "@/lib/site/pages/home";

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
 * Copy is edited from the website editor (lib/site/pages/home.ts, defaults drawn from lib/data);
 * these components only present it.
 */
/** Levels, courses and prices are read from the database and refreshed every five minutes. */
export const revalidate = 300;

async function loadPaths() {
  try {
    const { publicPaths } = await import("@/lib/services/learning/public-catalog");
    return await publicPaths();
  } catch (error) {
    // The rest of the homepage is static; without a database it still renders, and the
    // learning-path section says the guide is unavailable instead of inventing one.
    console.error("[home] learning paths unavailable", error);
    return [];
  }
}

async function loadMentoringPrices(): Promise<Record<string, number>> {
  try {
    const { publicPricing } = await import("@/lib/services/learning/public-catalog");
    return Object.fromEntries((await publicPricing()).mentoring.map((m) => [m.sku, m.amount]));
  } catch {
    return {};
  }
}

export async function generateMetadata() {
  const c = await getPageContent(homePage);
  return { title: c.seo.title, description: c.seo.description };
}

export default async function Home() {
  const [c, levels, mentoringPrices] = await Promise.all([getPageContent(homePage), loadPaths(), loadMentoringPrices()]);
  return (
    <>
      <Preloader />
      <PageReveals />
      <SiteNav />

      <main id="top" className="editorial">
        <HeroSequence content={c.hero} />

        {c.problem.show && <OpeningStatement content={c.problem} />}

        {c.system.show && (
          <Chapter id="system" folio="02" title={c.system.runningHead}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
              <h2 data-reveal className="text-[clamp(2.2rem,3.8vw,3.4rem)] leading-[1.04]">
                {c.system.title}
              </h2>
              <p data-reveal className="max-w-[40ch] text-[15px] leading-relaxed text-muted-foreground">
                {c.system.lead}
              </p>
            </div>
            <div className="mt-14">
              <SystemFlow content={c.system} />
            </div>
          </Chapter>
        )}

        {c.path.show && <LearningPath levels={levels} content={c.path} />}

        {c.lab.show && <OperationsLab content={c.lab} />}

        {/* The month's review, as the first page of the board pack. */}
        {c.review.show && (
          <Chapter id="governance" folio="05" title={c.review.runningHead}>
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <div>
                <h2 data-reveal className="max-w-[18ch] text-[clamp(2.2rem,3.8vw,3.4rem)] leading-[1.04]">
                  {c.review.title}
                </h2>
                <p data-reveal className="mt-6 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
                  {c.review.lead}
                </p>
              </div>
              <LottieView name="reporting" className="hidden w-full max-w-[17rem] lg:block" />
            </div>
            <div className="mt-14">
              <ReviewPack content={c.review} />
            </div>
            <SiteLink
              link={c.review.cta}
              className="mt-10 inline-flex min-h-11 items-center gap-2 text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
            />
          </Chapter>
        )}

        {c.people.show && <Leadership content={c.people} />}
        {c.mentoring.show && <Mentoring prices={mentoringPrices} content={c.mentoring} />}
        {c.founder.show && <Founder content={c.founder} />}
      </main>

      <SiteFooter />
      <PreviewBar />
      <ThemeStyle />
    </>
  );
}
