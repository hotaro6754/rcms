import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import * as structure from "@/lib/services/cms/structure";
import * as blocks from "@/lib/services/cms/blocks";
import * as release from "@/lib/services/cms/release";
import * as history from "@/lib/services/cms/history";
import * as assessments from "@/lib/services/cms/assessments";
import { getPublishedCourse } from "@/lib/services/learning/catalog";
import { completeLesson, progressFor } from "@/lib/services/learning/progress";
import { enrol, makeCourseDraft, makeUser, releaseCourse, resetDb, staff } from "../helpers";

beforeEach(resetDb);

describe("CMS: building a course from the interface", () => {
  it("creates a course with modules, nested lessons and several blocks, and reorders them", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 2, lessons: 3 });
    const lesson = modules[0].lessons[0];
    await blocks.addBlock(author, lesson.id, "HEADING", { text: "Why eligibility comes first", level: 2 });
    await blocks.addBlock(author, lesson.id, "CALLOUT", { tone: "compliance", text: "Validate against current payer policy." });
    await blocks.addBlock(author, lesson.id, "STEPS", { steps: ["Verify coverage", "Check benefits", "Record the reference"] });

    const draft = await prisma.contentBlock.findMany({ where: { lessonId: lesson.id }, orderBy: { sortOrder: "asc" } });
    expect(draft.map((b) => b.kind)).toEqual(["TEXT", "HEADING", "CALLOUT", "STEPS"]);

    await blocks.reorderBlocks(author, lesson.id, [draft[3].id, draft[0].id, draft[1].id, draft[2].id]);
    const reordered = await prisma.contentBlock.findMany({ where: { lessonId: lesson.id }, orderBy: { sortOrder: "asc" } });
    expect(reordered[0].kind).toBe("STEPS");

    const ids = modules.map((m) => m.id).reverse();
    await structure.reorderModules(author, course.id, ids);
    const mods = await prisma.module.findMany({ where: { programId: course.id }, orderBy: { sortOrder: "asc" } });
    expect(mods.map((m) => m.id)).toEqual(ids);

    await structure.moveLessonStep(author, modules[1].lessons[2].id, "up");
    const lessons = await prisma.lesson.findMany({ where: { moduleId: modules[1].id }, orderBy: { sortOrder: "asc" } });
    expect(lessons[1].id).toBe(modules[1].lessons[2].id);

    const course2 = await prisma.program.findUniqueOrThrow({ where: { id: course.id } });
    expect(course2.status).toBe("IN_DEVELOPMENT");
  });

  it("refuses a reorder built from a stale list", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 2, lessons: 1 });
    await expect(structure.reorderModules(author, course.id, [modules[0].id])).rejects.toBeInstanceOf(ServiceError);
  });

  it("moves a lesson to another module and keeps both orders contiguous", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { modules } = await makeCourseDraft(author, { modules: 2, lessons: 2 });
    const moving = modules[0].lessons[0];
    const res = await structure.moveLessonToModule(author, moving.id, modules[1].id, 0);
    expect(res.moved).toBe(true);
    const target = await prisma.lesson.findMany({ where: { moduleId: modules[1].id }, orderBy: { sortOrder: "asc" } });
    expect(target.map((l) => l.sortOrder)).toEqual([0, 1, 2]);
    expect(target[0].id).toBe(moving.id);
    const source = await prisma.lesson.findMany({ where: { moduleId: modules[0].id }, orderBy: { sortOrder: "asc" } });
    expect(source.map((l) => l.sortOrder)).toEqual([0]);
  });

  it("duplicates a module without sharing mutable child records", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { modules } = await makeCourseDraft(author, { modules: 1, lessons: 2 });
    const lessonId = modules[0].lessons[0].id;
    const quiz = await assessments.createAssessment(author, lessonId, { title: "Check", passingScore: 70 });
    await assessments.addQuestion(author, { quizId: quiz.id }, { type: "SINGLE", prompt: "Which form is used for professional claims?", options: ["CMS-1500", "UB-04"], answerKey: { index: 0 } });

    const copy = await structure.duplicateModule(author, modules[0].id);
    const copied = await prisma.lesson.findMany({ where: { moduleId: copy.id }, include: { blocks: true, quizzes: { include: { questions: true } } }, orderBy: { sortOrder: "asc" } });
    expect(copied).toHaveLength(2);
    expect(copied[0].id).not.toBe(lessonId);
    expect(copied[0].blocks[0].id).not.toBe((await prisma.contentBlock.findFirstOrThrow({ where: { lessonId } })).id);
    expect(copied[0].quizzes[0].id).not.toBe(quiz.id);

    // Editing the copy leaves the original untouched.
    await blocks.updateBlock(author, copied[0].blocks[0].id, { text: "Changed in the copy only." });
    const original = await prisma.contentBlock.findFirstOrThrow({ where: { lessonId } });
    expect((original.data as { text: string }).text).toContain("Synthetic");
  });

  it("replaces lesson content keeping the lesson's identity, and records why", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const id = modules[0].lessons[0].id;
    await expect(blocks.replaceLessonContent(author, id, [{ kind: "TEXT", data: { text: "New" } }], "")).rejects.toBeInstanceOf(ServiceError);
    await blocks.replaceLessonContent(author, id, [{ kind: "TEXT", data: { text: "Rewritten for the 2026 rules." } }, { kind: "LINK", data: { url: "https://www.cms.gov", label: "CMS" } }], "Annual refresh");
    const after = await prisma.contentBlock.findMany({ where: { lessonId: id } });
    expect(after).toHaveLength(2);
    const rev = await prisma.contentRevision.findFirstOrThrow({ where: { entityId: id }, orderBy: { version: "desc" } });
    expect(rev.reason).toContain("Annual refresh");
  });

  it("refuses content containing identifiers", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await expect(blocks.addBlock(author, modules[0].lessons[0].id, "TEXT", { text: "Member SSN 123-45-6789" })).rejects.toThrow(/synthetic/);
  });
});

