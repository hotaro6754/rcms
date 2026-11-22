import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BookOpen, Check, MonitorPlay, Presentation } from "lucide-react";
import { can, requireActor } from "@/lib/actor";
import { Protected } from "@/components/learning/Protected";
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
import { isAvailable, isLink } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { storedPageCount } from "@/lib/documents/pages";
import { DocumentReader } from "@/components/cms/DocumentReader";
import { LessonFormatTabs, type LessonFormat } from "@/components/learning/LessonFormatTabs";
import { CoursePlayer } from "@/components/learning/CoursePlayer";
import { VideoStage } from "@/components/learning/VideoStage";

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
            <Link href={`/academy/${slug}/${resume.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-[14px] font-medium text-primary-foreground">
              Continue “{lock.prerequisite}”
            </Link>
          )}
          <Link href={`/academy/${slug}`} className="inline-flex min-h-11 items-center rounded-xl border border-input px-5 text-[14px]">
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
  // Formats are read live (older releases predate them). Nothing is ever downloadable by
  // learners: slides and reading are page images from an access-checked route.
  const staffView = can(actor, "content.view");
  const live = new Map((await prisma.resource.findMany({ where: { id: { in: lesson.resources.map((r) => r.id) } }, select: { id: true, format: true, fileKey: true } })).map((r) => [r.id, r]));
  const materials = (
    await Promise.all(
      lesson.resources.map(async (r) => {
        const row = live.get(r.id);
        const pages = r.mimeType === "application/pdf" && row && !isLink(row.fileKey) && isAvailable(row.fileKey) ? await storedPageCount(row.fileKey) : 0;
        return { ...r, format: row?.format ?? "OTHER", pages };
      }),
    )
  ).filter((m) => m.pages > 0 && m.format !== "OTHER");
  const slides = materials.filter((m) => m.format === "SLIDES");
  const reading = materials.filter((m) => m.format === "READING");
  const hasVideo = lesson.blocks.some((b) => b.kind === "VIDEO");
  const notes = lesson.blocks.filter((b) => b.kind !== "VIDEO");
  const available: LessonFormat[] = [...(hasVideo ? (["video"] as const) : []), ...(slides.length ? (["slides"] as const) : []), ...(reading.length ? (["reading"] as const) : [])];
  const watermark = staffView ? undefined : `${actor.email} · ${actor.id.slice(-6).toUpperCase()}`;
  const formatTabs = (
    <LessonFormatTabs
      tone="dark"
      available={available}
      panels={{
        video: <VideoStage blocks={lesson.blocks} watermark={watermark} />,
        slides: (
          <div className="flex flex-col gap-6">
            {slides.map((m) => (
              <DocumentReader key={m.id} mediaId={m.id} pages={m.pages} title={m.title} base={`/api/material-pages/${m.id}`} variant="slides" watermark={watermark} />
            ))}
          </div>
        ),
        reading: (
          <div className="flex flex-col gap-6">
            {reading.map((m) => (
              <DocumentReader key={m.id} mediaId={m.id} pages={m.pages} title={m.title} base={`/api/material-pages/${m.id}`} variant="pages" watermark={watermark} />
            ))}
          </div>
        ),
      }}
    />
  );
  const protect = (node: React.ReactNode) => (staffView ? node : <Protected>{node}</Protected>);
  const total = flat.length;
  const percent = progress ? Math.round((progress.done.size / Math.max(1, total)) * 100) : null;
  const pill = "inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5";

  return (
    <CoursePlayer
      courseTitle={course.snapshot.course.name}
      backHref={access.full ? `/academy/${slug}` : `/catalog/${slug}`}
      currentId={lesson.id}
      progress={percent}
      prevHref={prev && access.full ? `/academy/${slug}/${prev.id}` : null}
      nextHref={next && access.full ? `/academy/${slug}/${next.id}` : null}
      badge={access.reason === "staff_preview" ? <span className="hidden rounded-full border border-warning/40 bg-warning-bg px-2.5 py-0.5 text-[11px] text-warning sm:inline">Staff view · not recorded</span> : undefined}
      modules={course.snapshot.modules.map((m) => ({
        id: m.id,
        title: m.title,
        lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes || undefined, done: !!progress?.done.has(l.id), href: access.full || l.id === lesson.id ? `/academy/${slug}/${l.id}` : null })),
      }))}
      stage={available.length ? protect(formatTabs) : null}
    >
      {access.reason === "free_preview" && (
        <p className="mb-6 rounded-[var(--radius)] border-l-2 border-brand bg-secondary/60 px-4 py-2.5 text-[13.5px]">
          Free preview. <Link href={`/catalog/${slug}`} className="underline underline-offset-4">Enrol</Link> to take the assessments, track progress and earn the certificate.
        </p>
      )}
      <p className="label-caps">{lesson.moduleTitle}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-tight tracking-[-0.01em]">{lesson.title}</h1>
        {access.tracked && <BookmarkButton lessonId={lesson.id} saved={bookmarked} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
        <span className={pill}>
          Lesson {index + 1} of {total}
        </span>
        {lesson.minutes > 0 && <span className={pill}>{lesson.minutes} min</span>}
        {hasVideo && (
          <span className={pill}>
            <MonitorPlay className="h-3.5 w-3.5" aria-hidden /> Video
          </span>
        )}
        {slides.length > 0 && (
          <span className={pill}>
            <Presentation className="h-3.5 w-3.5" aria-hidden /> {slides.reduce((n, m) => n + m.pages, 0)} slides
          </span>
        )}
        {reading.length > 0 && (
          <span className={pill}>
            <BookOpen className="h-3.5 w-3.5" aria-hidden /> {reading.reduce((n, m) => n + m.pages, 0)} pages
          </span>
        )}
        {lesson.effectiveDate && <span>Effective {when(lesson.effectiveDate)}</span>}
        <Link
          href={`/support/new?category=MODULE_CONTENT&course=${encodeURIComponent(slug)}&from=${encodeURIComponent(`/academy/${slug}/${lessonId}`)}&ref=${encodeURIComponent(`Lesson: ${lesson.title}`)}`}
          className="ml-auto underline underline-offset-4 hover:text-foreground"
        >
          Ask support about this lesson
        </Link>
      </div>

      {available.length === 0 && notes.length === 0 && (
        <p className="mt-8 rounded-[var(--radius)] border border-dashed border-border px-5 py-8 text-center text-[14px] text-muted-foreground">This lesson&apos;s content is being prepared.</p>
      )}

      {lesson.objectives.length > 0 && (
        <div className="mt-8 rounded-[calc(var(--radius)+4px)] border border-border bg-card px-6 py-5">
          <p className="text-[13px] font-semibold">By the end of this lesson you can</p>
          <ul className="mt-3 grid gap-2 text-[14px] text-secondary-foreground sm:grid-cols-2">
            {lesson.objectives.map((o) => (
              <li key={o} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes.length > 0 && <div className="mt-10">{protect(<Blocks blocks={notes} mediaContext={course.id} />)}</div>}

      {quiz && (
        <section aria-labelledby="assess" className="mt-12 rounded-[calc(var(--radius)+4px)] border border-border bg-card px-6 py-6">
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

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        {access.tracked ? (
          lesson.completionRule === "ASSESSMENT_PASS" ? (
            <p className="text-[14px]">{done ? "Complete — you passed the assessment." : "This lesson is completed by passing its assessment."}</p>
          ) : (
            <LessonComplete lessonId={lesson.id} done={done} />
          )
        ) : (
          <span />
        )}
        {next && access.full && (
          <Link href={`/academy/${slug}/${next.id}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-[10px] bg-primary px-5 text-[13.5px] font-medium text-primary-foreground hover:bg-primary-hover">
            <span className="truncate">Next: {next.title}</span> <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        )}
      </div>

      <p className="mt-10 text-[12px] leading-relaxed text-muted-foreground">
        View only: course materials are licensed to your account for study on this site and cannot be downloaded, copied, recorded or printed. Educational content only; all
        examples are synthetic. Never enter patient information anywhere in RCMExcel.
      </p>
    </CoursePlayer>
  );
}
