import Link from "next/link";
import { listBookmarks } from "@/lib/services/learning/bookmarks";
import { requireActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { eligibility } from "@/lib/certificates";
import { ClaimButton } from "@/components/certificates/ClaimButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { flatLessons, type CourseSnapshot } from "@/lib/cms/snapshot";
import { enrolmentLive } from "@/lib/services/learning/catalog";
import { progressFor } from "@/lib/services/learning/progress";
import { enrolFreeAction } from "@/lib/actions/learning";
import { when } from "@/components/admin/kit";
import { ArrowRight, Award, BookOpen, Flame, LifeBuoy, MonitorPlay, Play, Presentation } from "lucide-react";
import { LevelBars } from "@/components/illustration/Bars";
import { Rexi } from "@/components/mascot/Rexi";
import { Badges, CoursePath, StatsCard, StreakCard, streakOf, type Badge } from "@/components/learning/Gamify";
import a from "./academy.module.css";

export const metadata = { title: "My learning" };


/** A date as its day in India time (YYYY-MM-DD). */
function dayKeyOf(d: Date) {
  return new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

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

  // Sixty days of lesson activity: the week strip, the streak and today's goal all come from it.
  const [recent, passedAttempts] = await Promise.all([
    prisma.progress.findMany({
      where: { userId: user.id, OR: [{ lastViewedAt: { gte: new Date(Date.now() - 60 * 86400_000) } }, { completedAt: { gte: new Date(Date.now() - 60 * 86400_000) } }] },
      select: { lastViewedAt: true, completedAt: true },
    }),
    prisma.quizAttempt.count({ where: { userId: user.id, passed: true } }),
  ]);
  const timeIn = await prisma.progress.aggregate({ where: { userId: user.id }, _sum: { secondsIn: true } });
  const minutesLearned = Math.round((timeIn._sum.secondsIn ?? 0) / 60);
  const perDay = new Map<string, number>();
  for (const w of recent) for (const d of [w.lastViewedAt, w.completedAt]) if (d) perDay.set(dayKeyOf(d), (perDay.get(dayKeyOf(d)) ?? 0) + 1);
  const dayKey = dayKeyOf;
  const activeAll = new Set(recent.flatMap((w) => [w.lastViewedAt, w.completedAt].filter((d): d is Date => !!d).map(dayKey)));
  const todayKey = dayKey(new Date());
  const doneToday = recent.filter((w) => w.completedAt && dayKey(w.completedAt) === todayKey).length;
  const { streak, best } = streakOf(activeAll);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400_000);
    return { key: dayKey(d), label: d.toLocaleDateString("en-IN", { weekday: "narrow", timeZone: "Asia/Kolkata" }) };
  });
  const activeDays = new Set(last7.map((d) => d.key).filter((k) => activeAll.has(k)));
  const lessonsDone = courses.reduce((n, c) => n + c.progress.lessonsDone, 0);
  const featured = courses.find((c) => c.progress.lessonsDone > 0 && c.progress.lessonsDone < c.progress.lessonsTotal) ?? courses.find((c) => c.progress.lessonsDone < c.progress.lessonsTotal) ?? null;
  const resumeOf = (c: Row) => (c.progress.lastViewed && !c.progress.done.has(c.progress.lastViewed.id) ? c.progress.lastViewed : c.progress.next);

  const anyComplete = courses.some((c) => c.progress.lessonsTotal > 0 && c.progress.lessonsDone === c.progress.lessonsTotal);
  const BADGES: Badge[] = [
    { id: "first", name: "First lesson", hint: "Finish any lesson", earned: lessonsDone >= 1, tone: "mint", glyph: "spark" },
    { id: "five", name: "Five lessons", hint: "Finish five lessons", earned: lessonsDone >= 5, tone: "sand", glyph: "five" },
    { id: "streak3", name: "On a roll", hint: "Three days in a row", earned: best >= 3, tone: "coral", glyph: "flame" },
    { id: "week", name: "Full week", hint: "Seven days in a row", earned: best >= 7, tone: "night", glyph: "week" },
    { id: "pass", name: "Assessed", hint: "Pass an assessment", earned: passedAttempts >= 1, tone: "green", glyph: "check" },
    { id: "course", name: "Course done", hint: "Finish a course", earned: anyComplete, tone: "sand", glyph: "flag" },
    { id: "cert", name: "Certified", hint: "Earn a certificate", earned: certificates.length >= 1, tone: "coral", glyph: "seal" },
    { id: "level", name: "Level up", hint: "Complete a level", earned: badges.length >= 1, tone: "night", glyph: "level" },
  ];
  const resume = featured ? resumeOf(featured) : null;
  const resumeHref = featured && resume ? `/academy/${featured.snap.course.slug}/${resume.id}` : featured ? `/academy/${featured.snap.course.slug}` : "/catalog";
  const myLevel = featured ? levels.find((l) => l.id === featured.e.program.levelId) : null;
  const weekBars = last7.map((d) => ({ ...d, n: perDay.get(d.key) ?? 0 }));
  const weekMax = Math.max(1, ...weekBars.map((b) => b.n));
  const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  const learned = minutesLearned >= 60 ? `${Math.floor(minutesLearned / 60)}h ${minutesLearned % 60}m` : `${minutesLearned}m`;
  const currentLevel = featured ? Math.max(0, levels.findIndex((l) => l.id === featured.e.program.levelId)) : 0;
  const levelsDone = levels.filter((l) => badges.some((b) => b.levelId === l.id)).length;

  return (
    <div className={a.page}>
      {statusNote && (
        <p role="status" className={a.notice}>
          {statusNote}{" "}
          <Link href="/account/billing" className="underline underline-offset-4">
            Billing
          </Link>
        </p>
      )}

      {/* ---------- hello ---------- */}
      <section className={a.hero}>
        <div className={a.heroCopy}>
          <p className="x-kicker">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}</p>
          <div className={a.helloRow}>
            <h1 className={`x-display ${a.title}`}>
              {greeting()}, {first}
            </h1>
            <Rexi
              mood={streak >= 3 ? "cheer" : "idle"}
              size={112}
              bubble="left"
              className={a.rexi}
              say={featured ? (featured.progress.lessonsDone === 0 ? "Your first lesson is ready." : streak >= 3 ? `${streak}-day streak. Keep going!` : `Next up: ${resume?.title ?? "your course"}`) : "Pick a level to start."}
            />
          </div>
          <p className={a.lede}>
            {featured
              ? featured.progress.lessonsDone === 0
                ? "Watch the video, flip through the slides or read the study material: whichever suits you today."
                : `You are ${featured.progress.percent}% through ${featured.snap.course.name}.`
              : "You are not enrolled on a course yet. Start with the level that matches your role today."}
          </p>
          <nav className={a.quick} aria-label="Jump into your lesson">
            <Link href={resumeHref} className={a.quickOn}>
              <Play aria-hidden /> {featured ? (featured.progress.lessonsDone === 0 ? "Start" : "Resume") : "Browse courses"}
            </Link>
            {featured && resume && (
              <>
                <Link href={`${resumeHref}?format=video`}>
                  <MonitorPlay aria-hidden /> Video
                </Link>
                <Link href={`${resumeHref}?format=slides`}>
                  <Presentation aria-hidden /> Slides
                </Link>
                <Link href={`${resumeHref}?format=reading`}>
                  <BookOpen aria-hidden /> Reading
                </Link>
              </>
            )}
            <Link href="/support/new">
              <LifeBuoy aria-hidden /> Ask for help
            </Link>
          </nav>
        </div>
        <aside className={a.profile} aria-label="Your profile">
          <div className={a.profileTop}>
            <span className={a.avatar} aria-hidden>
              {initials}
            </span>
            <span className={a.profileWho}>
              <b>{user.name}</b>
              <small>{myLevel ? `Level ${myLevel.sequence} · ${myLevel.name}` : "Choose your level"}</small>
            </span>
            <span className={a.streakChip} data-hot={streak > 0 || undefined} title={`Best run: ${best} days`}>
              <Flame aria-hidden /> {streak}
            </span>
          </div>
          <dl className={a.profileStats}>
            <div>
              <dt>Time learned</dt>
              <dd className="x-fig">{learned}</dd>
            </div>
            <div>
              <dt>Lessons</dt>
              <dd className="x-fig">{lessonsDone}</dd>
            </div>
            <div>
              <dt>Certificates</dt>
              <dd className="x-fig">{certificates.length}</dd>
            </div>
          </dl>
          <div className={a.weekChart} aria-label={`Lesson activity over the last 7 days: ${weekBars.map((b) => b.n).join(", ")}`}>
            {weekBars.map((b, i) => (
              <span key={b.key} data-today={i === 6 || undefined}>
                <i style={{ height: `${Math.max(6, (b.n / weekMax) * 100)}%`, animationDelay: `${i * 60}ms` }} data-on={b.n > 0 || undefined} />
                <small>{b.label}</small>
              </span>
            ))}
          </div>
        </aside>
      </section>

      <div className={a.grid}>
        {/* ---------- continue ---------- */}
        {featured ? (
          <Link href={resumeHref} className={`x-slab x-green ${a.cont} ${a.g8}`}>
            <span className={a.contCopy}>
              <span className="x-lab" style={{ color: "var(--x-on-green-2)" }}>
                {featured.progress.lessonsDone === 0 ? "Start here" : "Continue where you left off"}
              </span>
              <span className={a.contCourse}>{featured.snap.course.name}</span>
              <span className={`x-display ${a.contLesson}`}>{resume?.title ?? "Course overview"}</span>
              <span className={a.contTrack} role="progressbar" aria-valuenow={featured.progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
                <span style={{ width: `${featured.progress.percent}%` }} />
              </span>
              <span className={a.contMeta}>
                {featured.progress.lessonsDone} of {featured.progress.lessonsTotal} lessons · {featured.progress.modules.length} modules
              </span>
              <span className={a.contBtn}>
                <Play aria-hidden /> {featured.progress.lessonsDone === 0 ? "Start learning" : "Resume lesson"}
              </span>
            </span>
            <Ring value={featured.progress.percent} />
          </Link>
        ) : (
          <Link href="/catalog" className={`x-slab x-green ${a.cont} ${a.g8}`}>
            <span className={a.contCopy}>
              <span className="x-lab" style={{ color: "var(--x-on-green-2)" }}>
                Start here
              </span>
              <span className={`x-display ${a.contLesson}`}>Find your level</span>
              <span className={a.contMeta}>Beginner, Professional, Leader or Executive Leadership</span>
              <span className={a.contBtn}>
                Browse courses <ArrowRight aria-hidden />
              </span>
            </span>
          </Link>
        )}

        {/* ---------- streak + goal ---------- */}
        <div className={a.g4}>
          <StreakCard streak={streak} best={best} doneToday={doneToday} goal={1} days={last7.map((d, i) => ({ ...d, on: activeDays.has(d.key), today: i === 6 }))} />
        </div>

        {/* ---------- course path + points + badges ---------- */}
        {featured && featured.progress.modules.length > 0 && (
          <div className={a.g8}>
            <CoursePath course={featured.snap.course.name} href={`/academy/${featured.snap.course.slug}`} resumeHref={resumeHref} modules={featured.progress.modules} />
          </div>
        )}
        <div className={`${featured && featured.progress.modules.length > 0 ? a.g4 : a.g12} ${a.stack}`}>
          <StatsCard lessons={lessonsDone} assessments={passedAttempts} certificates={certificates.length} />
          <Badges badges={BADGES} />
        </div>
      </div>

      <div className={a.columns}>
        <div className={a.main}>
          <div className={a.sectionHead}>
            <h2 className={`x-display ${a.h2}`}>My courses</h2>
            <Link href="/catalog" className={a.more}>
              Browse all courses →
            </Link>
          </div>
          {courses.length === 0 ? (
            <div className={`x-slab x-surface ${a.empty}`}>
              <p>Courses you enrol on appear here, with your progress and the next lesson.</p>
              <Link href="/catalog" className={a.btn}>
                Explore the Academy
              </Link>
            </div>
          ) : (
            <div className={a.cards}>
              {courses.map((c) => {
                const { e, snap, progress, elig } = c;
                const serial = certFor.get(e.programId);
                const next = resumeOf(c);
                const level = levels.find((l) => l.id === e.program.levelId);
                return (
                  <article key={e.id} className={`x-slab x-surface ${a.card}`}>
                    <div className={a.cardTop}>
                      <span className={a.levelChip} data-level={level?.sequence ?? 1}>
                        Level {level?.sequence ?? "–"} · {level?.name ?? "Course"}
                      </span>
                      {serial ? (
                        <span className="x-pill" data-tone="good">
                          Certified
                        </span>
                      ) : progress.percent === 100 ? (
                        <span className="x-pill" data-tone="good">
                          Complete
                        </span>
                      ) : null}
                    </div>
                    <h3 className={a.cardTitle}>
                      <Link href={`/academy/${snap.course.slug}`}>{snap.course.name}</Link>
                    </h3>
                    <div className={a.segments} aria-hidden>
                      {progress.modules.slice(0, 24).map((m) => (
                        <i key={m.id} data-state={m.total && m.done === m.total ? "done" : m.done ? "part" : "todo"} title={`${m.title}: ${m.done}/${m.total}`} />
                      ))}
                    </div>
                    <div className={a.progressRow}>
                      <span className={`x-fig ${a.pct}`}>{progress.percent}%</span>
                      <span className={a.cardMeta}>
                        {progress.lessonsTotal ? `${progress.lessonsDone} of ${progress.lessonsTotal} lessons · ${progress.modules.length} modules` : "Lessons are being added to this course"}
                      </span>
                    </div>
                    {next && (
                      <p className={a.next}>
                        <span>Next</span> {next.title}
                      </p>
                    )}
                    <div className={a.cardActions}>
                      {next && (
                        <Link href={`/academy/${snap.course.slug}/${next.id}`} className={a.btn}>
                          {progress.lessonsDone === 0 ? "Start" : "Continue"}
                        </Link>
                      )}
                      {serial ? (
                        <Link href={`/certificates/${serial}`} className={a.ghost}>
                          View certificate
                        </Link>
                      ) : elig?.eligible ? (
                        <ClaimButton programId={e.programId} className={a.btn} />
                      ) : (
                        <Link href={`/academy/${snap.course.slug}`} className={a.ghost}>
                          Curriculum
                        </Link>
                      )}
                    </div>
                    {!serial && elig && !elig.eligible && elig.lessonsTotal > 0 && (
                      <p className={a.certHint}>
                        <Award className="h-3.5 w-3.5" aria-hidden /> Certificate after {elig.lessonsTotal - elig.lessonsDone} more lesson{elig.lessonsTotal - elig.lessonsDone === 1 ? "" : "s"}
                        {elig.quizzesTotal - elig.quizzesPassed > 0 && ` and ${elig.quizzesTotal - elig.quizzesPassed} assessment${elig.quizzesTotal - elig.quizzesPassed === 1 ? "" : "s"}`}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {covered.length > 0 && (
            <section className={`x-slab x-surface ${a.covered}`}>
              <span className="x-lab">Included in your subscription</span>
              <ul className={a.list}>
                {covered.map((c) => (
                  <li key={c.id}>
                    <Link href={`/catalog/${c.slug}`}>{c.name}</Link>
                    <ActionForm action={enrolFreeAction} redirectTo={`/academy/${c.slug}`}>
                      <input type="hidden" name="courseId" value={c.id} />
                      <button className={a.ghost}>Start</button>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {levels.length > 0 && (
            <section className={`x-slab x-surface ${a.pathSlab}`} aria-labelledby="path-title">
              <div className={a.pathHead}>
                <div>
                  <span className="x-lab" id="path-title">
                    Your path · learner to leader
                  </span>
                  <p className={a.slabNote}>Four levels, each a step up. Finish a level to earn its badge.</p>
                </div>
                <LevelBars current={currentLevel} done={levelsDone} className={a.pathArt} />
              </div>
              <ol className={a.path}>
                {levels.map((l, i) => {
                  const badge = badges.find((b) => b.levelId === l.id);
                  const here = featured?.e.program.levelId === l.id;
                  const mine = courses.filter((c) => c.e.program.levelId === l.id && c.progress.lessonsTotal > 0);
                  const started = mine.some((c) => c.progress.lessonsDone > 0);
                  const state = badge ? "done" : here ? "here" : mine.length ? "mine" : "ahead";
                  const label = badge ? "Completed" : here ? "You are here" : started ? "In progress" : mine.length ? "Enrolled" : `${l.courses.length} course${l.courses.length === 1 ? "" : "s"}`;
                  return (
                    <li key={l.id} className={a.step} data-state={state} style={{ "--lift": `${(levels.length - 1 - i) * 14}px` } as React.CSSProperties}>
                      <span className={a.stepN}>Level {String(l.sequence).padStart(2, "0")}</span>
                      <span className={a.stepName}>{l.name}</span>
                      <span className={a.stepState}>{label}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        <aside className={a.side}>
          <section className={`x-slab x-surface`}>
            <span className={a.slabHead}>
              <span className="x-lab">Assessments</span>
              {upcoming.length + pendingAttempts.length > 0 && <span className={a.count}>{upcoming.length + pendingAttempts.length}</span>}
            </span>
            {upcoming.length === 0 && pendingAttempts.length === 0 ? (
              <p className={a.muted}>Nothing waiting. Assessments appear here when you reach them.</p>
            ) : (
              <ul className={a.tasks}>
                {pendingAttempts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/academy/attempts/${p.id}`}>
                      <span className={a.taskTitle}>{p.quiz.title}</span>
                      <span className={a.taskMeta}>{p.status === "IN_PROGRESS" ? "In progress: resume" : "Waiting for marking"}</span>
                    </Link>
                  </li>
                ))}
                {upcoming.slice(0, 5).map((u) => (
                  <li key={u.quiz.id}>
                    <Link href={`/academy/${u.course.slug}/${u.lesson.id}#assess`}>
                      <span className={a.taskTitle}>{u.quiz.title}</span>
                      <span className={a.taskMeta}>
                        {u.course.name} · pass mark {u.quiz.passingScore}%{u.best >= 0 ? ` · best so far ${u.best}%` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="x-slab x-surface">
            <span className="x-lab">Updates</span>
            {notifications.length === 0 ? (
              <p className={a.muted}>No updates yet.</p>
            ) : (
              <ul className={a.tasks}>
                {notifications.map((n) => (
                  <li key={n.id} data-unread={!n.readAt || undefined}>
                    <Link href={n.href ?? "#"}>
                      <span className={a.taskTitle}>{n.title}</span>
                      <span className={a.taskMeta}>{when(n.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {saved.length > 0 && (
            <section className="x-slab x-mint">
              <span className="x-lab">Saved lessons</span>
              <ul className={a.tasks}>
                {saved.slice(0, 6).map((b) => (
                  <li key={b.lessonId}>
                    <Link href={b.href}>
                      <span className={a.taskTitle}>{b.title}</span>
                      <span className={a.taskMeta}>{b.course}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={`x-slab x-peri ${a.soon}`} aria-label="Coming soon">
            <span className="x-lab">Coming soon</span>
            <ul>
              <li>
                <b>Mentoring</b>
                <small>One-to-one time with experienced RCM operators.</small>
              </li>
              <li>
                <b>Downloadable materials</b>
                <small>Take-away versions of selected slides and readings.</small>
              </li>
            </ul>
          </section>

          <section className={`x-slab x-night ${a.help}`}>
            <span className="x-lab">Need help?</span>
            <p>Questions about a lesson, your access or an assessment go to our support team.</p>
            <Link href="/support/new" className={a.helpBtn}>
              Ask support <ArrowRight aria-hidden />
            </Link>
          </section>

          <p className={a.fine}>Educational content only. Every example is synthetic: never enter real patient information anywhere in RCMExcel.</p>
        </aside>
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 76 76" className={a.ring} role="img" aria-label={`${value}% complete`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="7" />
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--x-on-green)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle" style={{ fill: "var(--x-on-green)", font: "300 15px var(--x-fig)" }}>
        {value}%
      </text>
    </svg>
  );
}