describe("CMS: review, publication and learner visibility", () => {
  it("blocks unauthorised and self-approval, then releases an immutable snapshot", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course } = await makeCourseDraft(author);

    // A content administrator cannot publish or review.
    await expect(release.publishCourse(author, course.id)).rejects.toBeInstanceOf(AuthorisationError);
    await expect(release.reviewAcademic(author, course.id, true)).rejects.toBeInstanceOf(AuthorisationError);

    await release.submitForReview(author, course.id);
    // Locked while in review.
    await expect(structure.createModule(author, course.id, { title: "Sneaky change" })).rejects.toThrow(/locked/);

    // Someone holding both review roles still cannot review their own submission.
    const both = await makeUser({ staff: ["CONTENT_ADMIN", "ACADEMIC_REVIEWER"] });
    const { course: other } = await makeCourseDraft(both);
    await release.submitForReview(both, other.id);
    await expect(release.reviewAcademic(both, other.id, true)).rejects.toThrow(/Another reviewer/);

    const academic = await staff("ACADEMIC_REVIEWER");
    const compliance = await staff("COMPLIANCE_REVIEWER");
    expect(await release.reviewAcademic(academic, course.id, true)).toBe("COMPLIANCE_REVIEW");
    // Not yet approved by compliance: publishing is refused.
    const director = await staff("ACADEMY_DIRECTOR");
    await expect(release.publishCourse(director, course.id)).rejects.toThrow(/cannot be published/);
    await release.reviewCompliance(compliance, course.id, true);
    const res = await release.publishCourse(director, course.id);
    expect(res.scheduled).toBe(false);

    const live = await getPublishedCourse((await prisma.program.findUniqueOrThrow({ where: { id: course.id } })).slug);
    expect(live?.version).toBe(1);
    expect(live?.snapshot.modules).toHaveLength(2);
  });

  it("keeps learners on the released version while the draft changes", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author);
    await releaseCourse(course.id, author);
    const slug = (await prisma.program.findUniqueOrThrow({ where: { id: course.id } })).slug;

    const block = await prisma.contentBlock.findFirstOrThrow({ where: { lessonId: modules[0].lessons[0].id } });
    await blocks.updateBlock(author, block.id, { text: "Draft edit not yet reviewed." });
    const extra = await structure.createLesson(author, modules[0].id, { title: "Unreleased lesson" });

    const fresh = await prisma.program.findUniqueOrThrow({ where: { id: course.id } });
    expect(fresh.status).toBe("UNDER_REVISION");
    const live = await getPublishedCourse(slug);
    const lesson = live!.snapshot.modules[0].lessons[0];
    expect((lesson.blocks[0].data as { text: string }).text).toContain("Synthetic");
    expect(live!.snapshot.modules[0].lessons.map((l) => l.id)).not.toContain(extra.id);
  });

  it("keeps learner progress consistent after a content update", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 2 });
    await releaseCourse(course.id, author);
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    await completeLesson(learner, modules[0].lessons[0].id);

    // Add a lesson and release again: the completed lesson stays complete, the new one is open.
    const added = await structure.createLesson(author, modules[0].id, { title: "New lesson" });
    await blocks.addBlock(author, added.id, "TEXT", { text: "More synthetic text." });
    await structure.setLessonState(author, added.id, "PUBLISHED");
    await releaseCourse(course.id, author);
    const live = await getPublishedCourse((await prisma.program.findUniqueOrThrow({ where: { id: course.id } })).slug);
    expect(live!.version).toBe(2);
    const p = await progressFor(learner.id, live!.snapshot);
    expect(p.lessonsTotal).toBe(3);
    expect(p.lessonsDone).toBe(1);
  });

  it("archives and restores, and refuses deletion of lessons with learner history", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 2 });
    await releaseCourse(course.id, author);
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    await completeLesson(learner, modules[0].lessons[0].id);

    await expect(structure.deleteLesson(author, modules[0].lessons[0].id)).rejects.toThrow(/Archive it instead/);
    await structure.setLessonState(author, modules[0].lessons[0].id, "ARCHIVED");
    expect((await prisma.lesson.findUniqueOrThrow({ where: { id: modules[0].lessons[0].id } })).state).toBe("ARCHIVED");
    // A content administrator holds archive permission and may restore.
    await structure.setLessonState(author, modules[0].lessons[0].id, "PUBLISHED");

    const director = await staff("ACADEMY_DIRECTOR");
    await release.archiveCourse(director, course.id, "Superseded by the 2027 edition");
    expect(await getPublishedCourse((await prisma.program.findUniqueOrThrow({ where: { id: course.id } })).slug)).toBeNull();
    await expect(structure.createModule(author, course.id, { title: "Another module" })).rejects.toThrow(/archived/);
    await release.restoreCourse(director, course.id);
    const restored = await prisma.program.findUniqueOrThrow({ where: { id: course.id } });
    expect(restored.status).toBe("UNDER_REVISION");
    expect(await prisma.progress.count({ where: { userId: learner.id } })).toBe(1);
  });

  it("rolls back a lesson to an earlier revision and a course to an earlier release", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const lessonId = modules[0].lessons[0].id;
    const block = await prisma.contentBlock.findFirstOrThrow({ where: { lessonId } });
    const revs0 = await history.listRevisions("Lesson", lessonId);
    await blocks.updateBlock(author, block.id, { text: "Second wording." });
    await history.rollbackRevision(author, revs0[0].id, "Second wording was wrong");
    const after = await prisma.contentBlock.findFirstOrThrow({ where: { lessonId } });
    expect((after.data as { text: string }).text).toContain("Synthetic");
    const revs = await history.listRevisions("Lesson", lessonId);
    expect(revs[0].reason).toContain("Restored version");

    await releaseCourse(course.id, author);
    await blocks.updateBlock(author, after.id, { text: "Version two wording." });
    await releaseCourse(course.id, author);
    const v1 = await prisma.courseVersion.findFirstOrThrow({ where: { courseId: course.id, version: 1 } });
    const director = await staff("ACADEMY_DIRECTOR");
    await release.rollbackToVersion(director, course.id, v1.id, "v2 had an error");
    const live = await getPublishedCourse((await prisma.program.findUniqueOrThrow({ where: { id: course.id } })).slug);
    expect(live!.version).toBe(3);
    expect((live!.snapshot.modules[0].lessons[0].blocks[0].data as { text: string }).text).toContain("Synthetic");
  });

  it("schedules publication and releases it when due", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course } = await makeCourseDraft(author, { complianceSensitive: false });
    const academic = await staff("ACADEMIC_REVIEWER");
    const director = await staff("ACADEMY_DIRECTOR");
    await release.submitForReview(author, course.id);
    expect(await release.reviewAcademic(academic, course.id, true)).toBe("APPROVED");
    const when = new Date(Date.now() + 3600_000);
    expect((await release.publishCourse(director, course.id, when)).scheduled).toBe(true);
    expect(await release.runScheduledPublications(new Date())).toEqual([]);
    expect(await release.runScheduledPublications(new Date(when.getTime() + 1000))).toEqual([course.id]);
    expect((await prisma.program.findUniqueOrThrow({ where: { id: course.id } })).status).toBe("PUBLISHED");
  });

  it("refuses to submit an incomplete course and explains why", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await structure.setLessonState(author, modules[0].lessons[0].id, "DRAFT");
    await expect(release.submitForReview(author, course.id)).rejects.toThrow(/no lessons marked ready/);
  });
});

