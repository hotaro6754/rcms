import { z } from "zod";
import type { LessonCompletion, PublishState } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit, type AuditAction } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { refusalFor } from "@/lib/cms/screen";
import {
  courseOfLesson,
  courseOfModule,
  courseSnapshot,
  lessonHistory,
  lessonSnapshot,
  lockedCheck,
  markEdited,
  moduleSnapshot,
  nextSortOrder,
  recordRevision,
  transaction,
  uniqueSlug,
  type Tx,
} from "./core";
import { strings } from "@/lib/json-list";

/**
 * The curriculum tree: levels, courses, modules and lessons. Create, edit, reorder, move,
 * duplicate, archive, restore and delete, each checked against the actor's permissions and
 * the course's review lock, each written in one transaction, each audited and versioned.
 *
 * Safe-delete rule (blueprint §4.4): an item that a learner has started, been assessed in or
 * been certified on is never deleted. It is archived, which keeps it, hides it from the next
 * release, and can be undone.
 */

function log(actor: Actor, action: AuditAction, entity: string, entityId: string | null, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity, entityId, after, before });
}

const lines = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((v) =>
    (Array.isArray(v) ? v : (v ?? "").split("\n"))
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30),
  );

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "That date does not look right." });
      return z.NEVER;
    }
    return d;
  });

function screen(...texts: (string | null | undefined)[]) {
  const refusal = refusalFor(texts.filter(Boolean).join("\n"));
  if (refusal) throw new ServiceError(refusal);
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const LevelInput = z.object({
  name: z.string().trim().min(2, "Give the level a name.").max(80),
  displayTitle: z.string().trim().min(2, "Give the level a display title.").max(120),
  shortDescription: z.string().trim().min(10, "Describe the level in a sentence.").max(400),
  description: z.string().trim().max(4_000).optional().nullable(),
  audience: z.string().trim().max(400).optional().nullable(),
  prerequisites: lines,
  outcomes: lines,
  coreTopics: lines,
  estimatedEffort: z.string().trim().max(120).optional().nullable(),
  assessmentRequirement: z.string().trim().max(400).optional().nullable(),
  passingCriteria: z.string().trim().max(400).optional().nullable(),
  completionRequirement: z.string().trim().max(400).optional().nullable(),
  badgeName: z.string().trim().max(120).optional().nullable(),
  accent: z.enum(["teal", "blue", "navy"]).default("teal"),
  disclaimer: z.string().trim().max(2_000).optional().nullable(),
  effectiveDate: optionalDate,
  reviewDate: optionalDate,
});

function levelSnap(l: { [k: string]: unknown }) {
  const keys = Object.keys(LevelInput.shape);
  return Object.fromEntries(keys.map((k) => [k, l[k] instanceof Date ? (l[k] as Date).toISOString() : (l[k] ?? null)]));
}

export async function createLevel(actor: Actor, input: unknown) {
  await assertCan(actor, "content.structure");
  const data = LevelInput.parse(input);
  screen(data.description, data.shortDescription);
  const level = await transaction(async (tx) => {
    const last = await tx.learningLevel.findFirst({ orderBy: { sequence: "desc" }, select: { sequence: true } });
    const created = await tx.learningLevel.create({
      data: { ...data, slug: await uniqueSlug(tx, data.name, "learningLevel"), sequence: (last?.sequence ?? 0) + 1, ownerId: actor.id },
    });
    await recordRevision(tx, { entityType: "Level", entityId: created.id, courseId: null, editorId: actor.id, reason: "Created", before: null, after: levelSnap(created) });
    return created;
  });
  await log(actor, "create", "LearningLevel", level.id, { name: level.name });
  return level;
}

export async function updateLevel(actor: Actor, levelId: string, input: unknown, reason?: string) {
  await assertCan(actor, "content.structure");
  const data = LevelInput.parse(input);
  screen(data.description, data.shortDescription);
  const level = await transaction(async (tx) => {
    const before = await tx.learningLevel.findUnique({ where: { id: levelId } });
    if (!before) throw new ServiceError("That level no longer exists.");
    if (before.status === "ARCHIVED") throw new ServiceError("Restore this level before editing it.");
    const updated = await tx.learningLevel.update({ where: { id: levelId }, data });
    await recordRevision(tx, { entityType: "Level", entityId: levelId, courseId: null, editorId: actor.id, reason, before: levelSnap(before), after: levelSnap(updated) });
    return updated;
  });
  await log(actor, "update", "LearningLevel", levelId, { name: level.name });
  return level;
}

export async function reorderLevels(actor: Actor, orderedIds: string[]) {
  await assertCan(actor, "content.structure");
  await transaction(async (tx) => {
    const all = await tx.learningLevel.findMany({ select: { id: true } });
    assertSameSet(all.map((l) => l.id), orderedIds);
    for (const [i, id] of orderedIds.entries()) await tx.learningLevel.update({ where: { id }, data: { sequence: i + 1 } });
  });
  await log(actor, "move", "LearningLevel", null, { order: orderedIds });
}

/**
 * Levels carry metadata only; the courses inside go through review on their own. Making a
 * level visible therefore needs publish authority but no separate review.
 */
export async function setLevelStatus(actor: Actor, levelId: string, status: "PUBLISHED" | "DRAFT" | "ARCHIVED") {
  await assertCan(actor, status === "ARCHIVED" ? "content.archive" : "content.publish");
  const before = await prisma.learningLevel.findUnique({ where: { id: levelId }, include: { _count: { select: { courses: { where: { archivedAt: null } } } } } });
  if (!before) throw new ServiceError("That level no longer exists.");
  if (status === "ARCHIVED" && before._count.courses > 0) {
    throw new ServiceError("Move or archive this level's courses first. A level with live courses cannot be archived.");
  }
  await prisma.learningLevel.update({
    where: { id: levelId },
    data: { status, archivedAt: status === "ARCHIVED" ? new Date() : null },
  });
  await log(actor, status === "ARCHIVED" ? "archive" : status === "PUBLISHED" ? "publish" : before.status === "ARCHIVED" ? "restore" : "unpublish", "LearningLevel", levelId, { status }, { status: before.status });
}

export async function duplicateLevel(actor: Actor, levelId: string) {
  await assertCan(actor, "content.structure");
  const src = await prisma.learningLevel.findUnique({ where: { id: levelId } });
  if (!src) throw new ServiceError("That level no longer exists.");
  const copy = await transaction(async (tx) => {
    const last = await tx.learningLevel.findFirst({ orderBy: { sequence: "desc" }, select: { sequence: true } });
    // Courses are not copied: a course belongs to one level. Duplicate courses separately.
    const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, archivedAt: _a, status: _s, sequence: _q, ...rest } = src;
    return tx.learningLevel.create({
      data: { ...rest, prerequisites: strings(rest.prerequisites), outcomes: strings(rest.outcomes), coreTopics: strings(rest.coreTopics), name: `${src.name} (copy)`, slug: await uniqueSlug(tx, `${src.name}-copy`, "learningLevel"), status: "DRAFT", sequence: (last?.sequence ?? 0) + 1 },
    });
  });
  await log(actor, "duplicate", "LearningLevel", copy.id, { from: levelId });
  return copy;
}

