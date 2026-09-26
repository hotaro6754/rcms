import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { LEVELS } from "@/lib/data/catalog";
import { eligibility } from "@/lib/certificates";
import { PageHead, Ruled } from "@/components/platform/PlatformShell";
import { ClaimButton } from "@/components/certificates/ClaimButton";
import { cn } from "@/lib/utils";

export const metadata = { title: "My academy" };

const BTN =
  "inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover";
const LINK = "inline-flex min-h-11 items-center text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/**
 * The student's desk. Progress is stated as the ladder, not as a percentage: where you are,
 * where the next level takes you, and in each program the next lesson and what stands
 * between you and the certificate.
 */
export default async function AcademyPage() {
  const user = await requireUser();

  const enrolments = await prisma.enrolment.findMany({
    where: { userId: user.id, state: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      program: {
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            include: {
              lessons: { where: { state: "PUBLISHED" }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lessonIds = enrolments.flatMap((e) => e.program.modules.flatMap((m) => m.lessons.map((l) => l.id)));
  const completed = lessonIds.length
    ? await prisma.progress.findMany({
        where: { userId: user.id, lessonId: { in: lessonIds }, completedAt: { not: null } },
        select: { lessonId: true },
      })
    : [];
  const done = new Set(completed.map((p) => p.lessonId));

  const certificates = await prisma.certificate.findMany({ where: { userId: user.id, revokedAt: null }, select: { programId: true, serial: true } });
  const certFor = new Map(certificates.map((c) => [c.programId, c.serial]));
  const status = new Map<string, Awaited<ReturnType<typeof eligibility>>>();
  for (const e of enrolments) if (!certFor.has(e.programId)) status.set(e.programId, await eligibility(user.id, e.programId));

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, title: true, body: true, href: true, createdAt: true },
  });

  const current = enrolments.length ? Math.max(...enrolments.map((e) => e.program.level)) : 0;
  const target = Math.min(5, current + 1);
  const first = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <PageHead
        kicker="Your academy"
        title={`${greeting()}, ${first}.`}
        lede={
          enrolments.length
            ? "Where you are on the ladder, and the next thing to do in each program."
            : "Nothing is enrolled yet. Once a program is added it appears here with its lessons, materials and certificate."
        }
      />

      {/* The ladder */}
      <ol aria-label="The five levels" className="mt-10 grid grid-cols-5 border-b border-border">
        {LEVELS.map((l) => {
          const here = l.n === current;
          const next = enrolments.length > 0 && l.n === target && l.n !== current;
          return (
            <li key={l.n} className={cn("border-t-2 pb-4 pt-3", here ? "border-foreground" : next ? "border-brand" : "border-border")}>
              <p className="text-data text-[10.5px] tracking-[0.12em] text-subtle">
                {String(l.n).padStart(2, "0")}
                {here && <span className="ml-2 text-foreground">YOU</span>}
                {next && <span className="ml-2 text-brand">NEXT</span>}
              </p>
              <p className={cn("font-serif-display mt-1.5 text-[clamp(1.1rem,2vw,1.6rem)] leading-none", here || next ? "text-foreground" : "text-foreground/35")}>
                {l.verb}
              </p>
              <p className="mt-1.5 hidden pr-3 text-[12.5px] leading-snug text-muted-foreground md:block">{l.title}</p>
            </li>
          );
        })}
      </ol>

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-14">
          {enrolments.length === 0 && (
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/learning-paths" className={BTN}>
                Find your level
              </Link>
              <Link href="/mentoring" className={LINK}>
                Or talk it through, 1:1
              </Link>
            </div>
          )}

          {enrolments.map((e) => {
            const lessons = e.program.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m.title })));
            const doneHere = lessons.filter((l) => done.has(l.id)).length;
            const next = lessons.find((l) => !done.has(l.id)) ?? null;
            const serial = certFor.get(e.programId);
            const s = status.get(e.programId);
            const share = lessons.length ? doneHere / lessons.length : 0;

            return (
              <article key={e.id} aria-labelledby={`p-${e.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
                    {e.program.tier} · LEVEL {String(e.program.level).padStart(2, "0")}
                  </p>
                  <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
                    {doneHere} / {lessons.length} LESSONS
                  </p>
                </div>
                {/* Progress, as a rule that fills. */}
                <div className="relative mt-2 h-0.5 bg-border" aria-hidden="true">
                  <div className="absolute inset-y-0 left-0 bg-foreground" style={{ width: `${share * 100}%` }} />
                </div>
                <h2 id={`p-${e.id}`} className="mt-6 text-[clamp(1.8rem,3vw,2.5rem)] leading-[1.05]">
                  {e.program.name}
                </h2>
                <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
                  You finish with {e.program.artefact.charAt(0).toLowerCase() + e.program.artefact.slice(1)}.
                </p>

                {next && (
                  <p className="mt-6 text-[14px]">
                    <span className="text-data mr-3 text-[10.5px] tracking-[0.12em] text-subtle">NEXT</span>
                    {next.title}
                    <span className="text-muted-foreground"> · {next.module}</span>
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
                  {next && (
                    <Link href={`/academy/${e.program.slug}/${next.id}`} className={BTN}>
                      {doneHere === 0 ? "Start the first lesson" : "Continue"}
                    </Link>
                  )}
                  <Link href={`/academy/${e.program.slug}`} className={LINK}>
                    Curriculum
                  </Link>
                  {serial ? (
                    <Link href={`/certificates/${serial}`} className={LINK}>
                      View your certificate
                    </Link>
                  ) : s?.eligible ? (
                    <ClaimButton programId={e.programId} className={BTN} />
                  ) : s && s.lessonsTotal > 0 ? (
                    <span className="text-[13px] text-subtle">
                      Certificate after {s.lessonsTotal - s.lessonsDone} more {s.lessonsTotal - s.lessonsDone === 1 ? "lesson" : "lessons"}
                      {s.quizzesTotal - s.quizzesPassed > 0 && ` and ${s.quizzesTotal - s.quizzesPassed} ${s.quizzesTotal - s.quizzesPassed === 1 ? "quiz" : "quizzes"}`}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="flex flex-col gap-12">
          <Ruled label="Recent">
            {notifications.length === 0 ? (
              <p className="py-4 text-[13.5px] text-muted-foreground">Nothing yet. Enrolments, grades and certificates show up here.</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id} className="border-b border-border py-3.5">
                    {n.href ? (
                      <Link href={n.href} className="text-[14px] leading-snug hover:underline hover:underline-offset-4">
                        {n.title}
                      </Link>
                    ) : (
                      <p className="text-[14px] leading-snug">{n.title}</p>
                    )}
                    {n.body && <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{n.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Ruled>
          <Ruled label="Also here">
            <ul>
              {[
                ["/library", "Library", "Every material from your programs"],
                ["/certificates", "Certificates", "Earned, and what is left to earn"],
                ["/labs", "Governance Labs", "Run a monthly review on teaching data"],
                ["/mentoring", "1:1 mentoring", "Book time with the author"],
              ].map(([href, label, note]) => (
                <li key={href} className="border-b border-border">
                  <Link href={href} className="group flex items-baseline justify-between gap-3 py-3.5">
                    <span>
                      <span className="block text-[14px] group-hover:underline group-hover:underline-offset-4">{label}</span>
                      <span className="block text-[12.5px] text-muted-foreground">{note}</span>
                    </span>
                    <span aria-hidden="true" className="text-subtle transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Ruled>
        </aside>
      </div>
    </div>
  );
}
