import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit, type AuditAction } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { legacyCorrect, normaliseQuestion } from "@/lib/assessment/questions";
import { refusalFor } from "@/lib/cms/screen";
import { courseOfLesson, courseOfQuiz, lockedCheck, markEdited, nextSortOrder, quizSnapshot, recordRevision, transaction, type Tx } from "./core";
import { assertSameSet, stepMove } from "./structure";

/**
 * The assessment builder: assessments on lessons, their questions, and shared question
 * banks. Learners never see these rows directly. A release copies the assessment into the
 * course snapshot, and each attempt copies what it was given into the attempt, so editing a
 * question here never changes a result someone already has.
 */

function log(actor: Actor, action: AuditAction, entity: string, id: string | null, after?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity, entityId: id, after });
}

const nullableInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v) : v),
    z.number().int().min(min).max(max).nullable(),
  );

export const AssessmentSettings = z.object({
  title: z.string().trim().min(3, "Give the assessment a title.").max(160),
  kind: z.enum(["KNOWLEDGE_CHECK", "MODULE_TEST", "FINAL", "ASSIGNMENT"]).default("KNOWLEDGE_CHECK"),
  instructions: z.string().trim().max(4_000).optional().nullable(),
  passingScore: z.coerce.number().int().min(0, "The pass mark is a percentage.").max(100, "The pass mark is a percentage."),
  timeLimitMinutes: nullableInt(1, 600),
  maxAttempts: nullableInt(1, 50),
  retakeWaitMinutes: z.coerce.number().int().min(0).max(60 * 24 * 90).default(0),
  randomizeQuestions: z.coerce.boolean().default(false),
  randomizeOptions: z.coerce.boolean().default(false),
  bankId: z.string().trim().optional().nullable().transform((v) => v || null),
  drawCount: z.coerce.number().int().min(0).max(200).default(0),
  showAnswers: z.coerce.boolean().default(true),
});

async function quizRevision(tx: Tx, actor: Actor, quizId: string, courseId: string, reason: string, before: Record<string, unknown> | null) {
  await markEdited(tx, courseId);
  await recordRevision(tx, { entityType: "Quiz", entityId: quizId, courseId, editorId: actor.id, reason, before, after: await quizSnapshot(tx, quizId) });
}

async function checkBank(tx: Tx, bankId: string | null, drawCount: number) {
  if (!bankId) {
    if (drawCount > 0) throw new ServiceError("Choose a question bank to draw from.");
    return;
  }
  const bank = await tx.questionBank.findUnique({ where: { id: bankId }, include: { _count: { select: { questions: { where: { archivedAt: null } } } } } });
  if (!bank || bank.archivedAt) throw new ServiceError("That question bank is not available.");
  if (drawCount > bank._count.questions) throw new ServiceError(`The bank has ${bank._count.questions} questions; you asked to draw ${drawCount}.`);
}

export async function createAssessment(actor: Actor, lessonId: string, input: unknown) {
  await assertCan(actor, "assessment.manage");
  const data = AssessmentSettings.parse(input);
  const quiz = await transaction(async (tx) => {
    const courseId = await courseOfLesson(tx, lessonId);
    await lockedCheck(tx, courseId);
    const existing = await tx.quiz.findFirst({ where: { lessonId, archivedAt: null } });
    if (existing) throw new ServiceError("This lesson already has an assessment. Edit it, or archive it first.");
    await checkBank(tx, data.bankId, data.drawCount);
    const created = await tx.quiz.create({ data: { ...data, lessonId } });
    await quizRevision(tx, actor, created.id, courseId, "Created", null);
    return created;
  });
  await log(actor, "create", "Quiz", quiz.id, { lessonId, title: quiz.title });
  return quiz;
}

export async function updateAssessment(actor: Actor, quizId: string, input: unknown, reason?: string) {
  await assertCan(actor, "assessment.manage");
  const data = AssessmentSettings.parse(input);
  await transaction(async (tx) => {
    const courseId = await courseOfQuiz(tx, quizId);
    await lockedCheck(tx, courseId);
    await checkBank(tx, data.bankId, data.drawCount);
    const before = await quizSnapshot(tx, quizId);
    await tx.quiz.update({ where: { id: quizId }, data });
    await quizRevision(tx, actor, quizId, courseId, reason ?? "Settings changed", before);
  });
  await log(actor, "update", "Quiz", quizId, { title: data.title, passingScore: data.passingScore });
}