export async function deleteLevel(actor: Actor, levelId: string) {
  await assertCan(actor, "content.delete");
  const level = await prisma.learningLevel.findUnique({ where: { id: levelId }, include: { _count: { select: { courses: true, badges: true } } } });
  if (!level) throw new ServiceError("That level no longer exists.");
  if (level.status === "PUBLISHED") throw new ServiceError("Unpublish or archive a published level; it cannot be deleted.");
  if (level._count.courses > 0 || level._count.badges > 0) throw new ServiceError("This level has courses or issued badges. Archive it instead.");
  await prisma.learningLevel.delete({ where: { id: levelId } });
  await log(actor, "delete", "LearningLevel", levelId, undefined, { name: level.name });
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const CourseInput = z.object({
  name: z.string().trim().min(3, "Give the course a title.").max(160),
  levelId: z.string().trim().min(1, "Choose a learning level."),
  description: z.string().trim().max(6_000).optional().nullable(),
  who: z.string().trim().max(400).default(""),
  artefact: z.string().trim().max(400).default(""),
  weeks: z.string().trim().max(80).default(""),
  tier: z.string().trim().max(40).default(""),
  flag: z.string().trim().max(40).optional().nullable(),
  outcomes: lines,
  prerequisites: lines,
  durationMinutes: z.coerce.number().int().min(0).max(100_000).optional().nullable(),
  difficulty: z.enum(["Introductory", "Intermediate", "Advanced"]).optional().nullable(),
  isFree: z.coerce.boolean().default(false),
  includedInSubscription: z.coerce.boolean().default(true),
  complianceSensitive: z.coerce.boolean().default(true),
  disclaimer: z.string().trim().max(2_000).optional().nullable(),
  academicReviewerId: z.string().trim().optional().nullable(),
  complianceReviewerId: z.string().trim().optional().nullable(),
  effectiveDate: optionalDate,
  reviewDate: optionalDate,
  thumbnailId: z.string().trim().optional().nullable(),
  /** Withdraw from learners automatically at this time. Omitted = unchanged. */
  expiresAt: optionalDate,
  /** A template is copied to start new courses and is never released. Omitted = unchanged. */
  isTemplate: z.preprocess((v) => (v === undefined || v === "" ? undefined : v === true || v === "true" || v === "on"), z.boolean().optional()),
  /** Enrolment requires a valid certificate for this course. "" clears it; omitted = unchanged. */
  requiresCourseId: z.preprocess((v) => (v === "" ? null : v), z.string().trim().nullable().optional()),
});

export async function createCourse(actor: Actor, input: { levelId: string; name: string; description?: string | null }) {
  await assertCan(actor, "content.create");
  const data = CourseInput.pick({ levelId: true, name: true, description: true }).parse(input);
  screen(data.description);
  const course = await transaction(async (tx) => {
    const level = await tx.learningLevel.findUnique({ where: { id: data.levelId }, select: { id: true, status: true, sequence: true } });
    if (!level || level.status === "ARCHIVED") throw new ServiceError("Choose an active learning level.");
    const last = await tx.program.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const created = await tx.program.create({
      data: {
        slug: await uniqueSlug(tx, data.name, "program"),
        name: data.name,
        description: data.description ?? null,
        levelId: level.id,
        level: Math.min(5, Math.max(1, level.sequence)),
        tier: "",
        who: "",
        artefact: "",
        weeks: "",
        outcomes: [],
        status: "DRAFT",
        state: "DRAFT",
        sortOrder: (last?.sortOrder ?? -1) + 1,
        ownerId: actor.id,
      },
    });
    await recordRevision(tx, { entityType: "Course", entityId: created.id, courseId: created.id, editorId: actor.id, reason: "Created", before: null, after: await courseSnapshot(tx, created.id) });
    return created;
  });
  await log(actor, "create", "Course", course.id, { name: course.name, levelId: course.levelId });
  return course;
}

/**
 * Updates course details. `lockVersion` is the version the editor loaded; if someone else
 * saved in between, the write is refused rather than silently overwriting their change.
 */
export async function updateCourse(actor: Actor, courseId: string, input: unknown, lockVersion: number, reason?: string) {
  await assertCan(actor, "content.edit");
  const data = CourseInput.parse(input);
  screen(data.description, data.disclaimer, ...data.outcomes);
  const course = await transaction(async (tx) => {
    await lockedCheck(tx, courseId);
    const level = await tx.learningLevel.findUnique({ where: { id: data.levelId }, select: { status: true } });
    if (!level || level.status === "ARCHIVED") throw new ServiceError("Choose an active learning level.");
    const before = await courseSnapshot(tx, courseId);
    if (before.levelId !== data.levelId) await assertCan(actor, "content.structure", { entity: "Course", id: courseId });
    if (data.requiresCourseId) {
      if (data.requiresCourseId === courseId) throw new ServiceError("A course cannot require itself.");
      const req = await tx.program.findUnique({ where: { id: data.requiresCourseId }, select: { requiresCourseId: true, isTemplate: true } });
      if (!req || req.isTemplate) throw new ServiceError("Choose a real course as the prerequisite.");
      if (req.requiresCourseId === courseId) throw new ServiceError("Those two courses would require each other.");
    }
    if (data.isTemplate && (await tx.program.findUnique({ where: { id: courseId }, select: { publishedVersionId: true } }))?.publishedVersionId) {
      throw new ServiceError("A released course cannot become a template. Duplicate it and mark the copy as a template.");
    }
    const res = await tx.program.updateMany({
      where: { id: courseId, lockVersion },
      data: { ...data, lockVersion: { increment: 1 } },
    });
    if (res.count === 0) throw new ServiceError("Someone else saved this course after you opened it. Reload to see their changes, then edit again.");
    await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: "Course", entityId: courseId, courseId, editorId: actor.id, reason, before, after: await courseSnapshot(tx, courseId) });
    return tx.program.findUniqueOrThrow({ where: { id: courseId } });
  });
  await log(actor, "update", "Course", courseId, { name: course.name });
  return course;
}

