"use server";

import { revalidatePath } from "next/cache";
import type { BlockKind, PublishState } from "@prisma/client";
import { requireActor } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import { ServiceError } from "@/lib/errors";
import * as structure from "@/lib/services/cms/structure";
import * as blocks from "@/lib/services/cms/blocks";
import * as release from "@/lib/services/cms/release";
import * as history from "@/lib/services/cms/history";
import * as media from "@/lib/services/cms/media";
import * as assess from "@/lib/services/cms/assessments";
import { requestApproval } from "@/lib/services/approvals";
import { bool, fields, int, json, opt, str } from "./_form";

/**
 * Server actions for the Admin CMS. Each one resolves the actor from the session and calls
 * a service, which checks permission itself. The action's only other job is telling Next
 * which pages to re-read.
 */

const refresh = (courseId?: string | null) => {
  revalidatePath("/admin/content", "layout");
  if (courseId) revalidatePath(`/admin/content/courses/${courseId}`, "layout");
  revalidatePath("/academy", "layout");
  revalidatePath("/catalog", "layout");
};

const STATES: PublishState[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const state = (fd: FormData) => {
  const s = str(fd, "state") as PublishState;
  if (!STATES.includes(s)) throw new ServiceError("Unknown state.");
  return s;
};

// Levels ----------------------------------------------------------------------

const LEVEL_FIELDS = ["name", "displayTitle", "shortDescription", "description", "audience", "prerequisites", "outcomes", "coreTopics", "estimatedEffort", "assessmentRequirement", "passingCriteria", "completionRequirement", "badgeName", "accent", "disclaimer", "effectiveDate", "reviewDate"];

export async function createLevelAction(fd: FormData) {
  return attempt(async () => {
    const l = await structure.createLevel(await requireActor(), fields(fd, LEVEL_FIELDS));
    refresh();
    return { id: l.id };
  });
}

export async function updateLevelAction(fd: FormData) {
  return attempt(async () => {
    await structure.updateLevel(await requireActor(), str(fd, "id"), fields(fd, LEVEL_FIELDS), opt(fd, "reason") ?? undefined);
    refresh();
  });
}

export async function setLevelStatusAction(fd: FormData) {
  return attempt(async () => {
    await structure.setLevelStatus(await requireActor(), str(fd, "id"), str(fd, "status") as "PUBLISHED" | "DRAFT" | "ARCHIVED");
    refresh();
  });
}

export async function moveLevelAction(fd: FormData) {
  return attempt(async () => {
    const ids = json<string[]>(fd, "order");
    if (!ids) throw new ServiceError("Nothing to reorder.");
    await structure.reorderLevels(await requireActor(), ids);
    refresh();
  });
}

export async function duplicateLevelAction(fd: FormData) {
  return attempt(async () => {
    await structure.duplicateLevel(await requireActor(), str(fd, "id"));
    refresh();
  });
}

export async function deleteLevelAction(fd: FormData) {
  return attempt(async () => {
    await structure.deleteLevel(await requireActor(), str(fd, "id"));
    refresh();
  });
}

// Courses ---------------------------------------------------------------------

export async function createCourseAction(fd: FormData) {
  return attempt(async () => {
    const c = await structure.createCourse(await requireActor(), { levelId: str(fd, "levelId"), name: str(fd, "name"), description: opt(fd, "description") });
    refresh(c.id);
    return { id: c.id, href: `/admin/content/courses/${c.id}` };
  });
}

const COURSE_FIELDS = ["name", "levelId", "description", "who", "artefact", "weeks", "tier", "flag", "outcomes", "prerequisites", "durationMinutes", "difficulty", "disclaimer", "academicReviewerId", "complianceReviewerId", "effectiveDate", "reviewDate", "thumbnailId"];

export async function updateCourseAction(fd: FormData) {
  return attempt(async () => {
    const id = str(fd, "id");
    const data = fields(fd, COURSE_FIELDS, ["isFree", "includedInSubscription", "complianceSensitive"]);
    for (const k of ["durationMinutes", "difficulty", "academicReviewerId", "complianceReviewerId", "thumbnailId", "flag"]) if (data[k] === "") data[k] = null;
    // Optional fields: only sent by forms that show them, so absence means "unchanged".
    for (const k of ["expiresAt", "requiresCourseId", "isTemplate"]) if (fd.has(k)) data[k] = str(fd, k);
    await structure.updateCourse(await requireActor(), id, data, Number(str(fd, "lockVersion")), opt(fd, "reason") ?? undefined);
    refresh(id);
  });
}

export async function duplicateCourseAction(fd: FormData) {
  return attempt(async () => {
    const c = await structure.duplicateCourse(await requireActor(), str(fd, "id"));
    refresh(c.id);
    return { id: c.id, ...(fd.has("open") ? { href: `/admin/content/courses/${c.id}` } : {}) };
  });
}

export async function reorderCoursesAction(fd: FormData) {
  return attempt(async () => {
    await structure.reorderCourses(await requireActor(), str(fd, "levelId"), json<string[]>(fd, "order") ?? []);
    refresh();
  });
}

export async function requestCourseDeletionAction(fd: FormData) {
  return attempt(async () => {
    await requestApproval(await requireActor(), "COURSE_DELETE", { courseId: str(fd, "id") }, str(fd, "reason"));
    refresh(str(fd, "id"));
  });
}

// Workflow --------------------------------------------------------------------

export async function workflowAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const id = str(fd, "id");
    const comment = opt(fd, "comment") ?? undefined;
    switch (str(fd, "op")) {
      case "submit":
        await release.submitForReview(actor, id, comment);
        break;
      case "academic-approve":
        await release.reviewAcademic(actor, id, true, comment);
        break;
      case "academic-reject":
        await release.reviewAcademic(actor, id, false, comment);
        break;
      case "compliance-approve":
        await release.reviewCompliance(actor, id, true, comment);
        break;
      case "compliance-reject":
        await release.reviewCompliance(actor, id, false, comment);
        break;
      case "publish": {
        const when = opt(fd, "scheduleFor");
        await release.publishCourse(actor, id, when ? new Date(when) : null);
        break;
      }
      case "withdraw":
        await release.withdrawFromReview(actor, id, comment);
        break;
      case "unpublish":
        await release.unpublishCourse(actor, id, comment ?? "");
        break;
      case "archive":
        await release.archiveCourse(actor, id, comment ?? "");
        break;
      case "restore":
        await release.restoreCourse(actor, id);
        break;
      case "rollback":
        await release.rollbackToVersion(actor, id, str(fd, "versionId"), comment ?? "");
        break;
      default:
        throw new ServiceError("Unknown workflow step.");
    }
    refresh(id);
  });
}

