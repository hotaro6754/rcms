import Link from "next/link";
import { LEVEL_BORDER } from "@/lib/level-accent";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { publicPaths } from "@/lib/services/learning/public-catalog";

export const metadata = {
  title: "Learning paths",
  description: "Trainee, Professional and Leadership: three levels from your first revenue cycle role to running operations.",
};

export const revalidate = 300;

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");
const ACCENT = LEVEL_BORDER;

/** The published learning levels and their released courses, from the CMS. */
export default async function LearningPathsPage() {
  const levels = await publicPaths();
  return (
    <>
      <PageHeader
        eyebrow="Learning paths"
        title="Start at the level you work at today."
        lead="Each level is defined by the work you can do at the end of it. Courses are released only after academic and compliance review, and every assessment uses synthetic, de-identified examples."
      />

      <Section>
        {levels.length === 0 && <p className="text-[15px] text-muted-foreground">No levels are published yet.</p>}
        <ol className="flex flex-col">
          {levels.map((level, i) => (
            <li key={level.slug} className="grid gap-8 border-b border-border py-10 first:pt-0 last:border-0 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <div className={`border-l-4 pl-5 ${ACCENT[level.accent] ?? "border-border"}`}>
                <p className="text-data text-micro font-semibold text-primary">LEVEL {i + 1}</p>
                <h2 className="mt-3 text-[1.6rem] leading-tight">{level.displayTitle}</h2>
                <p className="mt-3 text-[14px] leading-relaxed">{level.shortDescription}</p>
                {level.audience && <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{level.audience}</p>}
                {level.estimatedEffort && <p className="mt-3 text-micro text-muted-foreground">Typical effort: {level.estimatedEffort}</p>}
              </div>

              <div className="flex flex-col gap-5">
                <div className="rounded-[var(--radius)] border border-border bg-card p-6">
                  <p className="label-caps">Core topics</p>
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
                      <p className="label-caps mt-6">You leave able to</p>
                      <ul className="mt-3 flex flex-col gap-1.5 text-[13.5px]">
                        {level.outcomes.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div>
                  <p className="label-caps">Released courses</p>
                  {level.courses.length === 0 ? (
                    <p className="mt-2 text-[13.5px] text-muted-foreground">Courses for this level are in review and not yet released.</p>
                  ) : (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {level.courses.map((c) => (
                        <li key={c.slug}>
                          <Link href={`/catalog/${c.slug}`} className="inline-flex min-h-9 items-center rounded-md border border-input bg-card px-3 text-micro font-medium transition-colors hover:border-primary hover:text-primary">
                            {c.name} · {c.isFree ? "free" : c.price !== null ? inr(c.price) : "all-access"}
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

      <Section tint>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">Not sure which level you are on?</h2>
            <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
              Open a course and read its free preview lessons, or ask us. The Governance Room is a worked example of the Leadership level.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalog" className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover">
              Browse the catalogue
            </Link>
            <Link href="/pricing" className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