export async function reorderCourses(actor: Actor, levelId: string, orderedIds: string[]) {
  await assertCan(actor, "content.structure");
  await transaction(async (tx) => {
    const inLevel = await tx.program.findMany({ where: { levelId }, select: { id: true, sortOrder: true }, orderBy: { sortOrder: "asc" } });
    assertSameSet(inLevel.map((c) => c.id), orderedIds);
    const slots = inLevel.map((c) => c.sortOrder).sort((a, b) => a - b);
    for (const [i, id] of orderedIds.entries()) await tx.program.update({ where: { id }, data: { sortOrder: slots[i] } });
  });
  await log(actor, "move", "Course", null, { levelId, order: orderedIds });
}

/** Deep copy into a new draft course. Nothing mutable is shared with the original. */
export async function duplicateCourse(actor: Actor, courseId: string) {
  await assertCan(actor, "content.create");
  const copy = await transaction(async (tx) => {
    const src = await tx.program.findUnique({ where: { id: courseId }, include: { modules: { where: { state: { not: "ARCHIVED" } }, orderBy: { sortOrder: "asc" } } } });
    if (!src) throw new ServiceError("That course no longer exists.");
    const last = await tx.program.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const created = await tx.program.create({
      data: {
        slug: await uniqueSlug(tx, `${src.name} copy`, "program"),
        name: `${src.name} (copy)`,
        tier: src.tier,
        level: src.level,
        levelId: src.levelId,
        who: src.who,
        artefact: src.artefact,
        weeks: src.weeks,
        outcomes: strings(src.outcomes),
        description: src.description,
        prerequisites: strings(src.prerequisites),
        durationMinutes: src.durationMinutes,
        difficulty: src.difficulty,
        isFree: src.isFree,
        includedInSubscription: src.includedInSubscription,
        complianceSensitive: src.complianceSensitive,
        disclaimer: src.disclaimer,
        thumbnailId: src.thumbnailId,
        status: "DRAFT",
        state: "DRAFT",
        sortOrder: (last?.sortOrder ?? -1) + 1,
        ownerId: actor.id,
      },
    });
    for (const m of src.modules) await copyModule(tx, m.id, created.id, m.sortOrder, false);
    await recordRevision(tx, { entityType: "Course", entityId: created.id, courseId: created.id, editorId: actor.id, reason: `Duplicated from ${src.name}`, before: null, after: await courseSnapshot(tx, created.id) });
    return created;
  });
  await log(actor, "duplicate", "Course", copy.id, { from: courseId });
  return copy;
}

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export const ModuleInput = z.object({
  title: z.string().trim().min(3, "Give the module a title.").max(160),
  summary: z.string().trim().max(2_000).optional().nullable(),
  objectives: lines,
  estimatedMinutes: z.coerce.number().int().min(0).max(10_000).optional().nullable(),
  /** Another module of the same course that must be completed first. "" clears it; omitted = unchanged. */
  prerequisiteModuleId: z.preprocess((v) => (v === "" ? null : v), z.string().trim().nullable().optional()),
});

