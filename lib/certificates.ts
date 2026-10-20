import { randomInt } from "node:crypto";
import { prisma } from "./db";
import { flatLessons, type CourseSnapshot } from "./cms/snapshot";
import { BRAND } from "@/lib/brand";

/**
 * Certificates: what earns one, and how it is identified.
 *
 * A learner has earned a course's certificate when the course's released version has at
 * least one lesson, every lesson in it is complete, and every assessment in it has a
 * passing, graded attempt. Nothing else counts: not time enrolled, not payment, not a
 * button. Eligibility is computed here from stored records only.
 */

export interface Eligibility {
  eligible: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
  version: number | null;
  passedAttemptIds: string[];
}

export async function eligibility(userId: string, programId: string): Promise<Eligibility> {
  const course = await prisma.program.findUnique({ where: { id: programId }, select: { publishedVersion: { select: { version: true, snapshot: true } } } });
  if (!course?.publishedVersion) {
    return { eligible: false, lessonsDone: 0, lessonsTotal: 0, quizzesPassed: 0, quizzesTotal: 0, version: null, passedAttemptIds: [] };
  }
  const lessons = flatLessons(course.publishedVersion.snapshot as unknown as CourseSnapshot);
  const lessonIds = lessons.map((l) => l.id);
  const quizIds = lessons.flatMap((l) => (l.assessment ? [l.assessment.id] : []));

  const done = lessonIds.length ? await prisma.progress.count({ where: { userId, lessonId: { in: lessonIds }, completedAt: { not: null } } }) : 0;
  const passed = quizIds.length
    ? await prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: quizIds }, passed: true, status: { in: ["GRADED", "EXPIRED"] } },
        orderBy: { score: "desc" },
        distinct: ["quizId"],
        select: { id: true, quizId: true },
      })
    : [];

  return {
    eligible: lessonIds.length > 0 && done === lessonIds.length && passed.length === quizIds.length,
    lessonsDone: done,
    lessonsTotal: lessonIds.length,
    quizzesPassed: passed.length,
    quizzesTotal: quizIds.length,
    version: course.publishedVersion.version,
    passedAttemptIds: passed.map((p) => p.id),
  };
}

// No 0/O or 1/I/L: a serial is read aloud and typed in by hand.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** RCMX-L1-7KQ4-M9TX-3HPA: the level, then three random blocks (about 10^17 combinations). */
export async function newSerial(prefix: string | number): Promise<string> {
  const head = typeof prefix === "number" ? `L${prefix}` : prefix;
  for (let i = 0; i < 8; i++) {
    const serial = `${BRAND.serialPrefix}-${head}-${block()}-${block()}-${block()}`;
    const [cert, badge] = await Promise.all([
      prisma.certificate.findUnique({ where: { serial }, select: { id: true } }),
      prisma.levelBadge.findUnique({ where: { serial }, select: { id: true } }),
    ]);
    if (!cert && !badge) return serial;
  }
  throw new Error("Could not allocate a certificate serial.");
}

/** Public verification path for a serial. */
export function verifyPath(serial: string) {
  return `/certificates/${serial}`;
}
