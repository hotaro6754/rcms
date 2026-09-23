"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/rbac";

/**
 * Quiz attempts.
 *
 * Grading happens on the server against the stored answer key. The correct index is never
 * sent to the browser before submission — a quiz whose answers sit in the page source is
 * not an assessment.
 *
 * Attempts are kept rather than overwritten. A second attempt is a new row, so improvement
 * is visible and nothing that happened is erased.
 */
export async function submitQuizAttempt(quizId: string, answers: Record<string, number>) {
  const user = await requireUser();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      lesson: { include: { module: { select: { programId: true } } } },
    },
  });
  if (!quiz) return { ok: false as const, error: "That quiz no longer exists." };

  const enrolment = await prisma.enrolment.findUnique({
    where: { userId_programId: { userId: user.id, programId: quiz.lesson.module.programId } },
  });
  if (!enrolment || enrolment.state !== "ACTIVE") {
    return { ok: false as const, error: "You are not enrolled on this program." };
  }

  if (quiz.questions.length === 0) {
    return { ok: false as const, error: "This quiz has no questions yet." };
  }

  let correct = 0;
  const review = quiz.questions.map((q) => {
    const given = answers[q.id];
    const right = given === q.correct;
    if (right) correct += 1;
    return {
      questionId: q.id,
      prompt: q.prompt,
      given: given ?? null,
      correct: q.correct,
      right,
      rationale: q.rationale,
      options: q.options,
    };
  });

  const score = Math.round((correct / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: { quizId, userId: user.id, score, passed, answers: answers as never },
  });

  await audit({
    actorId: user.id,
    action: "grade",
    entity: "QuizAttempt",
    entityId: attempt.id,
    after: { quizId, score, passed },
  });

  revalidatePath("/academy");
  return { ok: true as const, data: { score, passed, passingScore: quiz.passingScore, review } };
}