/** The prerequisite must be another module of the same course, and the chain must not loop. */
async function checkPrerequisite(tx: Tx, courseId: string, moduleId: string | null, prerequisiteId: string | null | undefined) {
  if (!prerequisiteId) return;
  if (prerequisiteId === moduleId) throw new ServiceError("A module cannot require itself.");
  const all = await tx.module.findMany({ where: { programId: courseId }, select: { id: true, prerequisiteModuleId: true } });
  const byId = new Map(all.map((m) => [m.id, m.prerequisiteModuleId]));
  if (!byId.has(prerequisiteId)) throw new ServiceError("The prerequisite must be a module of the same course.");
  for (let cur: string | null | undefined = prerequisiteId, hops = 0; cur; cur = byId.get(cur), hops++) {
    if (cur === moduleId || hops > all.length) throw new ServiceError("That prerequisite would create a loop.");
  }
}

export async function createModule(actor: Actor, courseId: string, input: unknown) {
  await assertCan(actor, "content.create");
  const data = ModuleInput.parse(input);
  screen(data.summary, ...data.objectives);
  const mod = await transaction(async (tx) => {
    await lockedCheck(tx, courseId);
    await checkPrerequisite(tx, courseId, null, data.prerequisiteModuleId);
    const created = await tx.module.create({
      data: { ...data, programId: courseId, state: "DRAFT", sortOrder: await nextSortOrder(tx, "module", { programId: courseId }) },
    });
    await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: "Module", entityId: created.id, courseId, editorId: actor.id, reason: "Created", before: null, after: await moduleSnapshot(tx, created.id) });
    return created;
  });
  await log(actor, "create", "Module", mod.id, { title: mod.title, courseId });
  return mod;
}

export async function updateModule(actor: Actor, moduleId: string, input: unknown, lockVersion: number, reason?: string) {
  await assertCan(actor, "content.edit");
  const data = ModuleInput.parse(input);
  screen(data.summary, ...data.objectives);
  const courseId = await transaction(async (tx) => {
    const courseId = await courseOfModule(tx, moduleId);
    await lockedCheck(tx, courseId);
    await checkPrerequisite(tx, courseId, moduleId, data.prerequisiteModuleId);
    const before = await moduleSnapshot(tx, moduleId);
    const res = await tx.module.updateMany({ where: { id: moduleId, lockVersion }, data: { ...data, lockVersion: { increment: 1 } } });
    if (res.count === 0) throw new ServiceError("Someone else saved this module after you opened it. Reload to see their changes.");
    await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: "Module", entityId: moduleId, courseId, editorId: actor.id, reason, before, after: await moduleSnapshot(tx, moduleId) });
    return courseId;
  });
  await log(actor, "update", "Module", moduleId, { title: data.title, courseId });
}

/** Ready (included in the next release), draft (excluded), archived (kept, hidden, restorable). */
export async function setModuleState(actor: Actor, moduleId: string, state: PublishState) {
  await assertCan(actor, state === "ARCHIVED" ? "content.archive" : "content.edit");
  const { before } = await transaction(async (tx) => {
    const courseId = await courseOfModule(tx, moduleId);
    await lockedCheck(tx, courseId);
    const before = await moduleSnapshot(tx, moduleId);
    if (before.state === "ARCHIVED" && state !== "ARCHIVED") await assertCan(actor, "content.archive", { entity: "Module", id: moduleId });
    await tx.module.update({ where: { id: moduleId }, data: { state, lockVersion: { increment: 1 } } });
    await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: "Module", entityId: moduleId, courseId, editorId: actor.id, reason: `State set to ${state.toLowerCase()}`, before, after: await moduleSnapshot(tx, moduleId) });
    return { before };
  });
  await log(actor, state === "ARCHIVED" ? "archive" : before.state === "ARCHIVED" ? "restore" : "update", "Module", moduleId, { state }, { state: before.state });
}

export async function reorderModules(actor: Actor, courseId: string, orderedIds: string[]) {
  await assertCan(actor, "content.edit");
  await transaction(async (tx) => {
    await lockedCheck(tx, courseId);
    const current = await tx.module.findMany({ where: { programId: courseId }, select: { id: true } });
    assertSameSet(current.map((m) => m.id), orderedIds);
    for (const [i, id] of orderedIds.entries()) await tx.module.update({ where: { id }, data: { sortOrder: i } });
    await markEdited(tx, courseId);
  });
  await log(actor, "move", "Module", null, { courseId, order: orderedIds });
}

export async function moveModuleStep(actor: Actor, moduleId: string, direction: "up" | "down") {
  const courseId = await courseOfModule(prisma, moduleId);
  const ids = (await prisma.module.findMany({ where: { programId: courseId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } })).map((m) => m.id);
  await reorderModules(actor, courseId, stepMove(ids, moduleId, direction));
}

/**
 * Moves a module (and its lessons) to another course. Learner progress stays attached to the
 * lessons, so moving a module that learners have worked in needs `confirm`; `impact` tells
 * the editor what that means before they confirm.
 */
export async function moveModuleToCourse(actor: Actor, moduleId: string, targetCourseId: string, confirm = false) {
  await assertCan(actor, "content.structure");
  const result = await transaction(async (tx) => {
    const mod = await tx.module.findUnique({ where: { id: moduleId }, include: { lessons: { select: { id: true } } } });
    if (!mod) throw new ServiceError("That module no longer exists.");
    if (mod.programId === targetCourseId) throw new ServiceError("The module is already in that course.");
    await lockedCheck(tx, mod.programId);
    await lockedCheck(tx, targetCourseId);
    const history = await lessonHistory(tx, mod.lessons.map((l) => l.id));
    if ((history.progress || history.attempts) && !confirm) {
      return { moved: false as const, impact: history };
    }
    const before = await moduleSnapshot(tx, moduleId);
    await tx.module.update({ where: { id: moduleId }, data: { programId: targetCourseId, sortOrder: await nextSortOrder(tx, "module", { programId: targetCourseId }), lockVersion: { increment: 1 } } });
    await renumber(tx, "module", { programId: mod.programId });
    await markEdited(tx, mod.programId);
    await markEdited(tx, targetCourseId);
    await recordRevision(tx, { entityType: "Module", entityId: moduleId, courseId: targetCourseId, editorId: actor.id, reason: `Moved from course ${mod.programId}`, before, after: await moduleSnapshot(tx, moduleId) });
    return { moved: true as const, impact: history, from: mod.programId };
  });
  if (result.moved) await log(actor, "move", "Module", moduleId, { to: targetCourseId, from: result.from, learnerHistory: result.impact });
  return result;
}

