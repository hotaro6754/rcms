import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ program: string }>;
}) {
  const { program: slug } = await params;
  const user = await requireUser();

  const program = await prisma.program.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { state: "PUBLISHED" },
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, durationSec: true },
          },
        },
      },
    },
  });
  if (!program) notFound();

  const enrolment = await prisma.enrolment.findUnique({
    where: { userId_programId: { userId: user.id, programId: program.id } },
  });
  if (!enrolment || enrolment.state !== "ACTIVE") notFound();

  const ids = program.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const progress = ids.length
    ? await prisma.progress.findMany({
        where: { userId: user.id, lessonId: { in: ids }, completedAt: { not: null } },
        select: { lessonId: true },
      })
    : [];
  const done = new Set(progress.map((p) => p.lessonId));

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12">
      <Link href="/academy" className="text-micro text-primary hover:underline">
        ← My academy
      </Link>
      <p className="label-caps mt-6">{program.tier} · Level {program.level}</p>
      <h1 className="mt-2 text-[clamp(1.8rem,3.2vw,2.5rem)] leading-tight">{program.name}</h1>
      <p className="mt-3 max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">
        {program.who}
      </p>

      <div className="mt-10 flex flex-col gap-4">
        {program.modules.map((m, i) => (
          <Card key={m.id} className="gap-0 py-0">
            <CardHeader className="gap-0 border-b border-border px-6 py-4 [.border-b]:pb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-data text-micro font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-[1.05rem] leading-snug">{m.title}</h2>
                <span className="text-data ml-auto shrink-0 text-micro text-muted-foreground">
                  {m.lessons.filter((l) => done.has(l.id)).length}/{m.lessons.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {m.lessons.length === 0 ? (
                <p className="px-6 py-5 text-micro text-muted-foreground">
                  Lessons for this module are being authored.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      <Link
                        href={`/academy/${program.slug}/${l.id}`}
                        className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-secondary/60"
                      >
                        {done.has(l.id) ? (
                          <Check className="h-4 w-4 shrink-0 text-success" aria-label="Complete" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-input" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 text-[13.5px]">{l.title}</span>
                        <span className="text-data shrink-0 text-micro text-muted-foreground">
                          {Math.round((l.durationSec ?? 0) / 60)} min
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