// Modules ---------------------------------------------------------------------

export async function createModuleAction(fd: FormData) {
  return attempt(async () => {
    const courseId = str(fd, "courseId");
    const m = await structure.createModule(await requireActor(), courseId, { title: str(fd, "title"), summary: opt(fd, "summary") });
    refresh(courseId);
    return { id: m.id };
  });
}

export async function updateModuleAction(fd: FormData) {
  return attempt(async () => {
    const data = fields(fd, ["title", "summary", "objectives", "estimatedMinutes"]);
    if (fd.has("prerequisiteModuleId")) data.prerequisiteModuleId = str(fd, "prerequisiteModuleId");
    await structure.updateModule(await requireActor(), str(fd, "id"), data, Number(str(fd, "lockVersion")), opt(fd, "reason") ?? undefined);
    refresh(opt(fd, "courseId"));
  });
}

export async function setModuleStateAction(fd: FormData) {
  return attempt(async () => {
    await structure.setModuleState(await requireActor(), str(fd, "id"), state(fd));
    refresh(opt(fd, "courseId"));
  });
}

export async function moveModuleAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const order = json<string[]>(fd, "order");
    if (order) await structure.reorderModules(actor, str(fd, "courseId"), order);
    else await structure.moveModuleStep(actor, str(fd, "id"), str(fd, "direction") === "up" ? "up" : "down");
    refresh(opt(fd, "courseId"));
  });
}