/** Copies a module, with fresh copies of every lesson, block, resource and question. */
export async function duplicateModule(actor: Actor, moduleId: string, targetCourseId?: string) {
  await assertCan(actor, "content.create");
  const copy = await transaction(async (tx) => {
    const src = await tx.module.findUnique({ where: { id: moduleId } });
    if (!src) throw new ServiceError("That module no longer exists.");
    const dest = targetCourseId ?? src.programId;
    if (dest !== src.programId) await assertCan(actor, "content.structure", { entity: "Module", id: moduleId });
    await lockedCheck(tx, dest);
    const created = await copyModule(tx, moduleId, dest, await nextSortOrder(tx, "module", { programId: dest }), dest === src.programId);
    await markEdited(tx, dest);
    await recordRevision(tx, { entityType: "Module", entityId: created.id, courseId: dest, editorId: actor.id, reason: `Duplicated from ${src.title}`, before: null, after: await moduleSnapshot(tx, created.id) });
    return created;
  });
  await log(actor, "duplicate", "Module", copy.id, { from: moduleId, courseId: copy.programId });
  return copy;
}

export async function deleteModule(actor: Actor, moduleId: string) {
  await assertCan(actor, "content.delete");
  const removed = await transaction(async (tx) => {
    const mod = await tx.module.findUnique({ where: { id: moduleId }, include: { lessons: { select: { id: true } } } });
    if (!mod) throw new ServiceError("That module no longer exists.");
    await lockedCheck(tx, mod.programId);
    const ids = mod.lessons.map((l) => l.id);
    const history = await lessonHistory(tx, ids);
    if (history.progress || history.attempts) {
      throw new ServiceError("Learners have worked in this module. Archive it instead; deleting would erase their history.");
    }
    if (await inAnyRelease(tx, mod.programId, { moduleId })) {
      throw new ServiceError("This module is part of a released version of the course. Archive it instead.");
    }
    for (const id of ids) await purgeLesson(tx, id);
    await tx.module.delete({ where: { id: moduleId } });
    await renumber(tx, "module", { programId: mod.programId });
    await markEdited(tx, mod.programId);
    return mod;
  });
  await log(actor, "delete", "Module", moduleId, undefined, { title: removed.title, lessons: removed.lessons.length });
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export const LessonInput = z.object({
  title: z.string().trim().min(3, "Give the lesson a title.").max(200),
  objectives: lines,
  minutes: z.coerce.number().int().min(0).max(600).optional().nullable(),
  freePreview: z.coerce.boolean().default(false),
  completionRule: z.enum(["MANUAL", "ASSESSMENT_PASS"]).default("MANUAL"),
  effectiveDate: optionalDate,
  lastReviewedAt: optionalDate,
  nextReviewAt: optionalDate,
  /** Citations the lesson relies on (regulation, payer manual, standard), one per line. */
  sources: z.union([z.array(z.string()), z.string()]).optional().transform((v) => (v === undefined ? undefined : (Array.isArray(v) ? v : v.split("\n")).map((x) => x.trim()).filter(Boolean).slice(0, 30))),
  contentOwnerId: z.preprocess((v) => (v === "" ? null : v), z.string().trim().nullable().optional()),
});

export async function createLesson(actor: Actor, moduleId: string, input: { title: string }) {
  await assertCan(actor, "content.create");
  const { title } = LessonInput.pick({ title: true }).parse(input);
  const lesson = await transaction(async (tx) => {
    const courseId = await courseOfModule(tx, moduleId);
    await lockedCheck(tx, courseId);
    const created = await tx.lesson.create({ data: { moduleId, title, state: "DRAFT", sortOrder: await nextSortOrder(tx, "lesson", { moduleId }) } });
    await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: "Lesson", entityId: created.id, courseId, editorId: actor.id, reason: "Created", before: null, after: await lessonSnapshot(tx, created.id) });
    return { ...created, courseId };
  });
  await log(actor, "create", "Lesson", lesson.id, { title, moduleId });
  return lesson;
}

