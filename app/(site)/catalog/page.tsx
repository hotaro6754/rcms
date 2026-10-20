import Link from "next/link";
import { LEVEL_BORDER } from "@/lib/level-accent";
import { listPublishedCourses, listPublishedLevels } from "@/lib/services/learning/catalog";
import { runScheduledPublications } from "@/lib/services/cms/release";
import { PageHeader } from "@/components/site/PageHeader";
import { SiteLink } from "@/components/site/SiteLink";
import { cn } from "@/lib/utils";
import { getPageContent } from "@/lib/site/content";
import { catalogPage } from "@/lib/site/pages/catalog";

export async function generateMetadata() {
  const c = await getPageContent(catalogPage);
  return { title: c.seo.title, description: c.seo.description };
}
export const dynamic = "force-dynamic";

const ACCENT = LEVEL_BORDER;

/**
 * The live catalogue: released courses only, grouped by learning level, searchable. Course
 * details and free previews are one click away; enrolling needs an account.
 */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; level?: string; free?: string }> }) {
  await runScheduledPublications().catch(() => []);
  const sp = await searchParams;
  const [levels, all, t] = await Promise.all([listPublishedLevels(), listPublishedCourses(), getPageContent(catalogPage)]);
  const q = sp.q?.trim().toLowerCase();
  const courses = all.filter(
    (c) =>
      (!q || [c.name, c.description, c.who, ...c.outcomes].some((t) => t?.toLowerCase().includes(q))) &&
      (!sp.level || levels.find((l) => l.slug === sp.level)?.id === c.levelId) &&
      (!sp.free || c.isFree || c.previews > 0),
  );

  return (
    <div className="mx-auto max-w-[1320px] px-6 pb-24">
      <PageHeader eyebrow={t.header.eyebrow} title={t.header.title} lead={t.header.lead} />

      <form role="search" className="mt-10 flex flex-wrap items-end gap-3 border-b border-border pb-6">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5 text-[12px] text-subtle">
          {t.search.searchLabel}
          <input name="q" defaultValue={sp.q} placeholder={t.search.placeholder || undefined} className="min-h-11 border-b border-input bg-transparent text-[16px] text-foreground outline-none focus:border-foreground" />
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] text-subtle">
          {t.search.levelLabel}
          <select name="level" defaultValue={sp.level ?? ""} className="min-h-11 border-b border-input bg-transparent text-[15px] text-foreground">
            <option value="">{t.search.allLevels}</option>
            {levels.map((l) => (
              <option key={l.id} value={l.slug}>
                {l.displayTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-3 text-[14px]">
          <input type="checkbox" name="free" value="1" defaultChecked={!!sp.free} /> {t.search.freeLabel}
        </label>
        <button className="min-h-11 rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-primary-hover">{t.search.button}</button>
      </form>

      {courses.length === 0 && <p className="mt-10 text-[15px] text-muted-foreground">{t.search.empty}</p>}

      <div className="mt-10 flex flex-col gap-14">
        {levels.map((l) => {
          const inLevel = courses.filter((c) => c.levelId === l.id);
          if (!inLevel.length) return null;
          return (
            <section key={l.id} aria-labelledby={`level-${l.slug}`}>
              <div className={cn("border-t-4 pt-4", ACCENT[l.accent] ?? "border-foreground")}>
                <p className="text-data text-[11px] tracking-[0.14em] text-subtle">{t.levels.levelPrefix} {l.sequence}</p>
                <h2 id={`level-${l.slug}`} className="mt-1 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight">
                  {l.displayTitle}
                </h2>
                <p className="mt-2 max-w-[70ch] text-[15px] text-muted-foreground">{l.shortDescription}</p>
                <p className="mt-2 text-[13px] text-subtle">
                  {l.audience} {l.estimatedEffort && `· ${l.estimatedEffort}`} {l.assessmentRequirement && `· ${t.levels.assessedBy} ${l.assessmentRequirement.toLowerCase()}`}
                </p>
              </div>
              <ul className="mt-6 grid gap-5 md:grid-cols-2">
                {inLevel.map((c) => (
                  <li key={c.id} className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-5">
                    <h3 className="text-[1.2rem] leading-snug">
                      <Link href={`/catalog/${c.slug}`} className="hover:underline hover:underline-offset-4">
                        {c.name}
                      </Link>
                    </h3>
                    {c.description && <p className="mt-2 line-clamp-3 text-[14px] text-muted-foreground">{c.description}</p>}
                    <p className="text-data mt-4 text-[11px] tracking-[0.08em] text-subtle">
                      {c.modules} {t.cards.modules} · {c.lessons} {t.cards.lessons} · {Math.round(c.minutes / 60) || "<1"} {t.cards.hours} · {c.assessments} {t.cards.assessments}
                      {c.difficulty ? ` · ${c.difficulty.toUpperCase()}` : ""}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-5 text-[14px]">
                      <span className="font-medium">{c.isFree ? t.cards.free : c.price ? `₹${(c.price.amount / 100).toLocaleString("en-IN")}` : t.cards.noPrice}</span>
                      {c.includedInSubscription && !c.isFree && <span className="text-[12.5px] text-muted-foreground">{t.cards.subscription}</span>}
                      {c.previews > 0 && <span className="text-[12.5px] text-brand">{c.previews} {c.previews === 1 ? t.cards.previewOne : t.cards.previewMany}</span>}
                      <Link href={`/catalog/${c.slug}`} className="ml-auto underline underline-offset-4">
                        {t.cards.details}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-16 max-w-[75ch] text-[12.5px] leading-relaxed text-muted-foreground">
        {t.disclaimer.text} <SiteLink link={t.disclaimer.link} className="underline" />
        {t.disclaimer.after}
      </p>
    </div>
  );
}