export async function moveModuleToCourseAction(fd: FormData) {
  return attempt(async () => {
    const res = await structure.moveModuleToCourse(await requireActor(), str(fd, "id"), str(fd, "targetCourseId"), bool(fd, "confirm"));
    if (!res.moved) {
      throw new ServiceError(`Learners have history in this module (${res.impact.progress} lesson records, ${res.impact.attempts} assessment attempts). Tick “I understand” and move again to confirm.`);
    }
    refresh(opt(fd, "courseId"));
    refresh(str(fd, "targetCourseId"));
  });
}

export async function duplicateModuleAction(fd: FormData) {
  return attempt(async () => {
    const copy = await structure.duplicateModule(await requireActor(), str(fd, "id"), opt(fd, "targetCourseId") ?? undefined);
    refresh(copy.programId);
  });
}

export async function deleteModuleAction(fd: FormData) {
  return attempt(async () => {
    await structure.deleteModule(await requireActor(), str(fd, "id"));
    refresh(opt(fd, "courseId"));
  });
}

// Lessons ---------------------------------------------------------------------

export async function createLessonAction(fd: FormData) {
  return attempt(async () => {
    const l = await structure.createLesson(await requireActor(), str(fd, "moduleId"), { title: str(fd, "title") });
    refresh(l.courseId);
    return { id: l.id };
  });
}

export async function updateLessonAction(fd: FormData) {
  return attempt(async () => {
    const data = fields(fd, ["title", "objectives", "minutes", "completionRule", "effectiveDate"], ["freePreview"]);
    for (const k of ["lastReviewedAt", "nextReviewAt", "sources", "contentOwnerId"]) if (fd.has(k)) data[k] = str(fd, k);
    await structure.updateLesson(await requireActor(), str(fd, "id"), data, Number(str(fd, "lockVersion")), opt(fd, "reason") ?? undefined);
    refresh(opt(fd, "courseId"));
  });
}

export async function setLessonStateAction(fd: FormData) {
  return attempt(async () => {
    await structure.setLessonState(await requireActor(), str(fd, "id"), state(fd));
    refresh(opt(fd, "courseId"));
  });
}

export async function moveLessonAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const target = opt(fd, "targetModuleId");
    if (target) {
      const pos = int(fd, "position");
      const res = await structure.moveLessonToModule(actor, str(fd, "id"), target, pos === null || Number.isNaN(pos) ? undefined : pos, bool(fd, "confirm"));
      if (!res.moved) throw new ServiceError(`Learners have history on this lesson (${res.impact.progress} progress records, ${res.impact.attempts} attempts). Tick “I understand” to move it to another course.`);
    } else {
      await structure.moveLessonStep(actor, str(fd, "id"), str(fd, "direction") === "up" ? "up" : "down");
    }
    refresh(opt(fd, "courseId"));
  });
}

export async function duplicateLessonAction(fd: FormData) {
  return attempt(async () => {
    await structure.duplicateLesson(await requireActor(), str(fd, "id"), opt(fd, "targetModuleId") ?? undefined);
    refresh(opt(fd, "courseId"));
  });
}

export async function deleteLessonAction(fd: FormData) {
  return attempt(async () => {
    await structure.deleteLesson(await requireActor(), str(fd, "id"));
    refresh(opt(fd, "courseId"));
  });
}

// Blocks ----------------------------------------------------------------------

