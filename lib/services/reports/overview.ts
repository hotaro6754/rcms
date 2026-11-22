import { prisma } from "@/lib/db";
import { assertCan, type Actor } from "@/lib/actor";

/**
 * Everything the admin dashboard draws, computed from stored records only (no invented
 * figures). Daily series cover 90 days so the page can switch between 7, 30 and 90 days in the
 * browser without another request. "Insights" are rules over these numbers, worded plainly;
 * they are not generated text.
 */

const DAY = 86400_000;
const LEARNER = { role: "STUDENT" as const, staffRoles: { none: {} }, NOT: { email: { endsWith: "@deleted.invalid" } } };

export interface DailyPoint {
  day: string; // YYYY-MM-DD (IST)
  signups: number;
  enrolments: number;
  active: number;
  completions: number;
  attempts: number;
  passed: number;
  revenue: number; // paise
}

export interface CourseRow {
  id: string;
  name: string;
  level: string;
  levelSeq: number;
  live: boolean;
  version: number | null;
  enrolled: number;
  active14: number;
  avgProgress: number; // 0–100
  completed: number;
  passRate: number | null;
  lessons: number;
}

export interface CoverageCell {
  moduleId: string;
  module: string;
  courseId: string;
  course: string;
  level: string;
  video: number;
  slides: number;
  reading: number;
  lessons: number;
}

export interface ActivityItem {
  id: string;
  at: string;
  kind: "enrolment" | "completion" | "attempt" | "certificate" | "signup";
  who: string;
  what: string;
  href?: string;
}

export interface Insight {
  tone: "good" | "watch" | "act";
  title: string;
  body: string;
  href?: string;
}

export interface Overview {
  generatedAt: string;
  totals: { students: number; activeStudents: number; liveCourses: number; draftCourses: number; certificates: number; lessonsWithContent: number; lessons: number };
  daily: DailyPoint[];
  funnel: { label: string; value: number }[];
  courses: CourseRow[];
  coverage: CoverageCell[];
  activity: ActivityItem[];
  insights: Insight[];
}

const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);

