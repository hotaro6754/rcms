import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import * as assessments from "@/lib/services/cms/assessments";
import * as structure from "@/lib/services/cms/structure";
import { startAttempt, submitAttempt, attemptForTaking, gradeManually, saveAnswers } from "@/lib/services/learning/attempts";
import { completeLesson, enrolFree } from "@/lib/services/learning/progress";
import { claimCertificate, revokeCertificate, reissueCertificate, issueCertificate } from "@/lib/services/learning/certificates";
import { eligibility } from "@/lib/certificates";
import { enrol, makeCourseDraft, makeUser, releaseCourse, resetDb, staff } from "../helpers";
import type { LearnerQuestion } from "@/lib/assessment/questions";

beforeEach(resetDb);

async function courseWithAssessment(opts: { maxAttempts?: number | null; retakeWaitMinutes?: number; timeLimitMinutes?: number | null; manual?: boolean; completeByPass?: boolean } = {}) {
  const author = await staff("CONTENT_ADMIN");
  const built = await makeCourseDraft(author, { modules: 1, lessons: 2 });
  const lesson = built.modules[0].lessons[1];
  const quiz = await assessments.createAssessment(author, lesson.id, {
    title: "Foundation check",
    passingScore: 70,
    maxAttempts: opts.maxAttempts ?? null,
    retakeWaitMinutes: opts.retakeWaitMinutes ?? 0,
    timeLimitMinutes: opts.timeLimitMinutes ?? null,
  });
  await assessments.addQuestion(author, { quizId: quiz.id }, { type: "SINGLE", prompt: "Which form carries a professional claim?", options: ["CMS-1500", "UB-04", "W-9"], answerKey: { index: 0 }, competency: "Claims" });
  await assessments.addQuestion(author, { quizId: quiz.id }, { type: "SEQUENCE", prompt: "Order the claim lifecycle", options: ["Eligibility", "Charge capture", "Claim submission", "Payment posting"], competency: "Lifecycle" });
  await assessments.addQuestion(author, { quizId: quiz.id }, { type: "MATCHING", prompt: "Match the group code", options: ["CO", "PR"], targets: ["Contractual obligation", "Patient responsibility"], answerKey: { pairs: [0, 1] } });
  if (opts.manual) await assessments.addQuestion(author, { quizId: quiz.id }, { type: "SHORT_ANSWER", prompt: "Explain why a CO-16 denial happens.", points: 2 });
  if (opts.completeByPass) {
    const l = await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } });
    await structure.updateLesson(author, lesson.id, { title: l.title, completionRule: "ASSESSMENT_PASS" }, l.lockVersion);
  }
  await releaseCourse(built.course.id, author);
  return { ...built, quiz, lesson, author };
}

/** Builds correct (or deliberately wrong) answers from what the learner's page receives. */
function answersFor(questions: LearnerQuestion[], snapshotAnswers: (q: LearnerQuestion) => unknown) {
  return Object.fromEntries(questions.map((q) => [q.id, snapshotAnswers(q)]));
}

async function rightAnswers(attemptId: string) {
  const a = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  const snap = a.snapshot as { questions: { id: string; type: string; optionTokens: string[]; targetTokens: string[]; answerKey: Record<string, number | number[]> }[] };
  const out: Record<string, unknown> = {};
  for (const q of snap.questions) {
    if (q.type === "SINGLE") out[q.id] = q.optionTokens[q.answerKey.index as number];
    if (q.type === "SEQUENCE") out[q.id] = (q.answerKey.order as number[]).map((i) => q.optionTokens[i]);
    if (q.type === "MATCHING") out[q.id] = Object.fromEntries((q.answerKey.pairs as number[]).map((t, i) => [q.optionTokens[i], q.targetTokens[t]]));
    if (q.type === "SHORT_ANSWER") out[q.id] = "Synthetic answer: the payer could not process the claim as submitted.";
  }
  return out;
}