/** Turns a block form into the block's data object. Lists and tables arrive one per line. */
function blockData(kind: BlockKind, fd: FormData): unknown {
  const lines = (n: string) =>
    str(fd, n)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  switch (kind) {
    case "TEXT":
      return { text: str(fd, "text") };
    case "HEADING":
      return { text: str(fd, "text"), level: Number(str(fd, "level") || 2) };
    case "CALLOUT":
      return { tone: str(fd, "tone") || "info", title: opt(fd, "title") ?? undefined, text: str(fd, "text") };
    case "IMAGE":
      return { mediaId: str(fd, "mediaId"), alt: str(fd, "alt"), caption: opt(fd, "caption") ?? undefined };
    case "VIDEO":
      return { url: str(fd, "url"), title: str(fd, "title"), transcript: opt(fd, "transcript") ?? undefined, captions: bool(fd, "captions") };
    case "AUDIO":
      return { mediaId: str(fd, "mediaId"), title: str(fd, "title"), transcript: str(fd, "transcript") };
    case "LINK":
      return { url: str(fd, "url"), label: str(fd, "label"), description: opt(fd, "description") ?? undefined };
    case "TABLE": {
      const rows = lines("rows").map((r) => r.split("|").map((c) => c.trim()));
      return { caption: opt(fd, "caption") ?? undefined, header: str(fd, "header").split("|").map((c) => c.trim()).filter(Boolean), rows };
    }
    case "STEPS":
      return { title: opt(fd, "title") ?? undefined, steps: lines("steps") };
    case "SCENARIO":
      return { title: str(fd, "title"), context: str(fd, "context"), question: opt(fd, "question") ?? undefined, discussion: opt(fd, "discussion") ?? undefined, synthetic: bool(fd, "synthetic") ? true : undefined };
    case "CODE":
      return { language: opt(fd, "language") ?? undefined, code: str(fd, "code") };
  }
}

export async function addBlockAction(fd: FormData) {
  return attempt(async () => {
    const kind = str(fd, "kind") as BlockKind;
    const pos = int(fd, "position");
    await blocks.addBlock(await requireActor(), str(fd, "lessonId"), kind, blockData(kind, fd), pos === null || Number.isNaN(pos) ? undefined : pos);
    refresh(opt(fd, "courseId"));
  });
}

export async function updateBlockAction(fd: FormData) {
  return attempt(async () => {
    const kind = str(fd, "kind") as BlockKind;
    await blocks.updateBlock(await requireActor(), str(fd, "id"), blockData(kind, fd), opt(fd, "updatedAt") ?? undefined);
    refresh(opt(fd, "courseId"));
  });
}

export async function blockOpAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const id = str(fd, "id");
    switch (str(fd, "op")) {
      case "up":
      case "down":
        await blocks.moveBlockStep(actor, id, str(fd, "op") as "up" | "down");
        break;
      case "duplicate":
        await blocks.duplicateBlock(actor, id);
        break;
      case "delete":
        await blocks.deleteBlock(actor, id);
        break;
      case "reorder":
        await blocks.reorderBlocks(actor, str(fd, "lessonId"), json<string[]>(fd, "order") ?? []);
        break;
      default:
        throw new ServiceError("Unknown block operation.");
    }
    refresh(opt(fd, "courseId"));
  });
}

export async function replaceLessonContentAction(fd: FormData) {
  return attempt(async () => {
    const parsed = json<{ kind: BlockKind; data: unknown }[]>(fd, "blocks");
    if (!parsed || !Array.isArray(parsed)) throw new ServiceError("The replacement content is not valid JSON block data.");
    await blocks.replaceLessonContent(await requireActor(), str(fd, "lessonId"), parsed, str(fd, "reason"));
    refresh(opt(fd, "courseId"));
  });
}

// History ---------------------------------------------------------------------

export async function rollbackRevisionAction(fd: FormData) {
  return attempt(async () => {
    await history.rollbackRevision(await requireActor(), str(fd, "revisionId"), str(fd, "reason"));
    refresh(opt(fd, "courseId"));
  });
}

// Assessments -----------------------------------------------------------------

const ASSESSMENT_FIELDS = ["title", "kind", "instructions", "passingScore", "timeLimitMinutes", "maxAttempts", "retakeWaitMinutes", "bankId", "drawCount"];
const ASSESSMENT_FLAGS = ["randomizeQuestions", "randomizeOptions", "showAnswers"];

export async function createAssessmentAction(fd: FormData) {
  return attempt(async () => {
    await assess.createAssessment(await requireActor(), str(fd, "lessonId"), fields(fd, ASSESSMENT_FIELDS, ASSESSMENT_FLAGS));
    refresh(opt(fd, "courseId"));
  });
}

export async function updateAssessmentAction(fd: FormData) {
  return attempt(async () => {
    await assess.updateAssessment(await requireActor(), str(fd, "id"), fields(fd, ASSESSMENT_FIELDS, ASSESSMENT_FLAGS), opt(fd, "reason") ?? undefined);
    refresh(opt(fd, "courseId"));
  });
}