export async function overview(actor: Actor): Promise<Overview> {
  await assertCan(actor, "reports.view", { entity: "Report", id: "overview" });
  const now = new Date();
  const from = new Date(now.getTime() - 89 * DAY);
  from.setUTCHours(0, 0, 0, 0);
  const active14 = new Date(now.getTime() - 14 * DAY);

  const [students, activeStudents, signups, enrolments, views, completions, attempts, orders, programs, certificates, recentCerts, modules, enrolByCourse, progressRows] = await Promise.all([
    prisma.user.count({ where: LEARNER }),
    prisma.progress.findMany({ where: { lastViewedAt: { gte: active14 }, user: LEARNER }, distinct: ["userId"], select: { userId: true } }).then((r) => r.length),
    prisma.user.findMany({ where: { ...LEARNER, createdAt: { gte: from } }, select: { createdAt: true, name: true, id: true }, orderBy: { createdAt: "desc" } }),
    prisma.enrolment.findMany({ where: { createdAt: { gte: from }, user: LEARNER }, select: { id: true, createdAt: true, user: { select: { name: true, id: true } }, program: { select: { name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.progress.findMany({ where: { lastViewedAt: { gte: from }, user: LEARNER }, select: { userId: true, lastViewedAt: true } }),
    prisma.progress.findMany({ where: { completedAt: { gte: from }, user: LEARNER }, select: { id: true, completedAt: true, user: { select: { name: true, id: true } }, lesson: { select: { title: true } } }, orderBy: { completedAt: "desc" } }),
    prisma.quizAttempt.findMany({ where: { submittedAt: { gte: from }, user: LEARNER }, select: { id: true, submittedAt: true, passed: true, score: true, user: { select: { name: true, id: true } }, quiz: { select: { title: true } } }, orderBy: { submittedAt: "desc" } }),
    prisma.order.findMany({ where: { paidAt: { gte: from }, state: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, select: { paidAt: true, amount: true } }),
    prisma.program.findMany({
      where: { archivedAt: null, isTemplate: false },
      select: {
        id: true,
        name: true,
        state: true,
        publishedVersion: { select: { version: true } },
        level: true,
        learningLevel: { select: { name: true, sequence: true } },
        modules: { where: { state: { not: "ARCHIVED" } }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true, lessons: { where: { state: { not: "ARCHIVED" } }, select: { id: true, blocks: { where: { kind: "VIDEO" }, select: { id: true } }, resources: { where: { archivedAt: null }, select: { format: true } }, quizzes: { where: { archivedAt: null }, select: { id: true } } } } } },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.certificate.count({ where: { revokedAt: null } }),
    prisma.certificate.findMany({ where: { issuedAt: { gte: from } }, select: { id: true, issuedAt: true, holderName: true, programName: true, userId: true }, orderBy: { issuedAt: "desc" }, take: 10 }),
    Promise.resolve(null),
    prisma.enrolment.groupBy({ by: ["programId"], where: { user: LEARNER }, _count: { _all: true } }),
    prisma.progress.findMany({ where: { user: LEARNER }, select: { userId: true, lessonId: true, completedAt: true, lastViewedAt: true } }),
  ]);
  void modules;

  // ---- daily series --------------------------------------------------------
  const days: DailyPoint[] = [];
  const index = new Map<string, DailyPoint>();
  for (let i = 0; i < 90; i++) {
    const d = ist(new Date(from.getTime() + i * DAY + 12 * 3600_000));
    const p = { day: d, signups: 0, enrolments: 0, active: 0, completions: 0, attempts: 0, passed: 0, revenue: 0 };
    days.push(p);
    index.set(d, p);
  }
  const bump = (d: Date | null | undefined, k: keyof Omit<DailyPoint, "day">, n = 1) => {
    if (!d) return;
    const p = index.get(ist(d));
    if (p) p[k] += n;
  };
  for (const u of signups) bump(u.createdAt, "signups");
  for (const e of enrolments) bump(e.createdAt, "enrolments");
  for (const c of completions) bump(c.completedAt, "completions");
  for (const a of attempts) {
    bump(a.submittedAt, "attempts");
    if (a.passed) bump(a.submittedAt, "passed");
  }
  for (const o of orders) bump(o.paidAt, "revenue", o.amount);
  const activeByDay = new Map<string, Set<string>>();
  for (const v of views) {
    if (!v.lastViewedAt) continue;
    const k = ist(v.lastViewedAt);
    if (!activeByDay.has(k)) activeByDay.set(k, new Set());
    activeByDay.get(k)!.add(v.userId);
  }
  for (const [k, set] of activeByDay) {
    const p = index.get(k);
    if (p) p.active = set.size;
  }

  // ---- courses and coverage ------------------------------------------------
  const enrolledMap = new Map(enrolByCourse.map((g) => [g.programId, g._count._all]));
  const lessonCourse = new Map<string, string>();
  const courseLessons = new Map<string, number>();
  const coverage: CoverageCell[] = [];
  let lessonsWithContent = 0;
  let lessonCount = 0;
  for (const p of programs) {
    let n = 0;
    for (const m of p.modules) {
      const cell: CoverageCell = { moduleId: m.id, module: m.title, courseId: p.id, course: p.name, level: p.learningLevel?.name ?? `Level ${p.level}`, video: 0, slides: 0, reading: 0, lessons: m.lessons.length };
      for (const l of m.lessons) {
        lessonCourse.set(l.id, p.id);
        n++;
        lessonCount++;
        const v = l.blocks.length > 0;
        const s = l.resources.some((r) => r.format === "SLIDES");
        const r = l.resources.some((x) => x.format === "READING");
        if (v) cell.video++;
        if (s) cell.slides++;
        if (r) cell.reading++;
        if (v || s || r || l.quizzes.length) lessonsWithContent++;
      }
      coverage.push(cell);
    }
    courseLessons.set(p.id, n);
  }

  const perCourse = new Map<string, { users: Set<string>; active: Set<string>; done: Map<string, number> }>();
  for (const r of progressRows) {
    const c = lessonCourse.get(r.lessonId);
    if (!c) continue;
    if (!perCourse.has(c)) perCourse.set(c, { users: new Set(), active: new Set(), done: new Map() });
    const pc = perCourse.get(c)!;
    pc.users.add(r.userId);
    if (r.lastViewedAt && r.lastViewedAt >= active14) pc.active.add(r.userId);
    if (r.completedAt) pc.done.set(r.userId, (pc.done.get(r.userId) ?? 0) + 1);
  }
  const quizCourse = await prisma.quizAttempt.findMany({ where: { user: LEARNER, status: { in: ["GRADED", "EXPIRED"] } }, select: { passed: true, quiz: { select: { lesson: { select: { module: { select: { programId: true } } } } } } } });
  const passBy = new Map<string, { p: number; t: number }>();
  for (const q of quizCourse) {
    const c = q.quiz.lesson?.module.programId;
    if (!c) continue;
    const x = passBy.get(c) ?? { p: 0, t: 0 };
    x.t++;
    if (q.passed) x.p++;
    passBy.set(c, x);
  }
  const completedBy = new Map((await prisma.enrolment.groupBy({ by: ["programId"], where: { state: "COMPLETED", user: LEARNER }, _count: { _all: true } })).map((g) => [g.programId, g._count._all]));

  const courses: CourseRow[] = programs.map((p) => {
    const pc = perCourse.get(p.id);
    const total = courseLessons.get(p.id) ?? 0;
    const enrolled = enrolledMap.get(p.id) ?? 0;
    const avg = pc && total && pc.users.size ? Math.round(([...pc.done.values()].reduce((a, b) => a + b, 0) / (pc.users.size * total)) * 100) : 0;
    const pr = passBy.get(p.id);
    return {
      id: p.id,
      name: p.name,
      level: p.learningLevel?.name ?? `Level ${p.level}`,
      levelSeq: p.learningLevel?.sequence ?? p.level,
      live: p.state === "PUBLISHED" && !!p.publishedVersion,
      version: p.publishedVersion?.version ?? null,
      enrolled,
      active14: pc?.active.size ?? 0,
      avgProgress: Math.min(100, avg),
      completed: completedBy.get(p.id) ?? 0,
      passRate: pr && pr.t ? Math.round((pr.p / pr.t) * 100) : null,
      lessons: total,
    };
  });

  // ---- funnel ---------------------------------------------------------------
  const enrolledUsers = new Set((await prisma.enrolment.findMany({ where: { user: LEARNER }, select: { userId: true }, distinct: ["userId"] })).map((e) => e.userId));
  const startedUsers = new Set(progressRows.map((r) => r.userId));
  const completedUsers = new Set(progressRows.filter((r) => r.completedAt).map((r) => r.userId));
  const certified = new Set((await prisma.certificate.findMany({ where: { revokedAt: null }, select: { userId: true }, distinct: ["userId"] })).map((c) => c.userId));
  const funnel = [
    { label: "Students", value: students },
    { label: "Enrolled", value: enrolledUsers.size },
    { label: "Started a lesson", value: startedUsers.size },
    { label: "Completed a lesson", value: completedUsers.size },
    { label: "Certified", value: certified.size },
  ];

  // ---- activity -------------------------------------------------------------
  const activity: ActivityItem[] = [
    ...enrolments.slice(0, 12).map((e) => ({ id: `e${e.id}`, at: e.createdAt.toISOString(), kind: "enrolment" as const, who: e.user.name, what: `enrolled on ${e.program.name}`, href: `/admin/subscribers/${e.user.id}` })),
    ...completions.slice(0, 12).map((c) => ({ id: `c${c.id}`, at: c.completedAt!.toISOString(), kind: "completion" as const, who: c.user.name, what: `completed “${c.lesson.title}”`, href: `/admin/subscribers/${c.user.id}` })),
    ...attempts.slice(0, 12).map((a) => ({ id: `a${a.id}`, at: a.submittedAt!.toISOString(), kind: "attempt" as const, who: a.user.name, what: `${a.passed ? "passed" : "attempted"} ${a.quiz.title}${a.score !== null ? ` · ${a.score}%` : ""}`, href: `/admin/subscribers/${a.user.id}` })),
    ...recentCerts.map((c) => ({ id: `z${c.id}`, at: c.issuedAt.toISOString(), kind: "certificate" as const, who: c.holderName, what: `earned the ${c.programName} certificate`, href: `/admin/subscribers/${c.userId}` })),
    ...signups.slice(0, 8).map((u) => ({ id: `s${u.id}`, at: u.createdAt.toISOString(), kind: "signup" as const, who: u.name, what: "joined as a student", href: `/admin/subscribers/${u.id}` })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 18);

  // ---- insights (rules, not generated text) --------------------------------
  const insights: Insight[] = [];
  const noVideo = coverage.reduce((n, c) => n + (c.lessons - c.video), 0);
  const noSlides = coverage.reduce((n, c) => n + (c.lessons - c.slides), 0);
  const noReading = coverage.reduce((n, c) => n + (c.lessons - c.reading), 0);
  if (lessonCount && noVideo) insights.push({ tone: "act", title: `${noVideo} of ${lessonCount} lessons have no video yet`, body: "Video is the main format. The content map below shows exactly which modules are missing one.", href: "#coverage" });
  if (lessonCount && (noSlides || noReading)) insights.push({ tone: "watch", title: `${noSlides} lessons need slides, ${noReading} need reading`, body: "Students who prefer slides or reading see only the formats a lesson has." , href: "#coverage" });
  const drafts = courses.filter((c) => !c.live);
  if (drafts.length) insights.push({ tone: "watch", title: `${drafts.length} course${drafts.length > 1 ? "s are" : " is"} not published`, body: drafts.slice(0, 3).map((c) => c.name).join(", ") + (drafts.length > 3 ? "…" : ""), href: "/admin/content" });
  const last7 = days.slice(-7);
  const prev7 = days.slice(-14, -7);
  const sum = (arr: DailyPoint[], k: keyof Omit<DailyPoint, "day">) => arr.reduce((n, p) => n + p[k], 0);
  const e7 = sum(last7, "enrolments");
  const ep = sum(prev7, "enrolments");
  if (e7 || ep) insights.push({ tone: e7 >= ep ? "good" : "watch", title: `Enrolments ${e7 >= ep ? "up" : "down"}: ${e7} this week vs ${ep} last week`, body: e7 >= ep ? "Momentum is holding." : "Check the catalogue and recent announcements." });
  const inactive = [...enrolledUsers].filter((u) => !progressRows.some((r) => r.userId === u && r.lastViewedAt && r.lastViewedAt >= active14)).length;
  if (inactive) insights.push({ tone: "watch", title: `${inactive} enrolled student${inactive > 1 ? "s have" : " has"} not opened a lesson in 14 days`, body: "A reminder from Support usually brings students back.", href: "/admin/subscribers" });
  const lowPass = courses.filter((c) => c.passRate !== null && c.passRate < 60);
  if (lowPass.length) insights.push({ tone: "act", title: `Low pass rate in ${lowPass[0].name} (${lowPass[0].passRate}%)`, body: "Review the questions most students miss, or the lesson that teaches them.", href: "/admin/content/banks" });
  if (!insights.length) insights.push({ tone: "good", title: "Everything looks on track", body: "No gaps in content and no drop in activity this week." });

  return {
    generatedAt: now.toISOString(),
    totals: { students, activeStudents, liveCourses: courses.filter((c) => c.live).length, draftCourses: drafts.length, certificates, lessonsWithContent, lessons: lessonCount },
    daily: days,
    funnel,
    courses,
    coverage,
    activity,
    insights,
  };
}
