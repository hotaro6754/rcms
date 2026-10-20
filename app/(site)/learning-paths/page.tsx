import Link from "next/link";
import { LEVEL_BORDER } from "@/lib/level-accent";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { SiteLink } from "@/components/site/SiteLink";
import { publicPaths } from "@/lib/services/learning/public-catalog";
import { getPageContent } from "@/lib/site/content";
import { learningPathsPage } from "@/lib/site/pages/learning-paths";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  const c = await getPageContent(learningPathsPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/learning-paths" });
}

export const revalidate = 300;

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");
const ACCENT = LEVEL_BORDER;

/** The published learning levels and their released courses, from the CMS. */
export default async function LearningPathsPage() {
  const [levels, content] = await Promise.all([publicPaths(), getPageContent(learningPathsPage)]);
  const t = content.levels;
  return (
    <>
      <PageHeader eyebrow={content.header.eyebrow} title={content.header.title} lead={content.header.lead} />

      <Section>
        {levels.length === 0 && <p className="text-[15px] text-muted-foreground">{t.empty}</p>}
        <ol className="flex flex-col">
          {levels.map((level, i) => (
            <li key={level.slug} className="grid gap-8 border-b border-border py-10 first:pt-0 last:border-0 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <div className={`border-l-4 pl-5 ${ACCENT[level.accent] ?? "border-border"}`}>
                <p className="text-data text-micro font-semibold text-primary">
                  {t.levelLabel} {i + 1}
                </p>
                <h2 className="mt-3 text-[1.6rem] leading-tight">{level.displayTitle}</h2>
                <p className="mt-3 text-[14px] leading-relaxed">{level.shortDescription}</p>
                {level.audience && <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{level.audience}</p>}
                {level.estimatedEffort && (
                  <p className="mt-3 text-micro text-muted-foreground">
                    {t.effortLabel} {level.estimatedEffort}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-5">
                <div className="rounded-[var(--radius)] border border-border bg-card p-6">
                  <p className="label-caps">{t.topicsLabel}</p>
                  <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {level.coreTopics.map((m) => (
                      <li key={m} className="flex gap-2.5 text-[13.5px] leading-snug">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-[1px] bg-primary" />
                        <span className="text-secondary-foreground">{m}</span>
                      </li>
                    ))}
                  </ul>
                  {level.outcomes.length > 0 && (
                    <>
                      <p className="label-caps mt-6">{t.outcomesLabel}</p>
                      <ul className="mt-3 flex flex-col gap-1.5 text-[13.5px]">
                        {level.outcomes.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div>
                  <p className="label-caps">{t.coursesLabel}</p>
                  {level.courses.length === 0 ? (
                    <p className="mt-2 text-[13.5px] text-muted-foreground">{t.noCourses}</p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {level.courses.map((c) => (
                        <li key={c.slug}>
                          <Link href={`/catalog/${c.slug}`} className="inline-flex min-h-9 items-center rounded-md border border-input bg-card px-3 text-micro font-medium transition-colors hover:border-primary hover:text-primary">
                            {c.name} · {c.isFree ? t.free : c.price !== null ? inr(c.price) : t.allAccess}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {content.closing.show && (
        <Section tint>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">{content.closing.title}</h2>
              <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">{content.closing.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SiteLink
                link={content.closing.primary}
                className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              />
              <SiteLink
                link={content.closing.secondary}
                className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
              />
            </div>
          </div>
        </Section>
      )}
    </>
  );
}