export async function updateLesson(actor: Actor, lessonId: string, input: unknown, lockVersion: number, reason?: string) {
  await assertCan(actor, "content.edit");
  const data = LessonInput.parse(input);
  screen(data.title, ...data.objectives, ...(data.sources ?? []));
  if (data.lastReviewedAt && data.lastReviewedAt > new Date()) throw new ServiceError("The last review date cannot be in the future.");
  if (data.lastReviewedAt && data.nextReviewAt && data.nextReviewAt <= data.lastReviewedAt) throw new ServiceError("The next review must come after the last one.");
  await transaction(async (tx) => {
    const courseId = await courseOfLesson(tx, lessonId);
    await lockedCheck(tx, courseId);
    if (data.completionRule === "ASSESSMENT_PASS") {
      const quiz = await tx.quiz.findFirst({ where: { lessonId, archivedAt: null }, select: { id: true } });
      if (!quiz) throw new ServiceError("Add an assessment to this lesson before making completion depend on passing it.");
    }
    const before = await lessonSnapshot(tx, lessonId);
    const res = await tx.lesson.updateMany({
      where: { id: lessonId, lockVersion },
      data: {
        title: data.title,
        objectives: data.objectives,
        durationSec: data.minutes ? data.minutes * 60 : null,
        freePreview: data.freePreview,
        completionRule: data.completionRule as LessonCompletion,
        ...(data.effectiveDate !== undefined ? { effectiveDate: data.effectiveDate } : {}),
        ...(data.lastReviewedAt !== undefined ? { lastReviewedAt: data.lastReviewedAt } : {}),
        ...(data.nextReviewAt !== undefined ? { nextReviewAt: data.nextReviewAt } : {}),
        ...(data.sources !== undefined ? { sources: data.sources } : {}),
        ...(data.contentOwnerId !== undefined ? { contentOwnerId: data.contentOwnerId } : {}),
        lockVersion: { increment: 1 },
      },
    });
    if (res.count === 0) throw new ServiceError("Someone else saved this lesson after you opened it. Reload to see their changes.");
    await markEdited(tx, courseId);
    await recordRevision(tx, { entityType: "Lesson", entityId: lessonId, courseId, editorId: actor.id, reason, before, after: await lessonSnapshot(tx, lessonId) });
  });
  await log(actor, "update", "Lesson", lessonId, { title: data.title });
}

async function applyLessonState(tx: Tx, actor: Actor, lessonId: string, state: PublishState) {
  const courseId = await courseOfLesson(tx, lessonId);
  await lockedCheck(tx, courseId);
  const before = await lessonSnapshot(tx, lessonId);
  if (before.state === "ARCHIVED" && state !== "ARCHIVED") await assertCan(actor, "content.archive", { entity: "Lesson", id: lessonId });
  if (state === "PUBLISHED") {
    // Sequential: one transaction is one connection, and pg will refuse overlapping queries.
    const blocks = await tx.contentBlock.count({ where: { lessonId } });
    const resources = await tx.resource.count({ where: { lessonId, archivedAt: null } });
    const quizzes = await tx.quiz.count({ where: { lessonId, archivedAt: null } });
    if (!blocks && !resources && !quizzes) throw new ServiceError(`Add content to “${before.title as string}” before marking it ready. Learners would see an empty page.`);
  }
  await tx.lesson.update({ where: { id: lessonId }, data: { state, lockVersion: { increment: 1 } } });
  await markEdited(tx, courseId);
  await recordRevision(tx, { entityType: "Lesson", entityId: lessonId, courseId, editorId: actor.id, reason: `State set to ${state.toLowerCase()}`, before, after: await lessonSnapshot(tx, lessonId) });
  return { before, courseId };
}

export async function setLessonState(actor: Actor, lessonId: string, state: PublishState) {
  await assertCan(actor, state === "ARCHIVED" ? "content.archive" : "content.edit");
  const { before } = await transaction((tx) => applyLessonState(tx, actor, lessonId, state));
  await log(actor, state === "ARCHIVED" ? "archive" : before.state === "ARCHIVED" ? "restore" : "update", "Lesson", lessonId, { state }, { state: before.state });
}

/**
 * The same state change for several lessons of one course, all or nothing: if any lesson
 * cannot change (empty, locked course, missing permission), none do.
 */
export async function bulkLessonState(actor: Actor, courseId: string, lessonIds: string[], state: PublishState) {
  await assertCan(actor, state === "ARCHIVED" ? "content.archive" : "content.edit");
  const ids = [...new Set(lessonIds)];
  if (!ids.length) throw new ServiceError("Select at least one lesson.");
  if (ids.length > 100) throw new ServiceError("Change at most 100 lessons at a time.");
  await transaction(async (tx) => {
    const owned = await tx.lesson.count({ where: { id: { in: ids }, module: { programId: courseId } } });
    if (owned !== ids.length) throw new ServiceError("Every selected lesson must belong to this course.");
    for (const id of ids) await applyLessonState(tx, actor, id, state);
  });
  await log(actor, state === "ARCHIVED" ? "archive" : "update", "Course", courseId, { bulk: true, lessons: ids.length, state });
  return ids.length;
}

export async function reorderLessons(actor: Actor, moduleId: string, orderedIds: string[]) {
  await assertCan(actor, "content.edit");
  await transaction(async (tx) => {
    const courseId = await courseOfModule(tx, moduleId);
    await lockedCheck(tx, courseId);
    const current = await tx.lesson.findMany({ where: { moduleId }, select: { id: true } });
    assertSameSet(current.map((l) => l.id), orderedIds);
    for (const [i, id] of orderedIds.entries()) await tx.lesson.update({ where: { id }, data: { sortOrder: i } });
    await markEdited(tx, courseId);
  });
  await log(actor, "move", "Lesson", null, { moduleId, order: orderedIds });
}

export async function moveLessonStep(actor: Actor, lessonId: string, direction: "up" | "down") {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { moduleId: true } });
  if (!lesson) throw new ServiceError("That lesson no longer exists.");
  const ids = (await prisma.lesson.findMany({ where: { moduleId: lesson.moduleId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } })).map((l) => l.id);
  await reorderLessons(actor, lesson.moduleId, stepMove(ids, lessonId, direction));
}

/**
 * Moves a lesson to another module, in this course or another. Moving across courses needs
 * structure permission, and `confirm` when learners have history on the lesson.
 */
