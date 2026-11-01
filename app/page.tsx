import { HeroSequence } from "@/components/hero/HeroSequence";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { PreviewBar } from "@/components/site/PreviewBar";
import { ThemeStyle } from "@/components/site/ThemeStyle";
import { PageStyles } from "@/components/site/PageStyles";
import { SiteScope } from "@/components/site/SiteScope";
import { PageReveals } from "@/components/site/PageReveals";
import { Chapter, SectionIntro } from "@/components/home/Chapter";
import levelsFigure from "@/public/images/figma/learning-levels-progression.webp";
import { OpeningStatement } from "@/components/home/OpeningStatement";
import { SystemFlow } from "@/components/home/SystemFlow";
import { LearningPath } from "@/components/home/LearningPath";
import { OperationsLab } from "@/components/home/OperationsLab";
import { Leadership } from "@/components/home/Leadership";
import { Mentoring } from "@/components/home/Mentoring";
import { Founder } from "@/components/home/Founder";
import { ReviewPack } from "@/components/home/ReviewPack";
import Image from "next/image";
import { AtAGlance } from "@/components/home/AtAGlance";
import { SYSTEM } from "@/lib/data/system";
import { MENTORING } from "@/lib/data/catalog";
import reviewPhoto from "@/public/images/photos/operating-review-meeting.webp";
import { SiteLink } from "@/components/site/SiteLink";
import { getPageContent } from "@/lib/site/content";
import { homePage } from "@/lib/site/pages/home";
import { jsonLd, organisationLd, pageMeta, siteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/brand";

/**
 * The homepage follows one case — Claim #20481 — through the revenue cycle, as a sequence of
 * clearly bounded sections a professional reader can scan or jump between (every section is
 * also reachable from the top bar's Practice menu):
 *
 *   hero        what RCMExcel is, and the claim filled in stage by stage
 *   glance      the four parts of the page, as counts taken from the content
 *   01 problem  RCM isn't one process: six facts in a grid
 *   02 cycle    the ten stages, explored stage by stage, plus the full table
 *   03 path     the learning levels as three cards, with live courses and prices
 *   04 lab      the denial investigation: the first question, then the five whys
 *   05 review   the month's operating review, one page of the board pack
 *   06 people   six levels of career progression and the number each one owns
 *   07 advice   one-to-one mentoring sessions
 *   08 author   who wrote the curriculum
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
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/", absoluteTitle: true });
}

export default async function Home() {
  const [c, levels, mentoringPrices] = await Promise.all([getPageContent(homePage), loadPaths(), loadMentoringPrices()]);
  return (
    <>
      <PageReveals />
      <SiteScope>
        <SiteNav />

        <main id="top" className="editorial">
          <HeroSequence content={c.hero} />

          {c.glance.show && (
            <AtAGlance
              caption={c.glance.caption}
              items={[
                { count: SYSTEM.length, label: c.glance.stages, href: "#system" },
                { count: levels.length, label: c.glance.levels, href: "#tracks" },
                { count: c.people.show ? c.people.roles.length : 0, label: c.glance.roles, href: "#people" },
                { count: c.mentoring.show ? MENTORING.filter((m) => mentoringPrices[`mentoring-${m.id}`] !== undefined).length : 0, label: c.glance.sessions, href: "#mentoring" },
              ]}
            />
          )}

          {c.problem.show && <OpeningStatement content={c.problem} />}

          {c.system.show && (
            <Chapter id="system" folio="02" title={c.system.runningHead} surface="white">
              <SectionIntro title={c.system.title} lead={c.system.lead} />
              <div className="mt-12">
                <SystemFlow content={c.system} />
              </div>
              <figure data-reveal className="mt-12 rounded-xl border border-border bg-card p-4 sm:p-6">
                <figcaption className="mb-2 text-[17px] font-bold">{c.system.levelsFigureTitle}</figcaption>
                <div className="overflow-x-auto">
                  <Image
                    src={levelsFigure}
                    alt={`Where each stage is taught. ${c.system.levelNames.trainee}: Registration and Eligibility. ${c.system.levelNames.professional}: Authorization, Charge capture, Coding, Claim submission, Remittance, Payment posting, A/R follow-up, and Denials and recovery. ${c.system.levelNames.leadership}: the monthly operating review, and escalations, risk, capacity and actions.`}
                    sizes="(min-width: 1280px) 1200px, 100vw"
                    className="h-auto w-full min-w-[40rem]"
                  />
                </div>
              </figure>
            </Chapter>
          )}

          {c.path.show && <LearningPath levels={levels} content={c.path} />}

          {c.lab.show && <OperationsLab content={c.lab} />}

          {/* The month's review, as the first page of the board pack. */}
          {c.review.show && (
            <Chapter id="governance" folio="05" title={c.review.runningHead} surface="tint">
              <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
                <div>
                  <h2 data-reveal className="max-w-[24ch] text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.1]">
                    {c.review.title}
                  </h2>
                  <p data-reveal className="mt-5 max-w-[56ch] text-[16px] leading-relaxed text-muted-foreground">
                    {c.review.lead}
                  </p>
                </div>
                <figure data-reveal className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                  <Image src={reviewPhoto} alt="Three colleagues reviewing documents together at a meeting table" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" placeholder="blur" />
                </figure>
              </div>
              <div className="mt-12">
                <ReviewPack content={c.review} />
              </div>
              <SiteLink
                link={c.review.cta}
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-md border border-input bg-background px-5 text-[15px] font-semibold transition-colors hover:bg-muted"
              />
            </Chapter>
          )}

          {c.people.show && <Leadership content={c.people} />}
          {c.mentoring.show && <Mentoring prices={mentoringPrices} content={c.mentoring} />}
          {c.founder.show && <Founder content={c.founder} />}
        </main>

        <SiteFooter />
      </SiteScope>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@graph": [organisationLd(), { "@type": "WebSite", name: BRAND.name, url: siteUrl().origin }] }) }} />
      <PreviewBar />
      <ThemeStyle />
      <PageStyles />
    </>
  );
}
