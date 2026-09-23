import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, PlayCircle } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { LessonComplete } from "@/components/portal/LessonComplete";
import { QuizRunner } from "@/components/portal/QuizRunner";
import { Card, CardContent } from "@/components/ui/card";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ program: string; lesson: string }>;
}) {
  const { program: slug, lesson: lessonId } = await params;
  const user = await requireUser();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      resources: true,
      quizzes: { include: { questions: { orderBy: { sortOrder: "asc" } } }, take: 1 },
      module: {
        include: {
          program: {
            include: {
              modules: {
                orderBy: { sortOrder: "asc" },
                include: {
                  lessons: {
                    where: { state: "PUBLISHED" },
                    orderBy: { sortOrder: "asc" },
                    select: { id: true, title: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson || lesson.module.program.slug !== slug || lesson.state !== "PUBLISHED") {
    notFound();
  }

  const program = lesson.module.program;

  // Access is checked on the server for every lesson load, not once at the program page.
  const enrolment = await prisma.enrolment.findUnique({
    where: { userId_programId: { userId: user.id, programId: program.id } },
  });
  if (!enrolment || enrolment.state !== "ACTIVE") notFound();

  const flat = program.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title })),
  );
  const index = flat.findIndex((l) => l.id === lesson.id);
  const prev = index > 0 ? flat[index - 1] : null;
  const next = index < flat.length - 1 ? flat[index + 1] : null;

  const progress = await prisma.progress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
  });

  // The answer key never leaves the server: only prompts and options are sent.
  const quiz = lesson.quizzes[0];
  const lastAttempt = quiz
    ? await prisma.quizAttempt.findFirst({
        where: { quizId: quiz.id, userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { score: true, passed: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link
        href={`/academy/${program.slug}`}
        className="inline-flex items-center gap-1.5 text-micro text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {program.name}
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <article>
          <p className="label-caps">{lesson.module.title}</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.3rem)] leading-tight">{lesson.title}</h1>
          <p className="text-data mt-3 text-micro text-muted-foreground">
            Lesson {index + 1} of {flat.length} · {Math.round((lesson.durationSec ?? 0) / 60)} min
          </p>

          {/* No fake player. The slot says what it is until a video host is chosen and the
              signed-URL pipeline is wired to it. */}
          <div className="mt-8 flex items-center gap-3 rounded-[var(--radius)] border border-dashed border-input bg-secondary/50 px-5 py-4">
            <PlayCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-micro leading-relaxed text-muted-foreground">
              Video is uploaded in Trainer Studio once a host is chosen. The written lesson
              below is complete and is the assessable material.
            </p>
          </div>

          <div className="mt-8 flex max-w-[68ch] flex-col gap-5">
            {(lesson.body ?? "").split("\n\n").map((para, i) => (
              <p key={i} className="text-[15px] leading-[1.72] text-secondary-foreground">
                {para}
              </p>
            ))}
          </div>

          {quiz && quiz.questions.length > 0 && (
            <div className="mt-10">
              <QuizRunner
                quizId={quiz.id}
                title={quiz.title}
                passingScore={quiz.passingScore}
                questions={quiz.questions.map((q) => ({
                  id: q.id,
                  prompt: q.prompt,
                  options: q.options,
                }))}
                lastScore={lastAttempt}
              />
            </div>
          )}

          <div className="mt-10 border-t border-border pt-6">
            <LessonComplete lessonId={lesson.id} done={!!progress?.completedAt} />
          </div>

          <nav className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
            {prev ? (
              <Link
                href={`/academy/${program.slug}/${prev.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-[13.5px] font-medium transition-colors hover:bg-secondary"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Previous
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/academy/${program.slug}/${next.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Next lesson
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            )}
          </nav>
        </article>

        <aside className="flex flex-col gap-4">
          {lesson.resources.length > 0 && (
            <Card className="gap-0 py-0">
              <CardContent className="px-5 py-5">
                <h2 className="text-[13px] font-semibold">Resources</h2>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {lesson.resources.map((r) => (
                    <li key={r.id} className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="text-micro leading-snug">{r.title}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-border pt-3 text-micro leading-relaxed text-muted-foreground">
                  Downloads open up once a storage provider is chosen. The records already exist.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="gap-0 py-0">
            <CardContent className="px-5 py-5">
              <h2 className="text-[13px] font-semibold">In this module</h2>
              <ol className="mt-3 flex flex-col gap-2">
                {program.modules
                  .find((m) => m.id === lesson.moduleId)!
                  .lessons.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/academy/${program.slug}/${l.id}`}
                        className={`block text-micro leading-snug transition-colors hover:text-primary ${
                          l.id === lesson.id
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {l.title}
                      </Link>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
