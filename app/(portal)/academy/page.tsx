import Link from "next/link";
import { listBookmarks } from "@/lib/services/learning/bookmarks";
import { requireActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { eligibility } from "@/lib/certificates";
import { PageHead, Ruled } from "@/components/platform/PlatformShell";
import { ClaimButton } from "@/components/certificates/ClaimButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { flatLessons, type CourseSnapshot } from "@/lib/cms/snapshot";
import { enrolmentLive } from "@/lib/services/learning/catalog";
import { progressFor } from "@/lib/services/learning/progress";
import { enrolFreeAction } from "@/lib/actions/learning";
import { when } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

export const metadata = { title: "My academy" };

const BTN = "inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover";
const LINK = "inline-flex min-h-11 items-center text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

const STATUS_NOTE: Partial<Record<string, string>> = {
  PAYMENT_FAILED: "Your last payment failed. Update it from Billing to keep access.",
  GRACE_PERIOD: "Your subscription is in its grace period. Renew from Billing to keep access.",
  PAYMENT_PENDING: "Your payment is still being confirmed by the payment provider.",
  TRIAL: "You are on a trial.",
};

/**
 * The learner's desk: every course with real progress against its released version, the
 * next lesson, assessments still to pass, certificates, subscription standing and recent
 * notifications. Every number is a count of stored records.
 */
export default async function AcademyPage() {
  const user = await requireActor();

  const [enrolments, levels, subscriptions, certificates, badges, notifications, pendingAttempts, account] = await Promise.all([
    prisma.enrolment.findMany({
      where: { userId: user.id, state: { in: ["ACTIVE", "COMPLETED"] } },
      include: { program: { select: { id: true, slug: true, levelId: true, state: true, publishedVersion: { select: { snapshot: true, version: true } } } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.learningLevel.findMany({ where: { status: "PUBLISHED" }, orderBy: { sequence: "asc" }, include: { courses: { where: { state: "PUBLISHED" }, select: { id: true } } } }),
    prisma.subscription.findMany({ where: { userId: user.id, status: { in: ["TRIALING", "ACTIVE", "GRACE_PERIOD"] } }, include: { product: { select: { name: true, levelId: true } } } }),
    prisma.certificate.findMany({ where: { userId: user.id, revokedAt: null }, select: { programId: true, serial: true } }),
    prisma.levelBadge.findMany({ where: { userId: user.id }, select: { levelId: true, name: true } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, body: true, href: true, createdAt: true, readAt: true } }),
    prisma.quizAttempt.findMany({ where: { userId: user.id, status: { in: ["PENDING_REVIEW", "IN_PROGRESS"] } }, select: { id: true, status: true, quiz: { select: { title: true } }, expiresAt: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { status: true, lastLoginAt: true, previousLoginAt: true } }),
  ]);

  const live = enrolments.filter((e) => enrolmentLive(e) && e.program.state === "PUBLISHED" && e.program.publishedVersion);
  const certFor = new Map(certificates.map((c) => [c.programId, c.serial]));
  type Row = {
    e: (typeof live)[number];
    snap: CourseSnapshot;
    progress: Awaited<ReturnType<typeof progressFor>>;
    elig: Awaited<ReturnType<typeof eligibility>> | null;
    assessments: { lesson: ReturnType<typeof flatLessons>[number]; quiz: NonNullable<ReturnType<typeof flatLessons>[number]["assessment"]>; tries: { quizId: string; score: number | null; passed: boolean | null; status: string }[] }[];
  };
  const courses: Row[] = [];
  for (const e of live) {
    const snap = e.program.publishedVersion!.snapshot as unknown as CourseSnapshot;
    const progress = await progressFor(user.id, snap);
    const assessments = flatLessons(snap).filter((l) => l.assessment);
    const quizIds = assessments.map((l) => l.assessment!.id);
    const attempts = quizIds.length
      ? await prisma.quizAttempt.findMany({ where: { userId: user.id, quizId: { in: quizIds } }, select: { quizId: true, score: true, passed: true, status: true } })
      : [];
    const elig = certFor.has(e.programId) ? null : await eligibility(user.id, e.programId);
    courses.push({ e, snap, progress, elig, assessments: assessments.map((l) => ({ lesson: l, quiz: l.assessment!, tries: attempts.filter((a) => a.quizId === l.assessment!.id) })) });
  }

  // Courses a subscription covers that the learner has not started yet.
  const enrolledIds = new Set(enrolments.map((e) => e.programId));
  const covered = subscriptions.length
    ? await prisma.program.findMany({
        where: {
          state: "PUBLISHED",
          includedInSubscription: true,
          id: { notIn: [...enrolledIds] },
          ...(subscriptions.some((s) => !s.product.levelId) ? {} : { levelId: { in: subscriptions.map((s) => s.product.levelId!).filter(Boolean) } }),
        },
        select: { id: true, name: true, slug: true },
        take: 6,
      })
    : [];

  const upcoming = courses.flatMap((c) =>
    c.assessments
      .filter((a) => !a.tries.some((t) => t.passed))
      .map((a) => ({ course: c.snap.course, lesson: a.lesson, quiz: a.quiz, best: Math.max(-1, ...a.tries.map((t) => t.score ?? -1)), used: a.tries.length })),
  );
  const saved = await listBookmarks(user.id);
  const first = user.name.split(" ")[0];
  const statusNote = STATUS_NOTE[account.status];

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <PageHead
        kicker="Your academy"
        title={`${greeting()}, ${first}.`}
        lede={courses.length ? "Where you are, the next thing to do in each course, and what stands between you and each certificate." : "Nothing is enrolled yet. Find your level in the catalogue, or start a free course."}
      />

      {statusNote && (
        <p role="status" className="mt-6 border-l-2 border-warning bg-warning-bg px-4 py-3 text-[14px] text-warning">
          {statusNote}{" "}
          <Link href="/account/billing" className="underline underline-offset-4">
            Billing
          </Link>
        </p>
      )}
      {account.previousLoginAt && (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          Your previous sign-in was {when(account.previousLoginAt, true)} IST. Not you?{" "}
          <Link href="/support/new?category=PRIVACY_SECURITY" className="underline underline-offset-4">
            Report suspicious access
          </Link>
          .
        </p>
      )}

      {levels.length > 0 && (
        <ol aria-label="Learning levels" className="mt-10 grid border-b border-border sm:grid-cols-3">
          {levels.map((l) => {
            const certified = l.courses.filter((c) => certFor.has(c.id)).length;
            const active = courses.some((c) => c.e.program.levelId === l.id);
            const badge = badges.find((b) => b.levelId === l.id);
            return (
              <li key={l.id} className={cn("border-t-2 pb-4 pr-4 pt-3", badge ? "border-success" : active ? "border-foreground" : "border-border")}>
                <p className="text-data text-[10.5px] tracking-[0.12em] text-subtle">
                  LEVEL {l.sequence} {badge ? "· EARNED" : active ? "· IN PROGRESS" : ""}
                </p>
                <p className={cn("font-serif-display mt-1.5 text-[clamp(1.15rem,2vw,1.55rem)] leading-tight", !active && !badge && "text-foreground/45")}>{l.displayTitle}</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  {certified} of {l.courses.length} courses certified{badge ? ` · ${badge.name}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-14">
          {courses.length === 0 && (
            <div className="flex flex-wrap items-center gap-6">
              <Link href="/catalog" className={BTN}>
                Browse the catalogue
              </Link>
              <Link href="/learning-paths" className={LINK}>
                Which level am I?
              </Link>
            </div>
          )}

          {courses.map(({ e, snap, progress, elig }) => {
            const serial = certFor.get(e.programId);
            const resume = progress.lastViewed && !progress.done.has(progress.lastViewed.id) ? progress.lastViewed : progress.next;
            return (
              <article key={e.id} aria-labelledby={`c-${e.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
                    {snap.course.tier || "COURSE"} · VERSION {e.program.publishedVersion!.version}
                    {e.expiresAt ? ` · ACCESS UNTIL ${when(e.expiresAt).toUpperCase()}` : ""}
                  </p>
                  <p className="text-data text-[11px] tracking-[0.12em] text-subtle">
                    {progress.lessonsDone} / {progress.lessonsTotal} LESSONS · {progress.percent}%
                  </p>
                </div>
                <div className="relative mt-2 h-0.5 bg-border" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${snap.course.name} progress`}>
                  <div className="absolute inset-y-0 left-0 bg-foreground" style={{ width: `${progress.percent}%` }} />
                </div>
                <h2 id={`c-${e.id}`} className="mt-6 text-[clamp(1.7rem,3vw,2.3rem)] leading-[1.05]">
                  {snap.course.name}
                </h2>
                <ul className="mt-4 grid gap-x-6 gap-y-1 text-[12.5px] text-muted-foreground sm:grid-cols-2">
                  {progress.modules.map((m) => (
                    <li key={m.id} className="flex justify-between gap-3">
                      <span className="truncate">{m.title}</span>
                      <span className="text-data shrink-0">
                        {m.done}/{m.total}
                      </span>
                    </li>
                  ))}
                </ul>
                {resume && (
                  <p className="mt-6 text-[14px]">
                    <span className="text-data mr-3 text-[10.5px] tracking-[0.12em] text-subtle">{progress.lessonsDone === 0 ? "START" : "RESUME"}</span>
                    {resume.title}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
                  {resume && (
                    <Link href={`/academy/${snap.course.slug}/${resume.id}`} className={BTN}>
                      {progress.lessonsDone === 0 ? "Start the first lesson" : "Continue"}
                    </Link>
                  )}
                  <Link href={`/academy/${snap.course.slug}`} className={LINK}>
                    Curriculum
                  </Link>
                  {serial ? (
                    <Link href={`/certificates/${serial}`} className={LINK}>
                      View your certificate
                    </Link>
                  ) : elig?.eligible ? (
                    <ClaimButton programId={e.programId} className={BTN} />
                  ) : elig && elig.lessonsTotal > 0 ? (
                    <span className="text-[13px] text-subtle">
                      Certificate after {elig.lessonsTotal - elig.lessonsDone} more lesson{elig.lessonsTotal - elig.lessonsDone === 1 ? "" : "s"}
                      {elig.quizzesTotal - elig.quizzesPassed > 0 && ` and ${elig.quizzesTotal - elig.quizzesPassed} assessment${elig.quizzesTotal - elig.quizzesPassed === 1 ? "" : "s"}`}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}

          {covered.length > 0 && (
            <Ruled label="Included in your subscription">
              <ul>
                {covered.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
                    <Link href={`/catalog/${c.slug}`} className="text-[14px] hover:underline">
                      {c.name}
                    </Link>
                    <ActionForm action={enrolFreeAction} redirectTo={`/academy/${c.slug}`}>
                      <input type="hidden" name="courseId" value={c.id} />
                      <button className="text-[13px] underline underline-offset-4">Start this course</button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Ruled>
          )}
        </div>

        <aside className="flex flex-col gap-12">
          <Ruled label="Assessments to pass">
            {upcoming.length === 0 && pendingAttempts.length === 0 ? (
              <p className="py-4 text-[13.5px] text-muted-foreground">Nothing outstanding.</p>
            ) : (
              <ul>
                {pendingAttempts.map((a) => (
                  <li key={a.id} className="border-b border-border py-3 text-[14px]">
                    <Link href={`/academy/attempts/${a.id}`} className="hover:underline">
                      {a.quiz.title}
                    </Link>
                    <span className="block text-[12.5px] text-muted-foreground">{a.status === "PENDING_REVIEW" ? "Submitted, waiting for a reviewer" : "In progress — finish it"}</span>
                  </li>
                ))}
                {upcoming.slice(0, 6).map((u) => (
                  <li key={u.quiz.id} className="border-b border-border py-3 text-[14px]">
                    <Link href={`/academy/${u.course.slug}/${u.lesson.id}`} className="hover:underline">
                      {u.quiz.title}
                    </Link>
                    <span className="block text-[12.5px] text-muted-foreground">
                      {u.course.name} · pass {u.quiz.passingScore}%{u.used ? ` · best ${u.best}% in ${u.used} attempt${u.used === 1 ? "" : "s"}` : ""}
                      {u.quiz.maxAttempts ? ` · ${Math.max(0, u.quiz.maxAttempts - u.used)} left` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Ruled>

          <Ruled label="Access">
            <ul className="py-3 text-[13.5px]">
              {subscriptions.length === 0 ? (
                <li className="text-muted-foreground">No active subscription. Courses you bought or were given stay yours.</li>
              ) : (
                subscriptions.map((s) => (
                  <li key={s.id}>
                    {s.product.name} · {s.status.toLowerCase().replace("_", " ")} until {when(s.status === "GRACE_PERIOD" ? (s.graceEndsAt ?? s.currentPeriodEnd) : s.currentPeriodEnd)}
                  </li>
                ))
              )}
              <li className="mt-2">
                <Link href="/account/billing" className="underline underline-offset-4">
                  Billing and invoices
                </Link>
              </li>
            </ul>
          </Ruled>

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
                ["/catalog", "Catalogue", "Every course, by level"],
                ["/library", "Library", "Every material from your courses"],
                ["/certificates", "Certificates", "Earned, and what is left to earn"],
                ["/labs", "Governance Labs", "Run a monthly review on teaching data"],
                ["/support", "Support", "Ask for help; we reply in the thread"],
              ].map(([href, label, note]) => (
                <li key={href} className="border-b border-border">
                  <Link href={href} className="group flex items-baseline justify-between gap-3 py-3.5">
                    <span>
                      <span className="block text-[14px] group-hover:underline group-hover:underline-offset-4">{label}</span>
                      <span className="block text-[12.5px] text-muted-foreground">{note}</span>
                    </span>
                    <span aria-hidden="true" className="text-subtle">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Ruled>
          {saved.length > 0 && (
            <Ruled label="Saved lessons">
              <ul>
                {saved.slice(0, 8).map((b) => (
                  <li key={b.lessonId} className="border-b border-border py-3">
                    <Link href={b.href} className="block text-[14px] hover:underline hover:underline-offset-4">
                      {b.title}
                    </Link>
                    <span className="block text-[12.5px] text-muted-foreground">{b.course}</span>
                  </li>
                ))}
              </ul>
            </Ruled>
          )}
        </aside>
      </div>
    </div>
  );
}