export async function setAssessmentArchived(actor: Actor, quizId: string, archived: boolean) {
  await assertCan(actor, "content.archive");
  await transaction(async (tx) => {
    const quiz = await tx.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new ServiceError("That assessment no longer exists.");
    const courseId = await courseOfLesson(tx, quiz.lessonId);
    await lockedCheck(tx, courseId);
    if (!archived) {
      const other = await tx.quiz.findFirst({ where: { lessonId: quiz.lessonId, archivedAt: null, id: { not: quizId } } });
      if (other) throw new ServiceError("This lesson already has an active assessment. Archive that one first.");
    } else {
      const lesson = await tx.lesson.findUniqueOrThrow({ where: { id: quiz.lessonId }, select: { completionRule: true } });
      if (lesson.completionRule === "ASSESSMENT_PASS") {
        await tx.lesson.update({ where: { id: quiz.lessonId }, data: { completionRule: "MANUAL" } });
      }
    }
    const before = await quizSnapshot(tx, quizId);
    await tx.quiz.update({ where: { id: quizId }, data: { archivedAt: archived ? new Date() : null } });
    await quizRevision(tx, actor, quizId, courseId, archived ? "Archived" : "Restored", before);
  });
  await log(actor, archived ? "archive" : "restore", "Quiz", quizId);
}

// ---------------------------------------------------------------------------
// Questions (on an assessment or in a bank)
// ---------------------------------------------------------------------------

type Owner = { quizId: string } | { bankId: string };

async function validateQuestion(tx: Tx, input: unknown, courseId: string | null) {
  const res = normaliseQuestion(input);
  if (!res.ok) throw new ServiceError(res.error);
  const v = res.value;
  const refusal = refusalFor([v.scenario, v.prompt, v.rationale, ...v.options, ...v.targets].filter(Boolean).join("\n"));
  if (refusal) throw new ServiceError(refusal);
  if (v.remediationLessonId && courseId) {
    const l = await tx.lesson.findUnique({ where: { id: v.remediationLessonId }, select: { module: { select: { programId: true } } } });
    if (!l || l.module.programId !== courseId) throw new ServiceError("The remediation lesson must be in the same course.");
  }
  return v;
}

export async function addQuestion(actor: Actor, owner: Owner, input: unknown) {
  await assertCan(actor, "assessment.manage");
  const q = await transaction(async (tx) => {
    const courseId = "quizId" in owner ? await courseOfQuiz(tx, owner.quizId) : null;
    if (courseId) await lockedCheck(tx, courseId);
    if ("bankId" in owner) {
      const bank = await tx.questionBank.findUnique({ where: { id: owner.bankId } });
      if (!bank || bank.archivedAt) throw new ServiceError("That question bank is not available.");
    }
    const before = "quizId" in owner ? await quizSnapshot(tx, owner.quizId) : null;
    const v = await validateQuestion(tx, input, courseId);
    const created = await tx.quizQuestion.create({
      data: {
        ...owner,
        ...v,
        answerKey: v.answerKey as never,
        correct: legacyCorrect(v.type, v.answerKey),
        sortOrder: await nextSortOrder(tx, "quizQuestion", owner),
      },
    });
    if ("quizId" in owner && courseId) await quizRevision(tx, actor, owner.quizId, courseId, "Question added", before);
    return created;
  });
  await log(actor, "create", "QuizQuestion", q.id, { ...owner, type: q.type });
  return q;
}

export async function updateQuestion(actor: Actor, questionId: string, input: unknown) {
  await assertCan(actor, "assessment.manage");
  await transaction(async (tx) => {
    const existing = await tx.quizQuestion.findUnique({ where: { id: questionId } });
    if (!existing || existing.archivedAt) throw new ServiceError("That question no longer exists.");
    const courseId = existing.quizId ? await courseOfQuiz(tx, existing.quizId) : null;
    if (courseId) await lockedCheck(tx, courseId);
    const before = existing.quizId ? await quizSnapshot(tx, existing.quizId) : null;
    const v = await validateQuestion(tx, input, courseId);
    await tx.quizQuestion.update({ where: { id: questionId }, data: { ...v, answerKey: v.answerKey as never, correct: legacyCorrect(v.type, v.answerKey) } });
    if (existing.quizId && courseId) await quizRevision(tx, actor, existing.quizId, courseId, "Question edited", before);
  });
  await log(actor, "update", "QuizQuestion", questionId);
}

/**
 * Removes a question from future attempts. If anyone has attempted the assessment the row is
 * archived rather than deleted; their attempts carry their own copy either way.
 */
export async function removeQuestion(actor: Actor, questionId: string) {
  await assertCan(actor, "assessment.manage");
  const archived = await transaction(async (tx) => {
    const q = await tx.quizQuestion.findUnique({ where: { id: questionId } });
    if (!q || q.archivedAt) throw new ServiceError("That question no longer exists.");
    const courseId = q.quizId ? await courseOfQuiz(tx, q.quizId) : null;
    if (courseId) await lockedCheck(tx, courseId);
    const before = q.quizId ? await quizSnapshot(tx, q.quizId) : null;
    const attempts = q.quizId ? await tx.quizAttempt.count({ where: { quizId: q.quizId } }) : await tx.quizAttempt.count({ where: { snapshot: { path: ["questionIds"], array_contains: [questionId] } } });
    if (attempts > 0) await tx.quizQuestion.update({ where: { id: questionId }, data: { archivedAt: new Date() } });
    else await tx.quizQuestion.delete({ where: { id: questionId } });
    if (q.quizId && courseId) await quizRevision(tx, actor, q.quizId, courseId, "Question removed", before);
    return attempts > 0;
  });
  await log(actor, archived ? "archive" : "delete", "QuizQuestion", questionId);
}