describe("CMS: authorisation at the service layer", () => {
  it("rejects every write from a learner and a support agent, and logs the refusal", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    for (const who of [await makeUser(), await staff("SUPPORT_AGENT"), await staff("AUDITOR")]) {
      await expect(structure.createModule(who, course.id, { title: "Nope" })).rejects.toBeInstanceOf(AuthorisationError);
      await expect(blocks.addBlock(who, modules[0].lessons[0].id, "TEXT", { text: "Nope" })).rejects.toBeInstanceOf(AuthorisationError);
      await expect(structure.deleteLesson(who, modules[0].lessons[0].id)).rejects.toBeInstanceOf(AuthorisationError);
      await expect(release.submitForReview(who, course.id)).rejects.toBeInstanceOf(AuthorisationError);
    }
    const denied = await prisma.auditLog.count({ where: { outcome: "denied" } });
    expect(denied).toBe(12);
  });

  it("writes audit rows for sensitive CMS actions and the trail cannot be edited", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await releaseCourse(course.id, author);
    const actions = (await prisma.auditLog.findMany({ where: { entityId: course.id }, select: { action: true } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["create", "update", "submit", "approve", "publish"]));
    const row = await prisma.auditLog.findFirstOrThrow();
    await expect(prisma.auditLog.update({ where: { id: row.id }, data: { action: "tampered" } })).rejects.toThrow(/append-only/);
    await expect(prisma.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(/append-only/);
  });

  it("detects a conflicting edit to the same course", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, level } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const stale = (await prisma.program.findUniqueOrThrow({ where: { id: course.id } })).lockVersion;
    await structure.updateCourse(author, course.id, { name: "First editor", levelId: level.id }, stale);
    await expect(structure.updateCourse(author, course.id, { name: "Second editor", levelId: level.id }, stale)).rejects.toThrow(/Someone else saved/);
  });
});

