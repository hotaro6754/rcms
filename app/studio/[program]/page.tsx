import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { CurriculumBuilder } from "@/components/studio/CurriculumBuilder";

export default async function StudioProgramPage({
  params,
}: {
  params: Promise<{ program: string }>;
}) {
  const { program: slug } = await params;
  await requireTrainer();

  const program = await prisma.program.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: { _count: { select: { quizzes: true } }, quizzes: { include: { _count: { select: { questions: true } } } } },
          },
        },
      },
    },
  });
  if (!program) notFound();

  const modules = program.modules.map((m) => ({
    id: m.id,
    title: m.title,
    summary: m.summary,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      state: l.state,
      durationSec: l.durationSec,
      hasBody: !!l.body?.trim(),
      questions: l.quizzes.reduce((n, q) => n + q._count.questions, 0),
    })),
  }));

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link href="/studio" className="text-micro text-primary hover:underline">
        ← All programs
      </Link>
      <p className="label-caps mt-6">{program.tier} · Level {program.level}</p>
      <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.3rem)] leading-tight">{program.name}</h1>
      <p className="mt-3 max-w-[64ch] text-[13.5px] leading-relaxed text-muted-foreground">
        Publishing a lesson makes it visible to every enrolled student straight away. A lesson
        with no body cannot be published.
      </p>

      <div className="mt-9">
        <CurriculumBuilder programId={program.id} modules={modules} />
      </div>
    </div>
  );
}