describe("assessments", () => {
  it("serves questions without answer keys and grades on the server", async () => {
    const { course, quiz } = await courseWithAssessment();
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    const attemptId = await startAttempt(learner, quiz.id);
    const view = await attemptForTaking(learner, attemptId);
    const serialised = JSON.stringify(view);
    expect(serialised).not.toMatch(/answerKey|"index"|"pairs"|"order"|rationale/);
    expect(view.questions).toHaveLength(3);

    const result = await submitAttempt(learner, attemptId, await rightAnswers(attemptId));
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.rows.every((r) => r.correct)).toBe(true);
  });

  it("refuses learners who are not enrolled and forged answer tokens score nothing", async () => {
    const { course, quiz } = await courseWithAssessment();
    const outsider = await makeUser();
    await expect(startAttempt(outsider, quiz.id)).rejects.toThrow(/Enrol/);
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    const attemptId = await startAttempt(learner, quiz.id);
    const view = await attemptForTaking(learner, attemptId);
    const forged = answersFor(view.questions, () => "forged");
    const res = await submitAttempt(learner, attemptId, forged);
    expect(res.score).toBe(0);
    // Someone else's attempt is invisible.
    await expect(submitAttempt(outsider, attemptId, {})).rejects.toThrow(/not found/);
  });

  it("grades a double submission once", async () => {
    const { course, quiz } = await courseWithAssessment();
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    const attemptId = await startAttempt(learner, quiz.id);
    const right = await rightAnswers(attemptId);
    const [a, b] = await Promise.all([submitAttempt(learner, attemptId, right), submitAttempt(learner, attemptId, {})]);
    expect(a.score).toBe(b.score);
    expect(await prisma.auditLog.count({ where: { entity: "QuizAttempt", action: "grade", entityId: attemptId } })).toBe(1);
  });

  it("enforces attempt limits and retake waits", async () => {
    const { course, quiz } = await courseWithAssessment({ maxAttempts: 2 });
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    await submitAttempt(learner, await startAttempt(learner, quiz.id), {});
    await submitAttempt(learner, await startAttempt(learner, quiz.id), {});
    await expect(startAttempt(learner, quiz.id)).rejects.toThrow(/used all 2 attempts/);

    const second = await courseWithAssessment({ retakeWaitMinutes: 60 });
    await enrol(learner.id, second.course.id);
    await submitAttempt(learner, await startAttempt(learner, second.quiz.id), {});
    await expect(startAttempt(learner, second.quiz.id)).rejects.toThrow(/retake/);
  });

  it("ignores answers that arrive after the time limit", async () => {
    const { course, quiz } = await courseWithAssessment({ timeLimitMinutes: 5 });
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    const attemptId = await startAttempt(learner, quiz.id);
    const right = await rightAnswers(attemptId);
    await prisma.quizAttempt.update({ where: { id: attemptId }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    await expect(saveAnswers(learner, attemptId, right)).rejects.toThrow(/Time is up/);
    const res = await submitAttempt(learner, attemptId, right);
    expect(res.status).toBe("EXPIRED");
    expect(res.score).toBe(0);
  });

  it("holds written answers for a reviewer, who cannot be the learner, and completes the lesson on a pass", async () => {
    const { course, quiz, lesson } = await courseWithAssessment({ manual: true, completeByPass: true });
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    await expect(completeLesson(learner, lesson.id)).rejects.toThrow(/passing its assessment|pass its assessment/);
    const attemptId = await startAttempt(learner, quiz.id);
    const res = await submitAttempt(learner, attemptId, await rightAnswers(attemptId));
    expect(res.status).toBe("PENDING_REVIEW");
    expect(res.passed).toBeNull();

    const grader = await staff("ACADEMIC_REVIEWER");
    const manualId = (await prisma.quizQuestion.findFirstOrThrow({ where: { quizId: quiz.id, type: "SHORT_ANSWER" } })).id;
    await expect(gradeManually(learner, attemptId, { [manualId]: 2 })).rejects.toThrow();
    await expect(gradeManually(grader, attemptId, { [manualId]: 9 })).rejects.toBeInstanceOf(ServiceError);
    const graded = await gradeManually(grader, attemptId, { [manualId]: 2 }, "Clear explanation.");
    expect(graded.passed).toBe(true);
    const p = await prisma.progress.findUniqueOrThrow({ where: { userId_lessonId: { userId: learner.id, lessonId: lesson.id } } });
    expect(p.completedAt).not.toBeNull();
  });

  it("keeps a recorded result when the question is later edited", async () => {
    const { course, quiz, author } = await courseWithAssessment();
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    const attemptId = await startAttempt(learner, quiz.id);
    await submitAttempt(learner, attemptId, await rightAnswers(attemptId));
    const q = await prisma.quizQuestion.findFirstOrThrow({ where: { quizId: quiz.id, type: "SINGLE" } });
    await assessments.updateQuestion(author, q.id, { type: "SINGLE", prompt: "Changed prompt after the attempt", options: ["X", "Y"], answerKey: { index: 1 } });
    const stored = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(stored.score).toBe(100);
    expect(JSON.stringify(stored.snapshot)).toContain("Which form carries a professional claim?");
  });
});

describe("certificates", () => {
  it("issues only on verified completion, records the version, and verifies revocation", async () => {
    const { course, quiz, modules } = await courseWithAssessment();
    const learner = await makeUser({ name: "Asha Rao" });
    await enrol(learner.id, course.id);
    await expect(claimCertificate(learner, course.id)).rejects.toThrow(/Finish every lesson/);

    for (const l of modules[0].lessons) await completeLesson(learner, l.id);
    expect((await eligibility(learner.id, course.id)).eligible).toBe(false);
    const attemptId = await startAttempt(learner, quiz.id);
    await submitAttempt(learner, attemptId, await rightAnswers(attemptId));
    expect((await eligibility(learner.id, course.id)).eligible).toBe(true);

    const { serial } = await claimCertificate(learner, course.id);
    const again = await claimCertificate(learner, course.id);
    expect(again.serial).toBe(serial);
    const cert = await prisma.certificate.findUniqueOrThrow({ where: { serial } });
    expect(cert.courseVersion).toBe(1);
    expect(cert.holderName).toBe("Asha Rao");

    const admin = await staff("SUBSCRIBER_ADMIN");
    await expect(revokeCertificate(await staff("SUPPORT_AGENT"), cert.id, "Wrong person")).rejects.toThrow(/permission/);
    await revokeCertificate(admin, cert.id, "Name was misspelled at issue");
    const reissued = await reissueCertificate(admin, cert.id);
    expect(reissued.serial).not.toBe(serial);
    // The revoked serial still resolves, marked revoked.
    expect((await prisma.certificate.findUniqueOrThrow({ where: { serial } })).revokedAt).not.toBeNull();
  });

  it("awards the level badge once every course in the level is certified", async () => {
    const { course, quiz, modules, level } = await courseWithAssessment();
    await prisma.learningLevel.update({ where: { id: level.id }, data: { badgeName: "Foundation badge", status: "PUBLISHED" } });
    const learner = await makeUser();
    await enrol(learner.id, course.id);
    for (const l of modules[0].lessons) await completeLesson(learner, l.id);
    const attemptId = await startAttempt(learner, quiz.id);
    await submitAttempt(learner, attemptId, await rightAnswers(attemptId));
    await claimCertificate(learner, course.id);
    const badge = await prisma.levelBadge.findUnique({ where: { userId_levelId: { userId: learner.id, levelId: level.id } } });
    expect(badge?.name).toBe("Foundation badge");
  });

  it("marks a manual issue as manual when the rule is not met", async () => {
    const { course } = await courseWithAssessment();
    const learner = await makeUser();
    const res = await issueCertificate(await staff("SUBSCRIBER_ADMIN"), learner.id, course.id);
    expect((await prisma.certificate.findUniqueOrThrow({ where: { serial: res.serial } })).basis).toBe("manual");
  });
});

describe("enrolment", () => {
  it("lets anyone enrol on a free course and nobody self-enrol on a paid one", async () => {
    const { course } = await courseWithAssessment();
    const learner = await makeUser();
    await expect(enrolFree(learner, course.id)).rejects.toThrow(/purchase or a subscription/);
    await prisma.program.update({ where: { id: course.id }, data: { isFree: true } });
    // The released snapshot decides, not the draft row: still paid until re-released.
    await expect(enrolFree(learner, course.id)).rejects.toThrow(/purchase or a subscription/);
  });
});