describe("course export and import", () => {
  it("round-trips a course as a new draft, refuses PHI, and needs the import permission", async () => {
    const { exportCourse, importCourse } = await import("@/lib/services/cms/transfer");
    const author = await staff("CONTENT_ADMIN");
    const { course, level } = await makeCourseDraft(author, { modules: 2, lessons: 2 });
    const doc = await exportCourse(author, course.id);
    expect(doc.modules).toHaveLength(2);
    const raw = JSON.stringify(doc);

    const { course: copy, warnings } = await importCourse(author, level.id, raw);
    expect(warnings).toEqual([]);
    const imported = await prisma.program.findUniqueOrThrow({ where: { id: copy.id }, include: { modules: { include: { lessons: { include: { blocks: true } } } } } });
    expect(imported.status).toBe("DRAFT");
    expect(imported.publishedVersionId).toBeNull();
    expect(imported.modules.flatMap((m) => m.lessons)).toHaveLength(4);
    expect(imported.modules[0].lessons[0].blocks[0].data).toMatchObject({ text: expect.stringContaining("Synthetic lesson text") });

    const poisoned = JSON.parse(raw);
    poisoned.modules[0].lessons[0].blocks.push({ kind: "TEXT", data: { text: "Patient SSN 123-45-6789 denied" } });
    await expect(importCourse(author, level.id, JSON.stringify(poisoned))).rejects.toThrow(/synthetic, de-identified/);
    await expect(importCourse(author, level.id, "{not json")).rejects.toThrow(/not JSON/);
    await expect(importCourse(author, level.id, JSON.stringify({ ...doc, format: "other" }))).rejects.toThrow(/not a valid course export/);

    const reviewer = await staff("ACADEMIC_REVIEWER");
    await expect(importCourse(reviewer, level.id, raw)).rejects.toBeInstanceOf(AuthorisationError);
    await expect(exportCourse(await staff("SUPPORT_AGENT"), course.id)).rejects.toBeInstanceOf(AuthorisationError);
  });
});
