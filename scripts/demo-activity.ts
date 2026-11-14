import "dotenv/config";
import { allowCliAccountCreation } from "../lib/launch";

/**
 * LOCAL DEVELOPMENT ONLY. Fills a dev database with synthetic learning activity so the admin
 * dashboard and the student pages can be seen working: publishes the specification courses that
 * have content, creates a named test student plus a cohort of synthetic students (fictional names,
 * example.test addresses), enrols them and spreads lesson progress and assessment attempts over
 * the last 90 days. Refuses to run unless the database and the site address are local.
 *
 *   npx tsx scripts/demo-activity.ts
 */

allowCliAccountCreation();

const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Vikram", "Priya", "Arjun", "Sneha", "Nikhil", "Ishita", "Rahul", "Kavya", "Siddharth", "Pooja", "Aditya", "Neha", "Karan", "Riya", "Emily", "James", "Olivia", "Daniel"];
const LAST = ["Sharma", "Reddy", "Iyer", "Nair", "Gupta", "Patel", "Rao", "Menon", "Das", "Kapoor", "Singh", "Joshi", "Brown", "Miller"];
const PASSWORD = "Rcms-dev-password-1";

let seed = 20261113;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

async function main() {
  const local = (u: string) => {
    try {
      return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);
    } catch {
      return false;
    }
  };
  if (process.env.NODE_ENV === "production" || !local(process.env.DATABASE_URL ?? "") || !local(process.env.BETTER_AUTH_URL ?? "http://localhost:3000")) {
    throw new Error("demo-activity runs only against a local development database.");
  }
  const { prisma } = await import("../lib/db");
  const { auth } = await import("../lib/auth");
  const { loadActor } = await import("../lib/actor");
  const { publishNow } = await import("../lib/services/cms/release");

  const admin = await prisma.user.findFirst({ where: { staffRoles: { some: { role: "SUPER_ADMIN" } } } });
  if (!admin) throw new Error("Create an admin first (npm run admin:create or dev:accounts).");
  const actor = (await loadActor(admin.id))!;

  // Publish specification courses that have at least one lesson with content.
  for (const slug of ["rcm-foundation", "process-excellence", "operational-management", "strategic-excellence"]) {
    const c = await prisma.program.findUnique({ where: { slug }, select: { id: true, name: true } });
    if (!c) continue;
    try {
      const r = await publishNow(actor, c.id, "Demo publish");
      console.log(`[demo] published ${c.name} v${r.version}`);
    } catch (e) {
      console.log(`[demo] ${c.name}: ${e instanceof Error ? e.message : e}`);
    }
  }

  const ensure = async (email: string, name: string) => {
    if (!(await prisma.user.findUnique({ where: { email } }))) await auth.api.signUpEmail({ body: { email, password: PASSWORD, name, acceptTerms: true } as { email: string; password: string; name: string } });
    return prisma.user.update({ where: { email }, data: { emailVerified: true, status: "ACTIVE" } });
  };

  const live = await prisma.program.findMany({ where: { state: "PUBLISHED", publishedVersionId: { not: null } }, select: { id: true, name: true, modules: { where: { state: "PUBLISHED" }, orderBy: { sortOrder: "asc" }, select: { lessons: { where: { state: "PUBLISHED" }, orderBy: { sortOrder: "asc" }, select: { id: true, quizzes: { select: { id: true } } } } } } } });
  if (!live.length) throw new Error("No published course to enrol students on.");

  const testStudent = await ensure("test.student@rcmexcel.test", "Test Student");
  const cohort = [testStudent];
  for (let i = 0; i < 46; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const u = await ensure(`learner${String(i + 1).padStart(2, "0")}@example.test`, name);
    cohort.push(u);
  }

  const now = Date.now();
  let enrolled = 0;
  let progressRows = 0;
  let attempts = 0;
  for (const [i, u] of cohort.entries()) {
    const joined = new Date(now - Math.floor(rand() * 88 + 1) * 86400_000);
    await prisma.user.update({ where: { id: u.id }, data: { createdAt: u.id === testStudent.id ? new Date(now - 20 * 86400_000) : joined } });
    const courses = i === 0 ? live : live.filter(() => rand() < 0.6);
    for (const c of courses.length ? courses : [live[0]]) {
      const start = new Date(Math.max(joined.getTime(), now - 85 * 86400_000) + Math.floor(rand() * 3) * 86400_000);
      await prisma.enrolment.upsert({ where: { userId_programId: { userId: u.id, programId: c.id } }, create: { userId: u.id, programId: c.id, source: "ADMIN", state: "ACTIVE", startedAt: start, createdAt: start }, update: {} });
      enrolled++;
      const lessons = c.modules.flatMap((m) => m.lessons);
      const reach = i === 0 ? Math.max(1, Math.floor(lessons.length * 0.4)) : Math.floor(rand() * (lessons.length + 1));
      for (const [k, l] of lessons.slice(0, reach).entries()) {
        const viewed = new Date(Math.min(now - 3600_000, start.getTime() + (k + 1) * Math.floor(rand() * 4 + 1) * 86400_000));
        const done = k < reach - 1 || rand() < 0.6;
        await prisma.progress.upsert({
          where: { userId_lessonId: { userId: u.id, lessonId: l.id } },
          create: { userId: u.id, lessonId: l.id, startedAt: viewed, lastViewedAt: viewed, completedAt: done ? viewed : null, secondsIn: 300 + Math.floor(rand() * 900) },
          update: {},
        });
        progressRows++;
        if (done && l.quizzes[0] && rand() < 0.7) {
          const score = 50 + Math.floor(rand() * 50);
          const n = await prisma.quizAttempt.count({ where: { userId: u.id, quizId: l.quizzes[0].id } });
          await prisma.quizAttempt.create({ data: { quizId: l.quizzes[0].id, userId: u.id, attemptNo: n + 1, status: "GRADED", score, passed: score >= 75, answers: {}, startedAt: viewed, submittedAt: viewed, gradedAt: viewed } });
          attempts++;
        }
      }
    }
  }
  console.log(`[demo] ${cohort.length} students, ${enrolled} enrolments, ${progressRows} lesson progress rows, ${attempts} assessment attempts`);
  console.log(`[demo] test student: test.student@rcmexcel.test / ${PASSWORD}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
