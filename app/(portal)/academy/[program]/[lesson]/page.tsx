import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import { requireActor } from "@/lib/actor";
import { getPublishedCourse, lessonAccess } from "@/lib/services/learning/catalog";
import { moduleLock, recordLessonView, progressFor } from "@/lib/services/learning/progress";
import { isBookmarked } from "@/lib/services/learning/bookmarks";
import { BookmarkButton } from "@/components/portal/BookmarkButton";
import { attemptsFor } from "@/lib/services/learning/attempts";
import { flatLessons } from "@/lib/cms/snapshot";
import { Blocks } from "@/components/cms/BlockView";
import { LessonComplete } from "@/components/portal/LessonComplete";
import { StartAttempt } from "@/components/portal/StartAttempt";
import { StatusPill, when } from "@/components/admin/kit";
import { humanSize, typeLabel } from "@/lib/storage";

/**
 * One lesson, rendered from the course's released version. Access is checked on the server
 * for every lesson load: enrolled (or staff preview, or a free-preview lesson for anyone
 * signed in). Opening the lesson records a start; completion follows the lesson's rule.
 */
export default async function LessonPage({ params }: { params: Promise<{ program: string; lesson: string }> }) {
  const { program: slug, lesson: lessonId } = await params;
  const actor = await requireActor();
  const course = await getPublishedCourse(slug);
  if (!course) notFound();
  const flat = flatLessons(course.snapshot);
  const index = flat.findIndex((l) => l.id === lessonId);
  if (index < 0) notFound();
  const access = await lessonAccess(actor, course, lessonId);
  if (!access) redirect(`/catalog/${slug}`);

  const lesson = flat[index];
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;
  const lock = access.tracked ? await moduleLock(actor.id, course.snapshot, lesson.moduleId) : { locked: false, prerequisite: null };
  if (lock.locked) {
    const pre = course.snapshot.modules.find((m) => m.id === course.snapshot.modules.find((x) => x.id === lesson.moduleId)?.prerequisiteModuleId);
    const progressNow = await progressFor(actor.id, course.snapshot);
    const resume = pre?.lessons.find((l) => !progressNow.done.has(l.id)) ?? pre?.lessons[0];
    return (
      <div className="mx-auto max-w-[760px] px-6 py-16">
        <p className="label-caps">{lesson.moduleTitle}</p>
        <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.1rem)] leading-tight">This module opens after “{lock.prerequisite}”.</h1>
        <p className="mt-3 text-[14.5px] text-muted-foreground">Complete every lesson in that module first. Your progress is saved.</p>
        <div className="mt-6 flex gap-3">
          {resume && (
            <Link href={`/academy/${slug}/${resume.id}`} className="inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground">
              Continue “{lock.prerequisite}”
            </Link>
          )}
          <Link href={`/academy/${slug}`} className="inline-flex min-h-11 items-center rounded-[3px] border border-input px-5 text-[14px]">
            Course overview
          </Link>
        </div>
      </div>
    );
  }
  if (access.tracked) await recordLessonView(actor, course.id, lessonId);
  const bookmarked = access.tracked ? await isBookmarked(actor.id, lessonId) : false;
  const progress = access.tracked ? await progressFor(actor.id, course.snapshot) : null;
  const done = !!progress?.done.has(lessonId);
  const quiz = lesson.assessment;
  const tries = quiz && access.tracked ? await attemptsFor(actor.id, quiz.id) : [];
  const currentModule = course.snapshot.modules.find((m) => m.id === lesson.moduleId)!;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link href={access.full ? `/academy/${slug}` : `/catalog/${slug}`} className="inline-flex items-center gap-1.5 text-micro text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {course.snapshot.course.name}
      </Link>

      {access.reason === "free_preview" && (
        <p className="mt-4 border-l-2 border-brand bg-secondary/60 px-4 py-2.5 text-[13.5px]">
          Free preview. <Link href={`/catalog/${slug}`} className="underline underline-offset-4">Enrol</Link> to take the assessments, track progress and earn the certificate.
        </p>
      )}
      {access.reason === "staff_preview" && <p className="mt-4 text-[12.5px] text-warning">Staff view of the released version. Progress and attempts are not recorded.</p>}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <article>
          <p className="label-caps">{lesson.moduleTitle}</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-[clamp(1.7rem,3vw,2.3rem)] leading-tight">{lesson.title}</h1>
            {access.tracked && <BookmarkButton lessonId={lesson.id} saved={bookmarked} />}
          </div>
          <p className="text-data mt-3 text-micro text-muted-foreground">
            Lesson {index + 1} of {flat.length} · {lesson.minutes} min
            {lesson.effectiveDate ? ` · effective ${when(lesson.effectiveDate)}` : ""}
          </p>
          {lesson.objectives.length > 0 && (
            <div className="mt-6 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
              <p className="text-[13px] font-semibold">By the end of this lesson you can</p>
              <ul className="mt-2 list-disc pl-5 text-[14px] text-secondary-foreground">
                {lesson.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <Blocks blocks={lesson.blocks} mediaContext={course.id} />
          </div>

          {quiz && (
            <section aria-labelledby="assess" className="mt-12 rounded-[var(--radius)] border border-border bg-card px-5 py-5">
              <h2 id="assess" className="text-[1.15rem]">
                {quiz.title}
              </h2>
              <p className="text-data mt-1 text-micro text-muted-foreground">
                Pass mark {quiz.passingScore}% · {quiz.questions.length + quiz.drawCount} questions · {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} minutes` : "untimed"} · {quiz.maxAttempts ? `${quiz.maxAttempts} attempts` : "unlimited attempts"}
                {quiz.retakeWaitMinutes ? ` · ${quiz.retakeWaitMinutes} min between attempts` : ""}
              </p>
              {quiz.instructions && <p className="mt-3 text-[14px]">{quiz.instructions}</p>}
              {tries.length > 0 && (
                <ul className="mt-4 divide-y divide-border border-y border-border text-[13.5px]">
                  {tries.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 py-2">
                      <span className="text-data text-micro text-subtle">#{t.attemptNo}</span>
                      <StatusPill status={t.status} />
                      {t.score !== null && t.status !== "IN_PROGRESS" && <span>{t.score}%</span>}
                      {t.passed && <span className="text-success">passed</span>}
                      <Link href={`/academy/attempts/${t.id}`} className="ml-auto underline underline-offset-4">
                        {t.status === "IN_PROGRESS" ? "Resume" : "Review"}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {access.tracked ? (
                <div className="mt-4">
                  <StartAttempt quizId={quiz.id} label={tries.some((t) => t.status === "IN_PROGRESS") ? "Resume attempt" : tries.length ? "Start another attempt" : "Start the assessment"} />
                  <p className="mt-2 text-[12px] text-muted-foreground">Answers are saved as you go and graded on the server when you submit.</p>
                </div>
              ) : (
                <p className="mt-3 text-micro text-muted-foreground">Enrol to take this assessment.</p>
              )}
            </section>
          )}

          {access.tracked && (
            <div className="mt-10 border-t border-border pt-6">
              {lesson.completionRule === "ASSESSMENT_PASS" ? (
                <p className="text-[14px]">{done ? "Complete — you passed the assessment." : "This lesson is completed by passing its assessment."}</p>
              ) : (
                <LessonComplete lessonId={lesson.id} done={done} />
              )}
            </div>
          )}

          <nav aria-label="Lesson navigation" className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
            {prev && access.full ? (
              <Link href={`/academy/${slug}/${prev.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-[3px] border border-input bg-card px-4 text-[13.5px] font-medium hover:bg-secondary">
                <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
              </Link>
            ) : (
              <span />
            )}
            {next && access.full && (
              <Link href={`/academy/${slug}/${next.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-[3px] bg-primary px-4 text-[13.5px] font-medium text-primary-foreground hover:bg-primary-hover">
                Next lesson <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </nav>
        </article>

        <aside className="flex flex-col gap-4">
          {lesson.resources.length > 0 && (
            <section className="rounded-[var(--radius)] border border-border bg-card px-5 py-5">
              <h2 className="text-[13px] font-semibold">Resources</h2>
              <ul className="mt-3 flex flex-col gap-2.5">
                {lesson.resources.map((r) => (
                  <li key={r.id} className="flex items-start gap-2.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <a href={`/api/materials/${r.id}`} className="min-w-0 flex-1 text-micro leading-snug underline-offset-4 hover:underline">
                      {r.title}
                      <span className="text-data ml-2 text-[10.5px] text-subtle">
                        {typeLabel(r.mimeType)}
                        {r.sizeBytes ? ` · ${humanSize(r.sizeBytes)}` : ""}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {access.full && (
            <section className="rounded-[var(--radius)] border border-border bg-card px-5 py-5">
              <h2 className="text-[13px] font-semibold">In this module</h2>
              <ol className="mt-3 flex flex-col gap-2">
                {currentModule.lessons.map((l) => (
                  <li key={l.id}>
                    <Link href={`/academy/${slug}/${l.id}`} className={`block text-micro leading-snug hover:text-primary ${l.id === lesson.id ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {progress?.done.has(l.id) ? "✓ " : ""}
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <p className="text-[12px] leading-relaxed text-muted-foreground">Educational content only; all examples are synthetic. Never enter patient information anywhere in the Academy.</p>
        </aside>
      </div>
    </div>
  );
}
