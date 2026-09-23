"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireTrainer } from "@/lib/rbac";
import type { PublishState } from "@prisma/client";

/**
 * Trainer Studio: authoring without a developer.
 *
 * Ordering is an integer `sortOrder` moved one place at a time rather than a drag-and-drop
 * library. It is keyboard-operable, works with a screen reader, needs no dependency, and a
 * swap of two rows is a single transaction that cannot leave the list in a half-ordered
 * state. Drag can be layered on top of the same actions later.
 *
 * Every write is trainer-gated and audited. A trainer can author; only an admin can price
 * or enrol, which is why nothing here touches Product or Enrolment.
 */

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const fail = (error: string): Result<never> => ({ ok: false, error });

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

const ModuleInput = z.object({
  title: z.string().trim().min(3, "Give the module a title.").max(160),
  summary: z.string().trim().max(600).optional(),
});

export async function createModule(programId: string, formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = ModuleInput.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const last = await prisma.module.findFirst({
    where: { programId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.module.create({
    data: {
      programId,
      title: parsed.data.title,
      summary: parsed.data.summary,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  await audit({
    actorId: trainer.id,
    action: "create",
    entity: "Module",
    entityId: created.id,
    after: { title: created.title, programId },
  });

  revalidatePath(`/studio/${programId}`);
  return { ok: true as const };
}

export async function renameModule(moduleId: string, formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = ModuleInput.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const before = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!before) return fail("That module no longer exists.");

  const after = await prisma.module.update({
    where: { id: moduleId },
    data: { title: parsed.data.title, summary: parsed.data.summary },
  });

  await audit({
    actorId: trainer.id,
    action: "update",
    entity: "Module",
    entityId: moduleId,
    before: { title: before.title },
    after: { title: after.title },
  });

  revalidatePath(`/studio/${before.programId}`);
  return { ok: true as const };
}

/**
 * Deletion refuses when a student has already been assessed inside the module. Losing a
 * quiz attempt would destroy evidence of something that happened, and no authoring
 * convenience justifies that.
 */
export async function deleteModule(moduleId: string) {
  const trainer = await requireTrainer();

  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { lessons: { select: { id: true } } },
  });
  if (!mod) return fail("That module no longer exists.");

  const lessonIds = mod.lessons.map((l) => l.id);
  if (lessonIds.length) {
    const attempts = await prisma.quizAttempt.count({
      where: { quiz: { lessonId: { in: lessonIds } } },
    });
    const progress = await prisma.progress.count({ where: { lessonId: { in: lessonIds } } });
    if (attempts > 0 || progress > 0) {
      return fail(
        "Students have already worked through this module. Archive its lessons instead of deleting them.",
      );
    }
  }

  await prisma.module.delete({ where: { id: moduleId } });

  await audit({
    actorId: trainer.id,
    action: "delete",
    entity: "Module",
    entityId: moduleId,
    before: { title: mod.title, lessons: lessonIds.length },
  });

  revalidatePath(`/studio/${mod.programId}`);
  return { ok: true as const };
}

/** Swaps a row with its neighbour in one transaction, so the list is never half-ordered. */
export async function moveModule(moduleId: string, direction: "up" | "down") {
  const trainer = await requireTrainer();

  const current = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!current) return fail("That module no longer exists.");

  const neighbour = await prisma.module.findFirst({
    where: {
      programId: current.programId,
      sortOrder: direction === "up" ? { lt: current.sortOrder } : { gt: current.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return { ok: true as const };

  await prisma.$transaction([
    prisma.module.update({ where: { id: current.id }, data: { sortOrder: neighbour.sortOrder } }),
    prisma.module.update({ where: { id: neighbour.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  await audit({
    actorId: trainer.id,
    action: "update",
    entity: "Module",
    entityId: moduleId,
    after: { sortOrder: neighbour.sortOrder },
  });

  revalidatePath(`/studio/${current.programId}`);
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

const LessonInput = z.object({
  title: z.string().trim().min(3, "Give the lesson a title.").max(200),
  body: z.string().trim().max(40_000).optional(),
  minutes: z.coerce.number().int().min(0).max(600).optional(),
});

export async function createLesson(moduleId: string, formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = LessonInput.safeParse({ title: formData.get("title") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const mod = await prisma.module.findUnique({ where: { id: moduleId } });
  if (!mod) return fail("That module no longer exists.");

  const last = await prisma.lesson.findFirst({
    where: { moduleId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await prisma.lesson.create({
    data: { moduleId, title: parsed.data.title, sortOrder: (last?.sortOrder ?? -1) + 1 },
  });

  await audit({
    actorId: trainer.id,
    action: "create",
    entity: "Lesson",
    entityId: created.id,
    after: { title: created.title, moduleId },
  });

  revalidatePath(`/studio/${mod.programId}`);
  return { ok: true as const, data: { id: created.id } };
}

export async function updateLesson(lessonId: string, formData: FormData) {
  const trainer = await requireTrainer();
  const parsed = LessonInput.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    minutes: formData.get("minutes") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const before = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { programId: true } } },
  });
  if (!before) return fail("That lesson no longer exists.");

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      durationSec: parsed.data.minutes ? parsed.data.minutes * 60 : null,
    },
  });

  await audit({
    actorId: trainer.id,
    action: "update",
    entity: "Lesson",
    entityId: lessonId,
    before: { title: before.title, durationSec: before.durationSec },
    after: { title: parsed.data.title, minutes: parsed.data.minutes },
  });

  revalidatePath(`/studio/lesson/${lessonId}`);
  revalidatePath(`/studio/${before.module.programId}`);
  revalidatePath("/academy");
  return { ok: true as const };
}

/**
 * Publishing is the moment a student can see something, so it refuses to publish an empty
 * lesson. A published lesson with no body is worse than an unpublished one.
 */
export async function setLessonState(lessonId: string, state: PublishState) {
  const trainer = await requireTrainer();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { programId: true } } },
  });
  if (!lesson) return fail("That lesson no longer exists.");

  if (state === "PUBLISHED" && !lesson.body?.trim()) {
    return fail("Write the lesson before publishing it. Students would see an empty page.");
  }

  await prisma.lesson.update({ where: { id: lessonId }, data: { state } });

  await audit({
    actorId: trainer.id,
    action: "publish",
    entity: "Lesson",
    entityId: lessonId,
    before: { state: lesson.state },
    after: { state },
  });

  revalidatePath(`/studio/${lesson.module.programId}`);
  revalidatePath("/academy");
  return { ok: true as const };
}

export async function moveLesson(lessonId: string, direction: "up" | "down") {
  const trainer = await requireTrainer();

  const current = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { programId: true } } },
  });
  if (!current) return fail("That lesson no longer exists.");

  const neighbour = await prisma.lesson.findFirst({
    where: {
      moduleId: current.moduleId,
      sortOrder: direction === "up" ? { lt: current.sortOrder } : { gt: current.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return { ok: true as const };

  await prisma.$transaction([
    prisma.lesson.update({ where: { id: current.id }, data: { sortOrder: neighbour.sortOrder } }),
    prisma.lesson.update({ where: { id: neighbour.id }, data: { sortOrder: current.sortOrder } }),
  ]);

  await audit({
    actorId: trainer.id,
    action: "update",
    entity: "Lesson",
    entityId: lessonId,
    before: { sortOrder: current.sortOrder },
    after: { sortOrder: neighbour.sortOrder },
  });

  revalidatePath(`/studio/${current.module.programId}`);
  return { ok: true as const };
}

export async function deleteLesson(lessonId: string) {
  const trainer = await requireTrainer();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { programId: true } } },
  });
  if (!lesson) return fail("That lesson no longer exists.");

  const touched = await prisma.progress.count({ where: { lessonId } });
  if (touched > 0) {
    return fail("Students have already worked this lesson. Archive it instead of deleting it.");
  }

  await prisma.lesson.delete({ where: { id: lessonId } });

  await audit({
    actorId: trainer.id,
    action: "delete",
    entity: "Lesson",
    entityId: lessonId,
    before: { title: lesson.title },
  });

  revalidatePath(`/studio/${lesson.module.programId}`);
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export async function createQuiz(lessonId: string, formData: FormData) {
  const trainer = await requireTrainer();

  const title = String(formData.get("title") ?? "").trim() || "Check yourself";
  const passingScore = Number(formData.get("passingScore") ?? 70);

  if (!Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100) {
    return fail("The pass mark has to be a percentage between 0 and 100.");
  }

  const existing = await prisma.quiz.findFirst({ where: { lessonId } });
  if (existing) return fail("This lesson already has a quiz.");

  const quiz = await prisma.quiz.create({
    data: { lessonId, title, passingScore },
  });

  await audit({
    actorId: trainer.id,
    action: "create",
    entity: "Quiz",
    entityId: quiz.id,
    after: { lessonId, title },
  });

  revalidatePath(`/studio/lesson/${lessonId}`);
  return { ok: true as const };
}

const QuestionInput = z.object({
  prompt: z.string().trim().min(8, "Write the question.").max(1000),
  options: z.array(z.string().trim().min(1)).min(2, "A question needs at least two options.").max(6),
  correct: z.coerce.number().int().min(0),
  rationale: z.string().trim().max(1000).optional(),
});

export async function addQuestion(quizId: string, formData: FormData) {
  const trainer = await requireTrainer();

  const options = formData
    .getAll("option")
    .map((o) => String(o).trim())
    .filter(Boolean);

  const parsed = QuestionInput.safeParse({
    prompt: formData.get("prompt"),
    options,
    correct: formData.get("correct"),
    rationale: formData.get("rationale") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (parsed.data.correct >= parsed.data.options.length) {
    return fail("Mark which option is correct.");
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return fail("That quiz no longer exists.");

  const last = await prisma.quizQuestion.findFirst({
    where: { quizId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const q = await prisma.quizQuestion.create({
    data: {
      quizId,
      prompt: parsed.data.prompt,
      options: parsed.data.options,
      correct: parsed.data.correct,
      rationale: parsed.data.rationale,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  await audit({
    actorId: trainer.id,
    action: "create",
    entity: "QuizQuestion",
    entityId: q.id,
    after: { quizId, prompt: q.prompt },
  });

  revalidatePath(`/studio/lesson/${quiz.lessonId}`);
  return { ok: true as const };
}

export async function deleteQuestion(questionId: string) {
  const trainer = await requireTrainer();

  const q = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: { select: { lessonId: true } } },
  });
  if (!q) return fail("That question no longer exists.");

  await prisma.quizQuestion.delete({ where: { id: questionId } });

  await audit({
    actorId: trainer.id,
    action: "delete",
    entity: "QuizQuestion",
    entityId: questionId,
    before: { prompt: q.prompt },
  });

  revalidatePath(`/studio/lesson/${q.quiz.lessonId}`);
  return { ok: true as const };
}
