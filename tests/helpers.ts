import { randomUUID } from "node:crypto";
import type { AccountStatus, Role, StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { loadActor, type Actor } from "@/lib/actor";

/**
 * Empties every table. Foreign-key checks are switched off for the duration, on one connection
 * (an interactive transaction holds it). AuditLog is truncated because its triggers refuse
 * DELETE; TRUNCATE does not fire them.
 */
export async function resetDb() {
  const rows = await prisma.$queryRaw<{ t: string }[]>`
    SELECT TABLE_NAME AS t FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'`;
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      for (const { t } of rows) await tx.$executeRawUnsafe(t === "AuditLog" ? "TRUNCATE TABLE `AuditLog`" : `DELETE FROM \`${t}\``);
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    },
    { timeout: 60_000 },
  );
}

export async function makeUser(opts: { role?: Role; staff?: StaffRole[]; status?: AccountStatus; name?: string; email?: string; verified?: boolean } = {}): Promise<Actor> {
  const id = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      name: opts.name ?? `User ${id}`,
      email: opts.email ?? `u-${id}@example.test`,
      emailVerified: opts.verified ?? true,
      role: opts.role ?? "STUDENT",
      status: opts.status ?? "ACTIVE",
      staffRoles: opts.staff?.length ? { create: opts.staff.map((role) => ({ role })) } : undefined,
    },
  });
  return (await loadActor(user.id))!;
}

export const staff = (role: StaffRole, name?: string) => makeUser({ staff: [role], name });

/** A level with one course holding modules and ready lessons with a text block each. */
export async function makeCourseDraft(author: Actor, opts: { modules?: number; lessons?: number; complianceSensitive?: boolean } = {}) {
  const { createLevel, createCourse, createModule, createLesson, setLessonState, setModuleState, updateCourse } = await import("@/lib/services/cms/structure");
  const { addBlock } = await import("@/lib/services/cms/blocks");
  const level = await createLevel(await superAdmin(), {
    name: `Level ${randomUUID().slice(0, 4)}`,
    displayTitle: "Trainee — Foundation",
    shortDescription: "Build a dependable foundation in US healthcare billing.",
    accent: "teal",
  });
  const course = await createCourse(author, { levelId: level.id, name: `Course ${randomUUID().slice(0, 4)}` });
  const fresh = await prisma.program.findUniqueOrThrow({ where: { id: course.id } });
  await updateCourse(
    author,
    course.id,
    {
      name: fresh.name,
      levelId: level.id,
      description: "Synthetic course used in automated tests.",
      complianceSensitive: opts.complianceSensitive ?? true,
      includedInSubscription: true,
      isFree: false,
      effectiveDate: "2026-01-01",
      reviewDate: "2027-01-01",
      outcomes: "Explain the claim lifecycle",
    },
    fresh.lockVersion,
  );
  const modules = [];
  for (let m = 0; m < (opts.modules ?? 2); m++) {
    const mod = await createModule(author, course.id, { title: `Module ${m + 1}` });
    await setModuleState(author, mod.id, "PUBLISHED");
    const lessons = [];
    for (let l = 0; l < (opts.lessons ?? 2); l++) {
      const lesson = await createLesson(author, mod.id, { title: `Lesson ${m + 1}.${l + 1}` });
      await addBlock(author, lesson.id, "TEXT", { text: `Synthetic lesson text ${m + 1}.${l + 1}.` });
      await setLessonState(author, lesson.id, "PUBLISHED");
      lessons.push(lesson);
    }
    modules.push({ ...mod, lessons });
  }
  return { level, course, modules };
}

let cachedSuper: Actor | null = null;
export async function superAdmin() {
  if (cachedSuper && (await prisma.user.findUnique({ where: { id: cachedSuper.id } }))) return cachedSuper;
  cachedSuper = await makeUser({ role: "OWNER", name: "Platform Owner" });
  return cachedSuper;
}

/** Walks a draft through academic and compliance review and publishes it. */
export async function releaseCourse(courseId: string, author: Actor) {
  const { submitForReview, reviewAcademic, reviewCompliance, publishCourse } = await import("@/lib/services/cms/release");
  const academic = await staff("ACADEMIC_REVIEWER");
  const compliance = await staff("COMPLIANCE_REVIEWER");
  const director = await staff("ACADEMY_DIRECTOR");
  await submitForReview(author, courseId, "Ready");
  const next = await reviewAcademic(academic, courseId, true);
  if (next === "COMPLIANCE_REVIEW") await reviewCompliance(compliance, courseId, true);
  return publishCourse(director, courseId);
}

export async function enrol(userId: string, programId: string) {
  return prisma.enrolment.create({ data: { userId, programId, source: "ADMIN" } });
}
