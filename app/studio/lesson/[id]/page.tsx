import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { LessonEditor } from "@/components/studio/LessonEditor";
import { QuizBuilder } from "@/components/studio/QuizBuilder";
import { Badge } from "@/components/ui/badge";

export default async function StudioLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTrainer();

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      resources: true,
      quizzes: { include: { questions: { orderBy: { sortOrder: "asc" } } }, take: 1 },
      module: { include: { program: { select: { slug: true, name: true } } } },
    },
  });
  if (!lesson) notFound();

  const quiz = lesson.quizzes[0]
    ? {
        id: lesson.quizzes[0].id,
        title: lesson.quizzes[0].title,
        passingScore: lesson.quizzes[0].passingScore,
        questions: lesson.quizzes[0].questions.map((q) => ({
          id: q.id, prompt: q.prompt, options: q.options, correct: q.correct, rationale: q.rationale,
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link href={`/studio/${lesson.module.program.slug}`} className="text-micro text-primary hover:underline">
        ← {lesson.module.program.name}
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="label-caps">{lesson.module.title}</p>
        <Badge
          className={`rounded-full border-transparent text-micro ${
            lesson.state === "PUBLISHED" ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
          }`}
        >
          {lesson.state.toLowerCase()}
        </Badge>
      </div>
      <h1 className="mt-2 text-[clamp(1.6rem,2.8vw,2.1rem)] leading-tight">{lesson.title}</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex flex-col gap-6">
          <LessonEditor
            lessonId={lesson.id}
            title={lesson.title}
            body={lesson.body ?? ""}
            minutes={Math.round((lesson.durationSec ?? 0) / 60)}
          />
          <QuizBuilder lessonId={lesson.id} quiz={quiz} />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] border border-border bg-card p-5">
            <h2 className="text-[13px] font-semibold">Resources</h2>
            {lesson.resources.length === 0 ? (
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                None attached.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {lesson.resources.map((r) => (
                  <li key={r.id} className="text-micro leading-snug">{r.title}</li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-border pt-3 text-micro leading-relaxed text-muted-foreground">
              Uploading needs a storage provider. Choose one and this becomes a file picker;
              the records already exist.
            </p>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-card p-5">
            <h2 className="text-[13px] font-semibold">Video</h2>
            <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
              The lesson stores a provider asset id and plays through a signed URL, never a
              public link. Bunny, Mux or Cloudflare Stream all fit; the cost per student
              differs enough to be worth modelling before you pick.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
