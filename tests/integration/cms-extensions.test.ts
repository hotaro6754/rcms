import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorisationError } from "@/lib/errors";
import * as structure from "@/lib/services/cms/structure";
import { runScheduledExpiries, releaseReadiness } from "@/lib/services/cms/release";
import { completeLesson, enrolFree } from "@/lib/services/learning/progress";
import { listBookmarks, toggleBookmark } from "@/lib/services/learning/bookmarks";
import { getPublishedCourse } from "@/lib/services/learning/catalog";
import { enrol, makeCourseDraft, makeUser, releaseCourse, resetDb, staff } from "../helpers";

beforeEach(resetDb);

const fresh = (id: string) => prisma.module.findUniqueOrThrow({ where: { id } });

describe("module prerequisites", () => {
  it("locks a module until its prerequisite is complete, on the server", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 2, lessons: 1 });
    const [m1, m2] = modules;
    await expect(structure.updateModule(author, m1.id, { title: m1.title, prerequisiteModuleId: m1.id }, (await fresh(m1.id)).lockVersion)).rejects.toThrow(/cannot require itself/);
    await structure.updateModule(author, m2.id, { title: m2.title, prerequisiteModuleId: m1.id }, (await fresh(m2.id)).lockVersion);
    await expect(structure.updateModule(author, m1.id, { title: m1.title, prerequisiteModuleId: m2.id }, (await fresh(m1.id)).lockVersion)).rejects.toThrow(/loop/);
    await releaseCourse(course.id, author);
    expect((await getPublishedCourse(course.slug))!.snapshot.modules[1].prerequisiteModuleId).toBe(m1.id);

    const learner = await makeUser();
    await enrol(learner.id, course.id);
    await expect(completeLesson(learner, m2.lessons[0].id)).rejects.toThrow(/Finish/);
    await completeLesson(learner, m1.lessons[0].id);
    await expect(completeLesson(learner, m2.lessons[0].id)).resolves.toMatchObject({ alreadyDone: false });
  });
});

describe("course prerequisites, expiry and templates", () => {
  it("requires the prerequisite certificate before free enrolment", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course: base } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const { course: advanced } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await releaseCourse(base.id, author);
    const adv = await prisma.program.findUniqueOrThrow({ where: { id: advanced.id } });
    await structure.updateCourse(author, advanced.id, { name: adv.name, levelId: adv.levelId, requiresCourseId: base.id, isFree: true, effectiveDate: "2026-01-01", reviewDate: "2027-01-01" }, adv.lockVersion);
    await releaseCourse(advanced.id, author);
    const learner = await makeUser();
    await expect(enrolFree(learner, advanced.id)).rejects.toThrow(/claim its certificate first/);
    await prisma.certificate.create({ data: { serial: "RCMS-L1-TEST-TEST-0001", userId: learner.id, programId: base.id, programName: "Base", holderName: learner.name } });
    await expect(enrolFree(learner, advanced.id)).resolves.toMatchObject({ source: "FREE" });
  });

  it("withdraws a course when its expiry passes and refuses to release a template", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await releaseCourse(course.id, author);
    await prisma.program.update({ where: { id: course.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await runScheduledExpiries()).toEqual([course.id]);
    expect(await getPublishedCourse(course.slug)).toBeNull();
    expect((await releaseReadiness(course.id)).join(" ")).toMatch(/expiry date has passed/);

    const { course: tpl } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const t = await prisma.program.findUniqueOrThrow({ where: { id: tpl.id } });
    await structure.updateCourse(author, tpl.id, { name: t.name, levelId: t.levelId, isTemplate: "true", effectiveDate: "2026-01-01", reviewDate: "2027-01-01" }, t.lockVersion);
    expect((await releaseReadiness(tpl.id)).join(" ")).toMatch(/This is a template/);
    const copy = await structure.duplicateCourse(author, tpl.id);
    expect((await prisma.program.findUniqueOrThrow({ where: { id: copy.id } })).isTemplate).toBe(false);
  });

  it("blocks release of a compliance-sensitive course with a lesson past its review date", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 1, complianceSensitive: true });
    const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: modules[0].lessons[0].id } });
    await expect(structure.updateLesson(author, lesson.id, { title: lesson.title, lastReviewedAt: "2026-02-01", nextReviewAt: "2026-01-01" }, lesson.lockVersion)).rejects.toThrow(/after the last one/);
    await structure.updateLesson(author, lesson.id, { title: lesson.title, lastReviewedAt: "2025-01-01", nextReviewAt: "2025-06-01", sources: "CMS Claims Processing Manual, Ch. 12 (2025)" }, lesson.lockVersion);
    expect((await releaseReadiness(course.id)).join(" ")).toMatch(/past its next review date/);
    const l2 = await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } });
    expect(l2.sources).toEqual(["CMS Claims Processing Manual, Ch. 12 (2025)"]);
    await structure.updateLesson(author, lesson.id, { title: lesson.title, lastReviewedAt: "2026-09-01", nextReviewAt: "2027-09-01" }, l2.lockVersion);
    await releaseCourse(course.id, author);
    const snap = (await getPublishedCourse(course.slug))!.snapshot;
    expect(snap.modules[0].lessons[0].sources).toEqual(["CMS Claims Processing Manual, Ch. 12 (2025)"]);
  });
});

describe("bookmarks", () => {
  it("saves released lessons for enrolled learners only", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await releaseCourse(course.id, author);
    const lessonId = modules[0].lessons[0].id;
    const outsider = await makeUser();
    await expect(toggleBookmark(outsider, lessonId)).rejects.toThrow(/Enrol/);
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    expect(await toggleBookmark(learner, lessonId)).toBe(true);
    expect((await listBookmarks(learner.id)).map((b) => b.lessonId)).toEqual([lessonId]);
    expect(await toggleBookmark(learner, lessonId)).toBe(false);
    expect(await listBookmarks(learner.id)).toEqual([]);
    // Authoring permissions are still required for structure changes.
    await expect(structure.updateModule(learner, modules[0].id, { title: "x y z" }, 0)).rejects.toBeInstanceOf(AuthorisationError);
  });
});

describe("bulk lesson state", () => {
  it("changes every selected lesson or none of them", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 2 });
    const [a, b] = modules[0].lessons;
    expect(await structure.bulkLessonState(author, course.id, [a.id, b.id, a.id], "DRAFT")).toBe(2);
    expect((await prisma.lesson.findMany({ where: { id: { in: [a.id, b.id] } } })).every((l) => l.state === "DRAFT")).toBe(true);

    const empty = await structure.createLesson(author, modules[0].id, { title: "Empty lesson" });
    await expect(structure.bulkLessonState(author, course.id, [a.id, b.id, empty.id], "PUBLISHED")).rejects.toThrow(/Add content/);
    expect((await prisma.lesson.findMany({ where: { id: { in: [a.id, b.id] } } })).every((l) => l.state === "DRAFT")).toBe(true);

    const { modules: other } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await expect(structure.bulkLessonState(author, course.id, [a.id, other[0].lessons[0].id], "DRAFT")).rejects.toThrow();
    const learner = await makeUser();
    await expect(structure.bulkLessonState(learner, course.id, [a.id], "DRAFT")).rejects.toBeInstanceOf(AuthorisationError);
  });
});
