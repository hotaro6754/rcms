import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Circle, ClipboardCheck } from "lucide-react";
import { requireActor } from "@/lib/actor";
import { courseAccess, getPublishedCourse } from "@/lib/services/learning/catalog";
import { progressFor } from "@/lib/services/learning/progress";
import { PageHead } from "@/components/platform/PlatformShell";
import { when } from "@/components/admin/kit";

/** A course's curriculum from its released version, with the learner's progress on it. */
export default async function CoursePage({ params }: { params: Promise<{ program: string }> }) {
  const { program: slug } = await params;
  const actor = await requireActor();
  const course = await getPublishedCourse(slug);
  if (!course) notFound();
  const access = await courseAccess(actor, course);
  if (!access.full) redirect(`/catalog/${slug}`);
  const s = course.snapshot;
  const progress = access.tracked ? await progressFor(actor.id, s) : null;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12">
      <Link href="/academy" className="text-micro text-muted-foreground hover:text-foreground">
        ← My academy
      </Link>
      <PageHead
        kicker={`${s.course.tier || "Course"} · version ${course.version}`}
        title={s.course.name}
        lede={
          <>
            {s.course.who}
            {access.reason === "staff_preview" && <span className="mt-2 block text-warning">Staff view: progress is not recorded.</span>}
          </>
        }
      />
      {progress && (
        <p className="text-data mt-6 text-[11px] tracking-[0.12em] text-subtle">
          {progress.lessonsDone} OF {progress.lessonsTotal} LESSONS COMPLETE · {progress.percent}%
        </p>
      )}
      <div className="mt-8 flex flex-col gap-4">
        {s.modules.map((m, i) => (
          <section key={m.id} className="rounded-[var(--radius)] border border-border bg-card">
            <header className="flex items-baseline gap-3 border-b border-border px-6 py-4">
              <span className="text-data text-micro font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="text-[1.05rem] leading-snug">{m.title}</h2>
              {progress && (
                <span className="text-data ml-auto shrink-0 text-micro text-muted-foreground">
                  {m.lessons.filter((l) => progress.done.has(l.id)).length}/{m.lessons.length}
                </span>
              )}
            </header>
            {m.summary && <p className="px-6 pt-3 text-[13px] text-muted-foreground">{m.summary}</p>}
            <ul className="divide-y divide-border">
              {m.lessons.map((l) => (
                <li key={l.id}>
                  <Link href={`/academy/${slug}/${l.id}`} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-secondary/60">
                    {progress?.done.has(l.id) ? <Check className="h-4 w-4 shrink-0 text-success" aria-label="Complete" /> : <Circle className="h-4 w-4 shrink-0 text-input" aria-hidden />}
                    <span className="min-w-0 flex-1 text-[13.5px]">{l.title}</span>
                    {l.assessment && <ClipboardCheck className="h-4 w-4 shrink-0 text-subtle" aria-label="Has an assessment" />}
                    <span className="text-data shrink-0 text-micro text-muted-foreground">{l.minutes} min</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-8 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
        Educational content, effective {when(s.course.effectiveDate)}; next scheduled review {when(s.course.reviewDate)}. It does not replace legal, coding, clinical, contractual or payer-specific guidance. Validate against current official sources and your organisation&apos;s procedures.
        {s.course.disclaimer ? ` ${s.course.disclaimer}` : ""}
      </p>
    </div>
  );
}