export async function duplicateQuestion(actor: Actor, questionId: string, target?: Owner) {
  await assertCan(actor, "assessment.manage");
  const copy = await transaction(async (tx) => {
    const q = await tx.quizQuestion.findUnique({ where: { id: questionId } });
    if (!q) throw new ServiceError("That question no longer exists.");
    const owner: Owner = target ?? (q.quizId ? { quizId: q.quizId } : { bankId: q.bankId! });
    const courseId = "quizId" in owner ? await courseOfQuiz(tx, owner.quizId) : null;
    if (courseId) await lockedCheck(tx, courseId);
    const before = "quizId" in owner ? await quizSnapshot(tx, owner.quizId) : null;
    const { id: _id, createdAt: _c, updatedAt: _u, quizId: _q, bankId: _b, archivedAt: _a, sortOrder: _s, answerKey, ...rest } = q;
    const created = await tx.quizQuestion.create({
      data: {
        ...rest,
        ...owner,
        answerKey: (answerKey ?? undefined) as never,
        remediationLessonId: "bankId" in owner ? null : rest.remediationLessonId,
        sortOrder: await nextSortOrder(tx, "quizQuestion", owner),
      },
    });
    if ("quizId" in owner && courseId) await quizRevision(tx, actor, owner.quizId, courseId, "Question duplicated", before);
    return created;
  });
  await log(actor, "duplicate", "QuizQuestion", copy.id, { from: questionId });
  return copy;
}

export async function reorderQuestions(actor: Actor, owner: Owner, orderedIds: string[]) {
  await assertCan(actor, "assessment.manage");
  await transaction(async (tx) => {
    const courseId = "quizId" in owner ? await courseOfQuiz(tx, owner.quizId) : null;
    if (courseId) await lockedCheck(tx, courseId);
    const before = "quizId" in owner ? await quizSnapshot(tx, owner.quizId) : null;
    const current = await tx.quizQuestion.findMany({ where: { ...owner, archivedAt: null }, select: { id: true } });
    assertSameSet(current.map((q) => q.id), orderedIds);
    for (const [i, id] of orderedIds.entries()) await tx.quizQuestion.update({ where: { id }, data: { sortOrder: i } });
    if ("quizId" in owner && courseId) await quizRevision(tx, actor, owner.quizId, courseId, "Questions reordered", before);
  });
  await log(actor, "move", "QuizQuestion", null, { ...owner, order: orderedIds });
}

export async function moveQuestionStep(actor: Actor, questionId: string, direction: "up" | "down") {
  const q = await prisma.quizQuestion.findUnique({ where: { id: questionId }, select: { quizId: true, bankId: true } });
  if (!q) throw new ServiceError("That question no longer exists.");
  const owner: Owner = q.quizId ? { quizId: q.quizId } : { bankId: q.bankId! };
  const ids = (await prisma.quizQuestion.findMany({ where: { ...owner, archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true } })).map((x) => x.id);
  await reorderQuestions(actor, owner, stepMove(ids, questionId, direction));
}

// ---------------------------------------------------------------------------
// Question banks
// ---------------------------------------------------------------------------

const BankInput = z.object({
  title: z.string().trim().min(3, "Give the bank a title.").max(160),
  competency: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(2_000).optional().nullable(),
});

export async function createBank(actor: Actor, input: unknown) {
  await assertCan(actor, "assessment.manage");
  const bank = await prisma.questionBank.create({ data: BankInput.parse(input) });
  await log(actor, "create", "QuestionBank", bank.id, { title: bank.title });
  return bank;
}

export async function updateBank(actor: Actor, bankId: string, input: unknown) {
  await assertCan(actor, "assessment.manage");
  await prisma.questionBank.update({ where: { id: bankId }, data: BankInput.parse(input) });
  await log(actor, "update", "QuestionBank", bankId);
}

export async function setBankArchived(actor: Actor, bankId: string, archived: boolean) {
  await assertCan(actor, "content.archive");
  if (archived) {
    const using = await prisma.quiz.count({ where: { bankId, archivedAt: null } });
    if (using) throw new ServiceError(`${using} assessment${using === 1 ? " draws" : "s draw"} from this bank. Change them first.`);
  }
  await prisma.questionBank.update({ where: { id: bankId }, data: { archivedAt: archived ? new Date() : null } });
  await log(actor, archived ? "archive" : "restore", "QuestionBank", bankId);
}