export async function moveLessonToModule(actor: Actor, lessonId: string, targetModuleId: string, position?: number, confirm = false) {
  await assertCan(actor, "content.edit");
  const result = await transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, include: { module: { select: { id: true, programId: true } } } });
    if (!lesson) throw new ServiceError("That lesson no longer exists.");
    const target = await tx.module.findUnique({ where: { id: targetModuleId }, select: { id: true, programId: true, state: true } });
    if (!target) throw new ServiceError("That module no longer exists.");
    if (target.state === "ARCHIVED") throw new ServiceError("Lessons cannot be moved into an archived module. Restore it first.");
    if (target.id === lesson.moduleId && position === undefined) throw new ServiceError("The lesson is already in that module.");
    await lockedCheck(tx, lesson.module.programId);
    await lockedCheck(tx, target.programId);
    const crossCourse = target.programId !== lesson.module.programId;
    if (crossCourse) await assertCan(actor, "content.structure", { entity: "Lesson", id: lessonId });
    const history = await lessonHistory(tx, [lessonId]);
    if (crossCourse && (history.progress || history.attempts) && !confirm) return { moved: false as const, impact: history };

    const before = await lessonSnapshot(tx, lessonId);
    const siblings = (await tx.lesson.findMany({ where: { moduleId: targetModuleId, id: { not: lessonId } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } })).map((l) => l.id);
    const at = position === undefined ? siblings.length : Math.max(0, Math.min(siblings.length, position));
    siblings.splice(at, 0, lessonId);
    await tx.lesson.update({ where: { id: lessonId }, data: { moduleId: targetModuleId, lockVersion: { increment: 1 } } });
    for (const [i, id] of siblings.entries()) await tx.lesson.update({ where: { id }, data: { sortOrder: i } });
    if (lesson.moduleId !== targetModuleId) await renumber(tx, "lesson", { moduleId: lesson.moduleId });
    await markEdited(tx, lesson.module.programId);
    if (crossCourse) await markEdited(tx, target.programId);
    await recordRevision(tx, { entityType: "Lesson", entityId: lessonId, courseId: target.programId, editorId: actor.id, reason: `Moved from module ${lesson.moduleId}`, before, after: await lessonSnapshot(tx, lessonId) });
    return { moved: true as const, impact: history, from: lesson.moduleId };
  });
  if (result.moved) await log(actor, "move", "Lesson", lessonId, { toModule: targetModuleId, fromModule: result.from, learnerHistory: result.impact });
  return result;
}

export async function duplicateLesson(actor: Actor, lessonId: string, targetModuleId?: string) {
  await assertCan(actor, "content.create");
  const copy = await transaction(async (tx) => {
    const src = await tx.lesson.findUnique({ where: { id: lessonId }, include: { module: { select: { programId: true } } } });
    if (!src) throw new ServiceError("That lesson no longer exists.");
    const dest = targetModuleId ?? src.moduleId;
    const destCourse = await courseOfModule(tx, dest);
    if (destCourse !== src.module.programId) await assertCan(actor, "content.structure", { entity: "Lesson", id: lessonId });
    await lockedCheck(tx, destCourse);
    const created = await copyLesson(tx, lessonId, dest, await nextSortOrder(tx, "lesson", { moduleId: dest }), dest === src.moduleId);
    await markEdited(tx, destCourse);
    await recordRevision(tx, { entityType: "Lesson", entityId: created.id, courseId: destCourse, editorId: actor.id, reason: `Duplicated from ${src.title}`, before: null, after: await lessonSnapshot(tx, created.id) });
    return created;
  });
  await log(actor, "duplicate", "Lesson", copy.id, { from: lessonId });
  return copy;
}

export async function deleteLesson(actor: Actor, lessonId: string) {
  await assertCan(actor, "content.delete");
  const removed = await transaction(async (tx) => {
    const lesson = await tx.lesson.findUnique({ where: { id: lessonId }, include: { module: { select: { programId: true } } } });
    if (!lesson) throw new ServiceError("That lesson no longer exists.");
    await lockedCheck(tx, lesson.module.programId);
    const history = await lessonHistory(tx, [lessonId]);
    if (history.progress || history.attempts) {
      throw new ServiceError("Learners have started or been assessed on this lesson. Archive it instead; deleting would erase their history.");
    }
    if (await inAnyRelease(tx, lesson.module.programId, { lessonId })) {
      throw new ServiceError("This lesson is part of a released version of the course. Archive it instead.");
    }
    await purgeLesson(tx, lessonId);
    await renumber(tx, "lesson", { moduleId: lesson.moduleId });
    await markEdited(tx, lesson.module.programId);
    return lesson;
  });
  await log(actor, "delete", "Lesson", lessonId, undefined, { title: removed.title });
}

// ---------------------------------------------------------------------------
// Impact preview
// ---------------------------------------------------------------------------

