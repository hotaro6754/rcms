import { z } from "zod";
import type { BlockKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { parseBlock, blockText } from "@/lib/cms/blocks";
import { refusalFor } from "@/lib/cms/screen";
import { legacyCorrect, normaliseQuestion } from "@/lib/assessment/questions";
import { courseSnapshot, recordRevision, transaction, uniqueSlug } from "./core";

/**
 * Course export and import (blueprint CMS: import/export). The format is JSON, versioned,
 * and carries the editable draft: structure, content blocks and assessments with their
 * answer keys. It is staff-only content and must be handled like the course itself.
 *
 * Not carried: downloadable files and media (re-attach them after import; image blocks that
 * point at media missing from this installation are dropped and reported), learner data of
 * any kind, review decisions and release history. An import always creates a new draft
 * course that goes through the full review workflow before learners can see it.
 */

export const TRANSFER_FORMAT = "rcms-course";
export const TRANSFER_VERSION = 1;
const MAX_BYTES = 2_000_000;

export async function exportCourse(actor: Actor, courseId: string) {
  await assertCan(actor, "content.export", { entity: "Course", id: courseId });
  const c = await prisma.program.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        where: { state: { not: "ARCHIVED" } },
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            where: { state: { not: "ARCHIVED" } },
            orderBy: { sortOrder: "asc" },
            include: {
              blocks: { orderBy: { sortOrder: "asc" } },
              quizzes: { where: { archivedAt: null }, include: { questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } } },
            },
          },
        },
      },
    },
  });
  if (!c) throw new ServiceError("That course no longer exists.");
  const doc = {
    format: TRANSFER_FORMAT,
    version: TRANSFER_VERSION,
    exportedAt: new Date().toISOString(),
    course: {
      name: c.name, tier: c.tier, who: c.who, artefact: c.artefact, weeks: c.weeks, description: c.description, outcomes: c.outcomes, prerequisites: c.prerequisites,
      durationMinutes: c.durationMinutes, difficulty: c.difficulty, isFree: c.isFree, includedInSubscription: c.includedInSubscription, complianceSensitive: c.complianceSensitive, disclaimer: c.disclaimer,
    },
    modules: c.modules.map((m) => ({
      title: m.title, summary: m.summary, objectives: m.objectives, estimatedMinutes: m.estimatedMinutes,
      lessons: m.lessons.map((l) => {
        const quiz = l.quizzes[0];
        return {
          title: l.title, objectives: l.objectives, durationSec: l.durationSec, freePreview: l.freePreview, completionRule: l.completionRule,
          blocks: l.blocks.map((b) => ({ kind: b.kind, data: b.data })),
          assessment: quiz
            ? {
                title: quiz.title, kind: quiz.kind, instructions: quiz.instructions, passingScore: quiz.passingScore, timeLimitMinutes: quiz.timeLimitMinutes, maxAttempts: quiz.maxAttempts,
                retakeWaitMinutes: quiz.retakeWaitMinutes, randomizeQuestions: quiz.randomizeQuestions, randomizeOptions: quiz.randomizeOptions, showAnswers: quiz.showAnswers,
                questions: quiz.questions.map((q) => ({ type: q.type, scenario: q.scenario, prompt: q.prompt, rationale: q.rationale, points: q.points, difficulty: q.difficulty, competency: q.competency, options: q.options, targets: q.targets, answerKey: q.answerKey })),
              }
            : null,
        };
      }),
    })),
  };
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "export", entity: "Course", entityId: courseId, after: { modules: doc.modules.length } });
  return doc;
}

const str = (max: number) => z.string().trim().max(max);
const Doc = z.object({
  format: z.literal(TRANSFER_FORMAT),
  version: z.literal(TRANSFER_VERSION),
  course: z.object({
    name: str(160).min(3),
    tier: str(40).default(""), who: str(400).default(""), artefact: str(400).default(""), weeks: str(40).default(""),
    description: str(10_000).nullable().optional(), outcomes: z.array(str(400)).max(30).default([]), prerequisites: z.array(str(400)).max(30).default([]),
    durationMinutes: z.number().int().min(0).max(100_000).nullable().optional(), difficulty: str(40).nullable().optional(),
    isFree: z.boolean().default(false), includedInSubscription: z.boolean().default(true), complianceSensitive: z.boolean().default(true), disclaimer: str(4_000).nullable().optional(),
  }),
  modules: z
    .array(
      z.object({
        title: str(160).min(3), summary: str(2_000).nullable().optional(), objectives: z.array(str(400)).max(30).default([]), estimatedMinutes: z.number().int().min(0).max(10_000).nullable().optional(),
        lessons: z
          .array(
            z.object({
              title: str(160).min(3), objectives: z.array(str(400)).max(30).default([]), durationSec: z.number().int().min(0).max(360_000).nullable().optional(),
              freePreview: z.boolean().default(false), completionRule: z.enum(["MANUAL", "ASSESSMENT_PASS"]).default("MANUAL"),
              blocks: z.array(z.object({ kind: z.string(), data: z.unknown() })).max(200).default([]),
              assessment: z
                .object({
                  title: str(160).min(3), kind: z.enum(["KNOWLEDGE_CHECK", "MODULE_TEST", "FINAL", "ASSIGNMENT"]).default("KNOWLEDGE_CHECK"), instructions: str(4_000).nullable().optional(),
                  passingScore: z.number().int().min(0).max(100).default(70), timeLimitMinutes: z.number().int().min(1).max(600).nullable().optional(), maxAttempts: z.number().int().min(1).max(50).nullable().optional(),
                  retakeWaitMinutes: z.number().int().min(0).max(100_000).default(0), randomizeQuestions: z.boolean().default(false), randomizeOptions: z.boolean().default(false), showAnswers: z.boolean().default(true),
                  questions: z.array(z.unknown()).max(200).default([]),
                })
                .nullable()
                .optional(),
            }),
          )
          .max(100),
      }),
    )
    .min(1, "The file has no modules.")
    .max(50),
});

