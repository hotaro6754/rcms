import Link from "next/link";
import { listPublishedCourses, listPublishedLevels } from "@/lib/services/learning/catalog";
import { runScheduledPublications } from "@/lib/services/cms/release";
import { PageHeader } from "@/components/site/PageHeader";
import { cn } from "@/lib/utils";

export const metadata = { title: "Course catalogue", description: "Every released course, by learning level: Trainee, Professional and Leadership." };
export const dynamic = "force-dynamic";

const ACCENT: Record<string, string> = { teal: "border-[#2f7d76]", blue: "border-[#2e5f9e]", navy: "border-[#1d2b4a]" };

/**
 * The live catalogue: released courses only, grouped by learning level, searchable. Course
 * details and free previews are one click away; enrolling needs an account.
 */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string; level?: string; free?: string }> }) {
  await runScheduledPublications().catch(() => []);
  const sp = await searchParams;
  const [levels, all] = await Promise.all([listPublishedLevels(), listPublishedCourses()]);
  const q = sp.q?.trim().toLowerCase();
  const courses = all.filter(
    (c) =>
      (!q || [c.name, c.description, c.who, ...c.outcomes].some((t) => t?.toLowerCase().includes(q))) &&
      (!sp.level || levels.find((l) => l.slug === sp.level)?.id === c.levelId) &&
      (!sp.free || c.isFree || c.previews > 0),
  );

  return (
    <div className="mx-auto max-w-[1320px] px-6 pb-24">
      <PageHeader eyebrow="Catalogue" title="Start at your level." lead="New to RCM, managing workflows, or leading performance? Every course below is released, reviewed, and dated." />

      <form role="search" className="mt-10 flex flex-wrap items-end gap-3 border-b border-border pb-6">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5 text-[12px] text-subtle">
          SEARCH
          <input name="q" defaultValue={sp.q} placeholder="denials, eligibility, KPI…" className="min-h-11 border-b border-input bg-transparent text-[16px] text-foreground outline-none focus:border-foreground" />
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] text-subtle">
          LEVEL
          <select name="level" defaultValue={sp.level ?? ""} className="min-h-11 border-b border-input bg-transparent text-[15px] text-foreground">
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l.id} value={l.slug}>
                {l.displayTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-3 text-[14px]">
          <input type="checkbox" name="free" value="1" defaultChecked={!!sp.free} /> Free or with free previews
        </label>
        <button className="min-h-11 rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-primary-hover">Search</button>
      </form>

      {courses.length === 0 && <p className="mt-10 text-[15px] text-muted-foreground">No released courses match that. Try a broader search.</p>}

      <div className="mt-10 flex flex-col gap-14">
        {levels.map((l) => {
          const inLevel = courses.filter((c) => c.levelId === l.id);
          if (!inLevel.length) return null;
          return (
            <section key={l.id} aria-labelledby={`level-${l.slug}`}>
              <div className={cn("border-t-4 pt-4", ACCENT[l.accent] ?? "border-foreground")}>
                <p className="text-data text-[11px] tracking-[0.14em] text-subtle">LEVEL {l.sequence}</p>
                <h2 id={`level-${l.slug}`} className="mt-1 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight">
                  {l.displayTitle}
                </h2>
                <p className="mt-2 max-w-[70ch] text-[15px] text-muted-foreground">{l.shortDescription}</p>
                <p className="mt-2 text-[13px] text-subtle">
                  {l.audience} {l.estimatedEffort && `· ${l.estimatedEffort}`} {l.assessmentRequirement && `· Assessed by ${l.assessmentRequirement.toLowerCase()}`}
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
                      {c.modules} MODULES · {c.lessons} LESSONS · {Math.round(c.minutes / 60) || "<1"} H · {c.assessments} ASSESSMENTS
                      {c.difficulty ? ` · ${c.difficulty.toUpperCase()}` : ""}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-5 text-[14px]">
                      <span className="font-medium">{c.isFree ? "Free" : c.price ? `₹${(c.price.amount / 100).toLocaleString("en-IN")}` : "By arrangement"}</span>
                      {c.includedInSubscription && !c.isFree && <span className="text-[12.5px] text-muted-foreground">or with All-access</span>}
                      {c.previews > 0 && <span className="text-[12.5px] text-brand">{c.previews} free preview{c.previews === 1 ? "" : "s"}</span>}
                      <Link href={`/catalog/${c.slug}`} className="ml-auto underline underline-offset-4">
                        Details
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
        Educational and operational content only. It does not replace legal, coding, clinical, contractual or payer-specific guidance, and contains no patient information. Every course shows the date its content took effect and when it is next reviewed. See the <Link href="/legal/disclaimer" className="underline">educational disclaimer</Link>.
      </p>
    </div>
  );
}