export async function impactOf(kind: "course" | "module" | "lesson", id: string) {
  const lessonIds =
    kind === "lesson"
      ? [id]
      : (
          await prisma.lesson.findMany({
            where: kind === "module" ? { moduleId: id } : { module: { programId: id } },
            select: { id: true },
          })
        ).map((l) => l.id);
  const [learners, attempts] = await Promise.all([
    lessonIds.length ? prisma.progress.groupBy({ by: ["userId"], where: { lessonId: { in: lessonIds } } }).then((r) => r.length) : 0,
    lessonIds.length ? prisma.quizAttempt.count({ where: { quiz: { lessonId: { in: lessonIds } } } }) : 0,
  ]);
  const courseId = kind === "course" ? id : kind === "module" ? await courseOfModule(prisma, id) : await courseOfLesson(prisma, id);
  const [enrolled, certificates] = await Promise.all([
    prisma.enrolment.count({ where: { programId: courseId, state: { in: ["ACTIVE", "COMPLETED"] } } }),
    prisma.certificate.count({ where: { programId: courseId, revokedAt: null } }),
  ]);
  return { lessons: lessonIds.length, learnersWithProgress: learners, attempts, enrolled, certificates };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

export function assertSameSet(current: string[], proposed: string[]) {
  const a = [...current].sort();
  const b = [...proposed].sort();
  if (a.length !== b.length || a.some((v, i) => v !== b[i]) || new Set(proposed).size !== proposed.length) {
    throw new ServiceError("The list changed while you were reordering it. Reload and try again.");
  }
}

export function stepMove(ids: string[], id: string, direction: "up" | "down") {
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const out = [...ids];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

async function renumber(tx: Tx, model: "module" | "lesson", where: Record<string, unknown>) {
  const delegate = (tx as unknown as Record<string, { findMany: (a: unknown) => Promise<{ id: string }[]>; update: (a: unknown) => Promise<unknown> }>)[model];
  const rows = await delegate.findMany({ where, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  for (const [i, r] of rows.entries()) await delegate.update({ where: { id: r.id }, data: { sortOrder: i } });
}

/** Whether any released version of the course contains this module or lesson. */
async function inAnyRelease(tx: Tx, courseId: string, ref: { moduleId?: string; lessonId?: string }) {
  const versions = await tx.courseVersion.findMany({ where: { courseId }, select: { snapshot: true } });
  const needle = ref.moduleId ?? ref.lessonId;
  return versions.some((v) => JSON.stringify(v.snapshot).includes(`"id":"${needle}"`));
}

async function purgeLesson(tx: Tx, lessonId: string) {
  const quizzes = await tx.quiz.findMany({ where: { lessonId }, select: { id: true } });
  for (const q of quizzes) {
    await tx.quizQuestion.deleteMany({ where: { quizId: q.id } });
    await tx.quiz.delete({ where: { id: q.id } });
  }
  await tx.contentBlock.deleteMany({ where: { lessonId } });
  await tx.resource.deleteMany({ where: { lessonId } });
  await tx.lesson.delete({ where: { id: lessonId } });
}

async function copyModule(tx: Tx, moduleId: string, programId: string, sortOrder: number, markCopy: boolean) {
  const src = await tx.module.findUniqueOrThrow({ where: { id: moduleId }, include: { lessons: { where: { state: { not: "ARCHIVED" } }, orderBy: { sortOrder: "asc" } } } });
  const mod = await tx.module.create({
    data: {
      programId,
      title: markCopy ? `${src.title} (copy)` : src.title,
      summary: src.summary,
      objectives: strings(src.objectives),
      estimatedMinutes: src.estimatedMinutes,
      sortOrder,
      state: "DRAFT",
    },
  });
  for (const l of src.lessons) await copyLesson(tx, l.id, mod.id, l.sortOrder, false);
  return mod;
}

async function copyLesson(tx: Tx, lessonId: string, moduleId: string, sortOrder: number, markCopy: boolean) {
  const src = await tx.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: {
      blocks: { orderBy: { sortOrder: "asc" } },
      resources: { where: { archivedAt: null } },
      quizzes: { where: { archivedAt: null }, include: { questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } } },
    },
  });
  const lesson = await tx.lesson.create({
    data: {
      moduleId,
      title: markCopy ? `${src.title} (copy)` : src.title,
      objectives: strings(src.objectives),
      durationSec: src.durationSec,
      freePreview: src.freePreview,
      completionRule: src.completionRule,
      effectiveDate: src.effectiveDate,
      sortOrder,
      state: "DRAFT",
    },
  });
  if (src.blocks.length) {
    await tx.contentBlock.createMany({ data: src.blocks.map((b) => ({ lessonId: lesson.id, kind: b.kind, data: b.data as never, sortOrder: b.sortOrder })) });
  }
  if (src.resources.length) {
    // Stored files are immutable once uploaded, so copies may point at the same file; the
    // file is removed only when no resource references it (lib/actions/materials.ts).
    await tx.resource.createMany({ data: src.resources.map((r) => ({ lessonId: lesson.id, title: r.title, fileKey: r.fileKey, mimeType: r.mimeType, sizeBytes: r.sizeBytes, watermark: r.watermark })) });
  }
  for (const q of src.quizzes) {
    const quiz = await tx.quiz.create({
      data: {
        lessonId: lesson.id,
        title: q.title,
        kind: q.kind,
        instructions: q.instructions,
        passingScore: q.passingScore,
        timeLimitMinutes: q.timeLimitMinutes,
        maxAttempts: q.maxAttempts,
        retakeWaitMinutes: q.retakeWaitMinutes,
        randomizeQuestions: q.randomizeQuestions,
        randomizeOptions: q.randomizeOptions,
        bankId: q.bankId,
        drawCount: q.drawCount,
        showAnswers: q.showAnswers,
      },
    });
    if (q.questions.length) {
      await tx.quizQuestion.createMany({
        data: q.questions.map((x) => ({
          quizId: quiz.id,
          type: x.type,
          scenario: x.scenario,
          prompt: x.prompt,
          options: strings(x.options),
          targets: strings(x.targets),
          correct: x.correct,
          answerKey: (x.answerKey ?? undefined) as never,
          rationale: x.rationale,
          points: x.points,
          difficulty: x.difficulty,
          competency: x.competency,
          remediationLessonId: x.remediationLessonId,
          sortOrder: x.sortOrder,
        })),
      });
    }
  }
  return lesson;
}