export async function archiveAssessmentAction(fd: FormData) {
  return attempt(async () => {
    await assess.setAssessmentArchived(await requireActor(), str(fd, "id"), bool(fd, "archived"));
    refresh(opt(fd, "courseId"));
  });
}

export async function saveQuestionAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const payload = json(fd, "payload");
    if (!payload) throw new ServiceError("The question could not be read. Try again.");
    const id = opt(fd, "id");
    if (id) await assess.updateQuestion(actor, id, payload);
    else {
      const quizId = opt(fd, "quizId");
      const bankId = opt(fd, "bankId");
      await assess.addQuestion(actor, quizId ? { quizId } : { bankId: bankId! }, payload);
    }
    refresh(opt(fd, "courseId"));
    revalidatePath("/admin/content/banks", "layout");
  });
}

export async function questionOpAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const id = str(fd, "id");
    switch (str(fd, "op")) {
      case "up":
      case "down":
        await assess.moveQuestionStep(actor, id, str(fd, "op") as "up" | "down");
        break;
      case "duplicate":
        await assess.duplicateQuestion(actor, id);
        break;
      case "to-bank":
        await assess.duplicateQuestion(actor, id, { bankId: str(fd, "bankId") });
        break;
      case "remove":
        await assess.removeQuestion(actor, id);
        break;
      default:
        throw new ServiceError("Unknown question operation.");
    }
    refresh(opt(fd, "courseId"));
    revalidatePath("/admin/content/banks", "layout");
  });
}

export async function bankAction(fd: FormData) {
  return attempt(async () => {
    const actor = await requireActor();
    const data = fields(fd, ["title", "competency", "description"]);
    switch (str(fd, "op")) {
      case "create": {
        const b = await assess.createBank(actor, data);
        revalidatePath("/admin/content/banks", "layout");
        return { id: b.id };
      }
      case "update":
        await assess.updateBank(actor, str(fd, "id"), data);
        break;
      case "archive":
        await assess.setBankArchived(actor, str(fd, "id"), true);
        break;
      case "restore":
        await assess.setBankArchived(actor, str(fd, "id"), false);
        break;
    }
    revalidatePath("/admin/content/banks", "layout");
    return { id: str(fd, "id") };
  });
}

// Media -----------------------------------------------------------------------

export async function uploadMediaAction(fd: FormData) {
  return attempt(async () => {
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new ServiceError("Choose a file to upload.");
    const asset = await media.uploadMedia(await requireActor(), file, { title: str(fd, "title"), altText: opt(fd, "altText"), isPublic: bool(fd, "isPublic") });
    revalidatePath("/admin/content/media");
    return { id: asset.id };
  });
}

export async function updateMediaAction(fd: FormData) {
  return attempt(async () => {
    await media.updateMedia(await requireActor(), str(fd, "id"), { title: str(fd, "title"), altText: opt(fd, "altText"), isPublic: bool(fd, "isPublic") });
    revalidatePath("/admin/content/media");
  });
}

export async function archiveMediaAction(fd: FormData) {
  return attempt(async () => {
    await media.setMediaArchived(await requireActor(), str(fd, "id"), bool(fd, "archived"));
    revalidatePath("/admin/content/media");
  });
}

export async function importCourseAction(fd: FormData) {
  return attempt(async () => {
    const file = fd.get("file");
    if (!(file instanceof File) || !file.size) throw new ServiceError("Choose a course export file (.json).");
    if (file.size > 2_000_000) throw new ServiceError("That file is larger than 2 MB.");
    const { importCourse } = await import("@/lib/services/cms/transfer");
    const { course, warnings } = await importCourse(await requireActor(), str(fd, "levelId"), await file.text());
    revalidatePath("/admin/content", "layout");
    return { id: course.id, href: `/admin/content/courses/${course.id}`, warnings };
  });
}

export async function bulkLessonStateAction(fd: FormData) {
  return attempt(async () => {
    const n = await structure.bulkLessonState(await requireActor(), str(fd, "courseId"), fd.getAll("lessonId").map(String), state(fd));
    refresh(str(fd, "courseId"));
    return { changed: n };
  });
}
