import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { buildSnapshot } from "@/lib/services/cms/release";
import { flatLessons } from "@/lib/cms/snapshot";
import { Blocks } from "@/components/cms/BlockView";
import { QUESTION_LABEL } from "@/lib/assessment/questions";
import { isAvailable, isLink } from "@/lib/storage";
import { storedPageCount } from "@/lib/documents/pages";
import { DocumentReader } from "@/components/cms/DocumentReader";
import { LessonFormatTabs, type LessonFormat } from "@/components/learning/LessonFormatTabs";
import { CoursePlayer } from "@/components/learning/CoursePlayer";
import { VideoStage } from "@/components/learning/VideoStage";
import { cn } from "@/lib/utils";

export const metadata = { title: "Preview" };

/**
 * What learners would see if the current draft were released: only modules and lessons
 * marked ready, rendered with the same components as the learner portal. Nothing here is
 * recorded as learner progress. Reviewers decide from this page.
 */
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lesson?: string; device?: string }> }) {
  await requirePagePermission("content.view");
  const { id } = await params;
  const sp = await searchParams;
  const course = await prisma.program.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!course) notFound();
  const { snapshot, problems } = await buildSnapshot(prisma, id);
  const lessons = flatLessons(snapshot);
  const current = lessons.find((l) => l.id === sp.lesson) ?? lessons[0] ?? null;
  const mobile = sp.device === "mobile";
  const rows = current ? await prisma.resource.findMany({ where: { id: { in: current.resources.map((r) => r.id) } }, select: { id: true, title: true, format: true, fileKey: true, mimeType: true } }) : [];
  const materials = (
    await Promise.all(rows.map(async (r) => ({ ...r, pages: r.mimeType === "application/pdf" && !isLink(r.fileKey) && isAvailable(r.fileKey) ? await storedPageCount(r.fileKey) : 0 })))
  ).filter((m) => m.pages > 0 && m.format !== "OTHER");
  const at = current ? lessons.findIndex((l) => l.id === current.id) : -1;
  const prevLesson = at > 0 ? lessons[at - 1] : null;
  const nextLesson = at >= 0 && at < lessons.length - 1 ? lessons[at + 1] : null;
  const available: LessonFormat[] = current
    ? [
        ...(current.blocks.some((b) => b.kind === "VIDEO") ? (["video"] as const) : []),
        ...(materials.some((m) => m.format === "SLIDES") ? (["slides"] as const) : []),
        ...(materials.some((m) => m.format === "READING") ? (["reading"] as const) : []),
      ]
    : [];
  const q = (extra: Record<string, string>) => new URLSearchParams({ ...(current ? { lesson: current.id } : {}), ...(mobile ? { device: "mobile" } : {}), ...extra }).toString();

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning-bg px-4 py-2.5">
        <p className="text-[13px] text-warning">
          Preview of the draft release candidate. {problems.length ? `${problems.length} issue(s) would block release.` : "Ready to submit."} Progress is not recorded.
        </p>
        <div className="flex items-center gap-3 text-[13px]">
          <Link href={`?${q({ device: "desktop" }).replace(/device=mobile&?/, "")}`} className={cn("underline-offset-4", !mobile && "font-semibold underline")}>
            Desktop
          </Link>
          <Link href={`?${q({ device: "mobile" })}`} className={cn("underline-offset-4", mobile && "font-semibold underline")}>
            Mobile
          </Link>
          <Link href={`/admin/content/courses/${id}`} className="underline underline-offset-4">
            Back to editor
          </Link>
        </div>
      </div>

      {problems.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-micro text-warning">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className={cn("mt-6 overflow-hidden rounded-[14px] border border-border", mobile && "mx-auto max-w-[390px] rounded-[28px] border-8 border-foreground/80")}>
        {current ? (
          <CoursePlayer
            courseTitle={snapshot.course.name}
            backHref={`/admin/content/courses/${id}`}
            currentId={current.id}
            progress={null}
            prevHref={prevLesson ? `?${q({ lesson: prevLesson.id })}` : null}
            nextHref={nextLesson ? `?${q({ lesson: nextLesson.id })}` : null}
            modules={snapshot.modules.map((m) => ({ id: m.id, title: m.title, lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes || undefined, done: false, href: `?${q({ lesson: l.id })}` })) }))}
            stage={
              available.length ? (
                <LessonFormatTabs
                  tone="dark"
                  available={available}
                  panels={{
                    video: <VideoStage blocks={current.blocks} watermark="learner@example.com · PREVIEW" />,
                    slides: materials
                      .filter((m) => m.format === "SLIDES")
                      .map((m) => <DocumentReader key={m.id} mediaId={m.id} pages={m.pages} title={m.title} base={`/api/material-pages/${m.id}`} variant="slides" watermark="learner@example.com · PREVIEW" />),
                    reading: materials
                      .filter((m) => m.format === "READING")
                      .map((m) => <DocumentReader key={m.id} mediaId={m.id} pages={m.pages} title={m.title} base={`/api/material-pages/${m.id}`} variant="pages" watermark="learner@example.com · PREVIEW" />),
                  }}
                />
              ) : null
            }
          >
            <p className="label-caps">{current.moduleTitle}</p>
            <h1 className="mt-2 text-[clamp(1.6rem,3vw,2.3rem)] leading-tight">{current.title}</h1>
            <p className="text-data mt-2 text-micro text-muted-foreground">
              {current.minutes ? `${current.minutes} min` : "Duration not set"}{current.effectiveDate ? ` · effective ${new Date(current.effectiveDate).toLocaleDateString("en-IN")}` : ""}
            </p>
            {current.objectives.length > 0 && (
              <ul className="mt-5 list-disc pl-5 text-[14px] text-muted-foreground">
                {current.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            )}
            {current.blocks.some((b) => b.kind !== "VIDEO") && (
              <div className="mt-8">
                <Blocks blocks={current.blocks.filter((b) => b.kind !== "VIDEO")} mediaContext="preview" />
              </div>
            )}
            {current.assessment && (
              <section className="mt-10 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
                <p className="text-[14px] font-semibold">{current.assessment.title}</p>
                <p className="text-data mt-1 text-micro text-muted-foreground">
                  Pass {current.assessment.passingScore}% · {current.assessment.timeLimitMinutes ? `${current.assessment.timeLimitMinutes} min` : "untimed"} · {current.assessment.maxAttempts ? `${current.assessment.maxAttempts} attempts` : "unlimited attempts"} · {current.assessment.questions.length} questions
                  {current.assessment.drawCount ? ` + ${current.assessment.drawCount} drawn from a bank` : ""}
                </p>
                <ol className="mt-3 flex flex-col gap-3">
                  {current.assessment.questions.map((qq, i) => (
                    <li key={qq.id} className="text-[13.5px]">
                      {i + 1}. {qq.prompt} <span className="text-data text-[10px] text-subtle">{QUESTION_LABEL[qq.type].toUpperCase()}</span>
                      {qq.options.length > 0 && (
                        <ul className="ml-5 mt-1 list-disc text-[13px] text-muted-foreground">
                          {qq.options.map((o, j) => (
                            <li key={j}>{o}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </CoursePlayer>
        ) : (
          <p className="p-8 text-muted-foreground">No lessons are marked ready yet. Mark a module and its lessons ready in the editor to preview them here.</p>
        )}
      </div>
    </div>
  );
}
