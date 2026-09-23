import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { LEVELS } from "@/lib/data/catalog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My academy" };

/**
 * Progress is stated as the ladder, not as a percentage.
 *
 * "68% complete" tells a learner nothing about their career. "Current role, target role,
 * skills completed" is the same data expressed as the thing they actually bought.
 */
export default async function AcademyPage() {
  const user = await requireUser();

  const enrolments = await prisma.enrolment.findMany({
    where: { userId: user.id, state: "ACTIVE" },
    include: {
      program: {
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: {
                where: { state: "PUBLISHED" },
                orderBy: { sortOrder: "asc" },
                select: { id: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lessonIds = enrolments.flatMap((e) =>
    e.program.modules.flatMap((m) => m.lessons.map((l) => l.id)),
  );

  const completed = lessonIds.length
    ? await prisma.progress.findMany({
        where: { userId: user.id, lessonId: { in: lessonIds }, completedAt: { not: null } },
        select: { lessonId: true },
      })
    : [];
  const done = new Set(completed.map((p) => p.lessonId));

  const totalLessons = lessonIds.length;
  const totalDone = lessonIds.filter((id) => done.has(id)).length;

  const currentLevel = enrolments.length
    ? Math.max(...enrolments.map((e) => e.program.level))
    : 0;
  const target = LEVELS.find((l) => l.n === Math.min(5, currentLevel + 1));
  const currentRole =
    (user as { currentRole?: string | null }).currentRole ??
    LEVELS.find((l) => l.n === currentLevel)?.title ??
    "Not set";

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12">
      <p className="label-caps">Your academy</p>
      <h1 className="mt-2 text-[clamp(1.8rem,3.2vw,2.5rem)] leading-tight">
        {enrolments.length ? "Where you are on the ladder" : "Nothing enrolled yet"}
      </h1>

      {enrolments.length > 0 && (
        <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-3">
          <div className="bg-card p-5">
            <dt className="label-caps text-[11px]">Current role</dt>
            <dd className="mt-2.5 text-[18px] font-semibold leading-tight">{currentRole}</dd>
          </div>
          <div className="bg-card p-5">
            <dt className="label-caps text-[11px]">Target role</dt>
            <dd className="mt-2.5 text-[18px] font-semibold leading-tight">
              {target ? target.title : "Executive Leadership"}
            </dd>
            <p className="mt-1.5 text-micro text-muted-foreground">
              {target ? target.outcome : "The top of the ladder."}
            </p>
          </div>
          <div className="bg-card p-5">
            <dt className="label-caps text-[11px]">Skills completed</dt>
            <dd className="text-data mt-2.5 text-[26px] font-medium leading-none">
              {totalDone} <span className="text-muted-foreground">/ {totalLessons}</span>
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-10 flex flex-col gap-4">
        {enrolments.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <p className="max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">
                Once you are enrolled on a program it appears here, with the modules and the
                lessons inside it. If you have paid and this is still empty, tell us and we
                will sort it out.
              </p>
              <Link
                href="/learning-paths"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                See the five levels
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        )}

        {enrolments.map((e) => {
          const lessons = e.program.modules.flatMap((m) => m.lessons);
          const doneHere = lessons.filter((l) => done.has(l.id)).length;
          const next =
            e.program.modules
              .flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })))
              .find((l) => !done.has(l.id)) ?? null;

          return (
            <Card key={e.id} className="gap-0 py-0">
              <CardHeader className="gap-0 border-b border-border px-6 py-5 [.border-b]:pb-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-data text-micro text-muted-foreground">
                      {e.program.tier} · Level {e.program.level}
                    </span>
                    <h2 className="mt-1.5 text-[1.5rem] leading-tight">{e.program.name}</h2>
                  </div>
                  <Badge className="rounded-full border-transparent bg-accent text-micro font-semibold text-accent-foreground">
                    {doneHere} of {lessons.length} lessons
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="px-6 py-5">
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  You finish with {e.program.artefact.toLowerCase()}.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/academy/${e.program.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    Curriculum
                  </Link>
                  {next && (
                    <Link
                      href={`/academy/${e.program.slug}/${next.id}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                      {doneHere === 0 ? "Start" : "Continue"}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  )}
                  {next && (
                    <span className="text-micro text-muted-foreground">
                      Next: {next.moduleTitle}
                    </span>
                  )}
                  {!next && lessons.length > 0 && (
                    <span className="text-micro font-medium text-success">
                      Every lesson complete.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
