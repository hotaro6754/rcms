import { randomInt } from "node:crypto";
import { prisma } from "./db";

/**
 * Certificates: what earns one, and how it is identified.
 *
 * A student has earned a program's certificate when the program has at least one
 * published lesson, every published lesson is marked complete, and every quiz attached to
 * those lessons has a passing attempt. Nothing else counts: not time enrolled, not payment.
 *
 * Server-only. The actions in lib/actions/certificates.ts and the portal and admin pages
 * all read eligibility from here, so the rule has one definition.
 */

export interface Eligibility {
  eligible: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  quizzesPassed: number;
  quizzesTotal: number;
}

export async function eligibility(userId: string, programId: string): Promise<Eligibility> {
  const lessons = await prisma.lesson.findMany({
    where: { state: "PUBLISHED", module: { programId } },
    select: { id: true, quizzes: { where: { questions: { some: {} } }, select: { id: true } } },
  });
  const lessonIds = lessons.map((l) => l.id);
  const quizIds = lessons.flatMap((l) => l.quizzes.map((q) => q.id));

  const done = lessonIds.length
    ? await prisma.progress.count({ where: { userId, lessonId: { in: lessonIds }, completedAt: { not: null } } })
    : 0;
  const passed = quizIds.length
    ? await prisma.quizAttempt.findMany({
        where: { userId, quizId: { in: quizIds }, passed: true },
        distinct: ["quizId"],
        select: { quizId: true },
      })
    : [];

  return {
    eligible: lessonIds.length > 0 && done === lessonIds.length && passed.length === quizIds.length,
    lessonsDone: done,
    lessonsTotal: lessonIds.length,
    quizzesPassed: passed.length,
    quizzesTotal: quizIds.length,
  };
}

// No 0/O or 1/I/L: a serial is read aloud and typed in by hand.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** RCMS-L1-7KQ4-M9TX: the level, then two random blocks. Unique by retry. */
export async function newSerial(level: number): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const serial = `RCMS-L${level}-${block()}-${block()}`;
    const taken = await prisma.certificate.findUnique({ where: { serial }, select: { id: true } });
    if (!taken) return serial;
  }
  throw new Error("Could not allocate a certificate serial.");
}

/** Public verification path for a serial. */
export function verifyPath(serial: string) {
  return `/certificates/${serial}`;
}