/** Imports an exported course as a new draft in the given level. Returns the course and any warnings. */
export async function importCourse(actor: Actor, levelId: string, raw: string) {
  await assertCan(actor, "content.import");
  await assertCan(actor, "content.create");
  if (raw.length > MAX_BYTES) throw new ServiceError("That file is larger than 2 MB.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ServiceError("That is not a valid course export (it is not JSON).");
  }
  const parsed = Doc.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ServiceError(`That is not a valid course export: ${issue.path.join(".") || "file"}: ${issue.message}`);
  }
  const d = parsed.data;
  const level = await prisma.learningLevel.findUnique({ where: { id: levelId }, select: { id: true, status: true, sequence: true } });
  if (!level || level.status === "ARCHIVED") throw new ServiceError("Choose an active learning level.");
  if (d.modules.reduce((n, m) => n + m.lessons.length, 0) > 400) throw new ServiceError("Import at most 400 lessons at a time.");

  // Validate everything before writing anything, and screen all text for patient or card data.
  const warnings: string[] = [];
  const texts: string[] = [d.course.name, d.course.description ?? "", ...d.course.outcomes];
  const mediaIds = new Set((await prisma.mediaAsset.findMany({ where: { archivedAt: null }, select: { id: true } })).map((m) => m.id));
  const modules = d.modules.map((m, mi) => {
    texts.push(m.title, m.summary ?? "", ...m.objectives);
    return {
      ...m,
      lessons: m.lessons.map((l, li) => {
        texts.push(l.title, ...l.objectives);
        const blocks: { kind: BlockKind; data: object }[] = [];
        l.blocks.forEach((b, bi) => {
          const r = parseBlock(b.kind as BlockKind, b.data);
          if (!r.success) throw new ServiceError(`Module ${mi + 1}, lesson ${li + 1}, block ${bi + 1}: ${r.error.issues[0]?.message ?? "invalid block"}.`);
          const data = r.data as { mediaId?: string };
          if (b.kind === "IMAGE" && data.mediaId && !mediaIds.has(data.mediaId)) {
            warnings.push(`“${l.title}”: an image block was dropped because its media is not in this library.`);
            return;
          }
          texts.push(blockText(b.kind as BlockKind, data));
          blocks.push({ kind: b.kind as BlockKind, data: data as object });
        });
        const questions = (l.assessment?.questions ?? []).map((q, qi) => {
          const n = normaliseQuestion({ ...(q as object), remediationLessonId: null });
          if (!n.ok) throw new ServiceError(`Module ${mi + 1}, lesson ${li + 1}, question ${qi + 1}: ${n.error}`);
          texts.push(n.value.prompt, n.value.scenario ?? "", n.value.rationale ?? "", ...n.value.options);
          return n.value;
        });
        if (l.completionRule === "ASSESSMENT_PASS" && !questions.length) throw new ServiceError(`“${l.title}” completes on an assessment pass but has no questions.`);
        return { ...l, blocks, questions };
      }),
    };
  });
  const refusal = refusalFor(texts.filter(Boolean).join("\n"));
  if (refusal) throw new ServiceError(refusal);

  const course = await transaction(async (tx) => {
    const last = await tx.program.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const created = await tx.program.create({
      data: {
        ...d.course,
        name: d.course.name,
        slug: await uniqueSlug(tx, d.course.name, "program"),
        level: Math.min(5, Math.max(1, level.sequence)),
        levelId,
        status: "DRAFT",
        state: "DRAFT",
        sortOrder: (last?.sortOrder ?? -1) + 1,
        ownerId: actor.id,
      },
    });
    for (const [mi, m] of modules.entries()) {
      const mod = await tx.module.create({ data: { programId: created.id, title: m.title, summary: m.summary ?? null, objectives: m.objectives, estimatedMinutes: m.estimatedMinutes ?? null, sortOrder: mi, state: "DRAFT" } });
      for (const [li, l] of m.lessons.entries()) {
        const lesson = await tx.lesson.create({ data: { moduleId: mod.id, title: l.title, objectives: l.objectives, durationSec: l.durationSec ?? null, freePreview: l.freePreview, completionRule: l.completionRule, sortOrder: li, state: "DRAFT" } });
        for (const [bi, b] of l.blocks.entries()) await tx.contentBlock.create({ data: { lessonId: lesson.id, kind: b.kind, data: b.data, sortOrder: bi } });
        if (l.assessment) {
          const { questions: _q, ...settings } = l.assessment;
          const quiz = await tx.quiz.create({ data: { lessonId: lesson.id, ...settings, instructions: settings.instructions ?? null, timeLimitMinutes: settings.timeLimitMinutes ?? null, maxAttempts: settings.maxAttempts ?? null } });
          for (const [qi, q] of l.questions.entries()) {
            await tx.quizQuestion.create({ data: { quizId: quiz.id, ...q, answerKey: q.answerKey as never, correct: legacyCorrect(q.type, q.answerKey), sortOrder: qi } });
          }
        }
      }
    }
    await recordRevision(tx, { entityType: "Course", entityId: created.id, courseId: created.id, editorId: actor.id, reason: "Imported from a course export", before: null, after: await courseSnapshot(tx, created.id) });
    return created;
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "Course", entityId: course.id, after: { imported: true, modules: modules.length, warnings: warnings.length } });
  return { course, warnings };
}
