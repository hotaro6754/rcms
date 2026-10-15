import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import {
  describeAnswer,
  gradeAttempt,
  MANUAL_TYPES,
  prepareQuestion,
  shuffle,
  toLearner,
  type AttemptGrade,
  type LearnerQuestion,
  type PreparedQuestion,
  type Response,
} from "@/lib/assessment/questions";
import { findAssessment, flatLessons, type CourseSnapshot } from "@/lib/cms/snapshot";
import { DOCUMENT_TYPES, IMAGE_TYPES, saveChecked } from "@/lib/storage";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";
import { courseAccess, getPublishedCourse } from "./catalog";

/**
 * Assessment attempts: start, autosave, submit, time limits, attempt limits, retake waits,
 * automatic grading, manual grading, results and remediation.
 *
 * Integrity rules:
 * - An attempt is prepared from the *released* course and copied into the attempt row with
 *   its answer key. Grading reads only that copy.
 * - Submission is a conditional update from IN_PROGRESS, so a double submit grades once.
 * - The deadline is enforced here, not in the browser: answers arriving after the time limit
 *   (plus a 30-second network allowance) are ignored and the saved answers are graded.
 */

const GRACE_MS = 30_000;

interface AttemptSnapshot {
  questionIds: string[];
  questions: PreparedQuestion[];
  assessment: {
    id: string;
    title: string;
    passingScore: number;
    showAnswers: boolean;
    timeLimitMinutes: number | null;
    instructions: string | null;
    lessonId: string;
    lessonTitle: string;
    completionRule: string;
    courseId: string;
    courseSlug: string;
  };
}

async function locate(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { lesson: { select: { module: { select: { program: { select: { slug: true } } } } } } } });
  if (!quiz) throw new ServiceError("That assessment no longer exists.");
  const course = await getPublishedCourse(quiz.lesson.module.program.slug);
  const found = course && findAssessment(course.snapshot, quizId);
  if (!course || !found) throw new ServiceError("That assessment is not part of a published course.");
  return { course, ...found };
}

function snapOf(a: { snapshot: Prisma.JsonValue }) {
  return a.snapshot as unknown as AttemptSnapshot;
}

function sanitiseAnswers(snapshot: AttemptSnapshot, answers: unknown): Record<string, Response> {
  const out: Record<string, Response> = {};
  if (!answers || typeof answers !== "object") return out;
  const ids = new Set(snapshot.questionIds);
  for (const [k, v] of Object.entries(answers as Record<string, unknown>)) {
    if (!ids.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 20_000);
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").slice(0, 20) as string[];
    else if (v && typeof v === "object") out[k] = Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, t]) => typeof t === "string").slice(0, 20)) as Record<string, string>;
  }
  return out;
}

export async function startAttempt(actor: Actor, quizId: string) {
  const { course, lesson, assessment } = await locate(quizId);
  const access = await courseAccess(actor, course);
  if (!access.full || !access.tracked) throw new ServiceError("Enrol on the course to take this assessment.");

  const existing = await prisma.quizAttempt.findFirst({ where: { quizId, userId: actor.id, status: "IN_PROGRESS" }, orderBy: { attemptNo: "desc" } });
  if (existing) {
    if (!existing.expiresAt || existing.expiresAt.getTime() + GRACE_MS > Date.now()) return existing.id;
    await finalise(existing.id, actor.id, null);
  }

  const past = await prisma.quizAttempt.findMany({ where: { quizId, userId: actor.id }, orderBy: { attemptNo: "desc" }, select: { attemptNo: true, submittedAt: true } });
  if (assessment.maxAttempts && past.length >= assessment.maxAttempts) {
    throw new ServiceError(`You have used all ${assessment.maxAttempts} attempts on this assessment. Contact support if you need another.`);
  }
  const lastSubmitted = past.find((p) => p.submittedAt)?.submittedAt;
  if (assessment.retakeWaitMinutes && lastSubmitted) {
    const ready = new Date(lastSubmitted.getTime() + assessment.retakeWaitMinutes * 60_000);
    if (ready > new Date()) throw new ServiceError(`You can retake this from ${ready.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}.`);
  }

  let questions = assessment.randomizeQuestions ? shuffle(assessment.questions) : [...assessment.questions];
  if (assessment.drawCount > 0) {
    const own = new Set(questions.map((q) => q.id));
    const drawn = shuffle(assessment.bank.filter((q) => !own.has(q.id))).slice(0, assessment.drawCount);
    questions = assessment.randomizeQuestions ? shuffle([...questions, ...drawn]) : [...questions, ...drawn];
  }
  if (!questions.length) throw new ServiceError("This assessment has no questions yet.");
  const prepared = questions.map((q) => prepareQuestion(q, assessment.randomizeOptions));
  const snapshot: AttemptSnapshot = {
    questionIds: prepared.map((q) => q.id),
    questions: prepared,
    assessment: {
      id: assessment.id,
      title: assessment.title,
      passingScore: assessment.passingScore,
      showAnswers: assessment.showAnswers,
      timeLimitMinutes: assessment.timeLimitMinutes,
      instructions: assessment.instructions,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      completionRule: lesson.completionRule,
      courseId: course.id,
      courseSlug: course.slug,
    },
  };
  const now = new Date();
  try {
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: actor.id,
        attemptNo: (past[0]?.attemptNo ?? 0) + 1,
        status: "IN_PROGRESS",
        snapshot: snapshot as never,
        courseVersion: course.version,
        answers: {},
        startedAt: now,
        expiresAt: assessment.timeLimitMinutes ? new Date(now.getTime() + assessment.timeLimitMinutes * 60_000) : null,
      },
    });
    await audit({ actorId: actor.id, action: "create", entity: "QuizAttempt", entityId: attempt.id, after: { quizId, attemptNo: attempt.attemptNo, courseVersion: course.version } });
    return attempt.id;
  } catch (error) {
    // Two tabs starting at once: the unique (quiz, user, attemptNo) lets exactly one win.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const winner = await prisma.quizAttempt.findFirst({ where: { quizId, userId: actor.id, status: "IN_PROGRESS" } });
      if (winner) return winner.id;
    }
    throw error;
  }
}

async function ownAttempt(actor: Actor, attemptId: string) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== actor.id) throw new ServiceError("That attempt was not found.");
  return attempt;
}

export async function saveAnswers(actor: Actor, attemptId: string, answers: unknown) {
  const attempt = await ownAttempt(actor, attemptId);
  if (attempt.status !== "IN_PROGRESS") throw new ServiceError("This attempt has been submitted.");
  if (attempt.expiresAt && attempt.expiresAt.getTime() + GRACE_MS < Date.now()) throw new ServiceError("Time is up on this attempt.");
  const merged = { ...(attempt.answers as Record<string, Response>), ...sanitiseAnswers(snapOf(attempt), answers) };
  await prisma.quizAttempt.updateMany({ where: { id: attemptId, status: "IN_PROGRESS" }, data: { answers: merged as never } });
}

async function finalise(attemptId: string, userId: string, submitted: Record<string, Response> | null) {
  const attempt = await prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.status !== "IN_PROGRESS") return attempt;
  const snap = snapOf(attempt);
  const now = Date.now();
  const late = !!attempt.expiresAt && now > attempt.expiresAt.getTime() + GRACE_MS;
  const answers = { ...(attempt.answers as Record<string, Response>), ...(late || !submitted ? {} : submitted) };
  const grade = gradeAttempt(snap.questions, answers);
  const status = grade.needsReview ? "PENDING_REVIEW" : late ? "EXPIRED" : "GRADED";
  const passed = grade.needsReview ? null : grade.score >= snap.assessment.passingScore;
  const res = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, status: "IN_PROGRESS" },
    data: {
      status,
      answers: answers as never,
      score: grade.score,
      passed,
      pointsAwarded: grade.pointsAwarded,
      pointsPossible: grade.pointsPossible,
      breakdown: { competencies: grade.breakdown, remediation: grade.remediation, results: grade.results } as never,
      submittedAt: new Date(now),
      gradedAt: grade.needsReview ? null : new Date(now),
    },
  });
  if (res.count === 0) return prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  await audit({ actorId: userId, action: "grade", entity: "QuizAttempt", entityId: attemptId, after: { score: grade.score, passed, status, late } });
  if (passed) await completeViaAssessment(userId, snap);
  if (grade.needsReview) {
    await notifyPermission("assessment.grade", { kind: "grading", title: `${snap.assessment.title} needs marking`, href: `/admin/grading/${attemptId}` }, userId);
  }
  return prisma.quizAttempt.findUniqueOrThrow({ where: { id: attemptId } });
}

async function completeViaAssessment(userId: string, snap: AttemptSnapshot) {
  if (snap.assessment.completionRule !== "ASSESSMENT_PASS") return;
  const now = new Date();
  const done = await prisma.progress.updateMany({ where: { userId, lessonId: snap.assessment.lessonId, completedAt: null }, data: { completedAt: now } });
  if (done.count === 0) {
    await prisma.progress.create({ data: { userId, lessonId: snap.assessment.lessonId, completedAt: now, lastViewedAt: now } }).catch(() => undefined);
  }
}

export async function submitAttempt(actor: Actor, attemptId: string, answers: unknown) {
  const attempt = await ownAttempt(actor, attemptId);
  if (attempt.status === "IN_PROGRESS") await finalise(attemptId, actor.id, sanitiseAnswers(snapOf(attempt), answers));
  return attemptResult(actor, attemptId);
}

export async function uploadAnswerFile(actor: Actor, attemptId: string, questionId: string, file: File) {
  const attempt = await ownAttempt(actor, attemptId);
  if (attempt.status !== "IN_PROGRESS") throw new ServiceError("This attempt has been submitted.");
  if (attempt.expiresAt && attempt.expiresAt.getTime() + GRACE_MS < Date.now()) throw new ServiceError("Time is up on this attempt.");
  const q = snapOf(attempt).questions.find((x) => x.id === questionId);
  if (!q || q.type !== "FILE_UPLOAD") throw new ServiceError("That question does not take a file.");
  let stored;
  try {
    stored = await saveChecked("attempts", file, new Set([...DOCUMENT_TYPES, ...IMAGE_TYPES]));
  } catch (e) {
    throw new ServiceError(e instanceof Error ? e.message : "That upload was refused.");
  }
  const up = await prisma.attemptUpload.create({ data: { attemptId, questionId, fileKey: stored.fileKey, fileName: stored.fileName, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes } });
  await saveAnswers(actor, attemptId, { [questionId]: up.id });
  await audit({ actorId: actor.id, action: "create", entity: "AttemptUpload", entityId: up.id, after: { attemptId, questionId, mimeType: up.mimeType, sizeBytes: up.sizeBytes } });
  return { id: up.id, fileName: up.fileName };
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export interface AttemptView {
  id: string;
  status: string;
  attemptNo: number;
  title: string;
  instructions: string | null;
  passingScore: number;
  expiresAt: string | null;
  questions: LearnerQuestion[];
  answers: Record<string, Response>;
  uploads: Record<string, string>;
  courseSlug: string;
  lessonId: string;
}

/** The in-progress view: questions without keys, plus what the learner saved. */
export async function attemptForTaking(actor: Actor, attemptId: string): Promise<AttemptView> {
  let attempt = await ownAttempt(actor, attemptId);
  if (attempt.status === "IN_PROGRESS" && attempt.expiresAt && attempt.expiresAt.getTime() + GRACE_MS < Date.now()) {
    attempt = await finalise(attemptId, actor.id, null);
  }
  const snap = snapOf(attempt);
  const uploads = await prisma.attemptUpload.findMany({ where: { attemptId }, select: { id: true, fileName: true } });
  return {
    id: attempt.id,
    status: attempt.status,
    attemptNo: attempt.attemptNo,
    title: snap.assessment.title,
    instructions: snap.assessment.instructions,
    passingScore: snap.assessment.passingScore,
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    questions: snap.questions.map(toLearner),
    answers: attempt.answers as Record<string, Response>,
    uploads: Object.fromEntries(uploads.map((u) => [u.id, u.fileName])),
    courseSlug: snap.assessment.courseSlug,
    lessonId: snap.assessment.lessonId,
  };
}

export interface ResultRow {
  id: string;
  prompt: string;
  scenario: string | null;
  type: string;
  points: number;
  awarded: number;
  correct: boolean | null;
  yourAnswer: string;
  rightAnswer: string | null;
  rationale: string | null;
}

export interface AttemptResult {
  id: string;
  status: string;
  attemptNo: number;
  title: string;
  score: number | null;
  passed: boolean | null;
  passingScore: number;
  pointsAwarded: number | null;
  pointsPossible: number | null;
  feedback: string | null;
  rows: ResultRow[];
  competencies: { name: string; awarded: number; possible: number }[];
  remediation: { id: string; title: string }[];
  courseSlug: string;
  lessonId: string;
  submittedAt: string | null;
}

function describeResponse(q: PreparedQuestion, r: Response, uploads: Map<string, string>): string {
  const opt = (t: unknown) => {
    const i = typeof t === "string" ? q.optionTokens.indexOf(t) : -1;
    return i >= 0 ? q.options[i] : "—";
  };
  const tgt = (t: unknown) => {
    const i = typeof t === "string" ? q.targetTokens.indexOf(t) : -1;
    return i >= 0 ? q.targets[i] : "—";
  };
  if (r === undefined || r === null || r === "") return "No answer";
  switch (q.type) {
    case "SINGLE":
    case "TRUE_FALSE":
      return opt(r);
    case "MULTI":
      return Array.isArray(r) ? r.map(opt).join("; ") : "—";
    case "SEQUENCE":
      return Array.isArray(r) ? r.map(opt).join(" → ") : "—";
    case "MATCHING":
      return typeof r === "object" && !Array.isArray(r) ? q.options.map((o, i) => `${o} → ${tgt((r as Record<string, string>)[q.optionTokens[i]])}`).join("; ") : "—";
    case "FILE_UPLOAD":
      return typeof r === "string" ? (uploads.get(r) ?? "Uploaded file") : "—";
    default:
      return typeof r === "string" ? r : "—";
  }
}

async function buildResult(attempt: Prisma.QuizAttemptGetPayload<object>, revealKeys: boolean): Promise<AttemptResult> {
  const snap = snapOf(attempt);
  const answers = attempt.answers as Record<string, Response>;
  const stored = (attempt.breakdown as { competencies?: AttemptGrade["breakdown"]; remediation?: string[]; results?: AttemptGrade["results"] } | null) ?? {};
  const results = new Map((stored.results ?? []).map((r) => [r.questionId, r]));
  const uploads = new Map((await prisma.attemptUpload.findMany({ where: { attemptId: attempt.id }, select: { id: true, fileName: true } })).map((u) => [u.id, u.fileName]));
  const final = attempt.status === "GRADED" || attempt.status === "EXPIRED";
  const course = await getPublishedCourse(snap.assessment.courseSlug);
  const lessons = course ? flatLessons(course.snapshot as CourseSnapshot) : [];
  return {
    id: attempt.id,
    status: attempt.status,
    attemptNo: attempt.attemptNo,
    title: snap.assessment.title,
    score: attempt.score,
    passed: attempt.passed,
    passingScore: snap.assessment.passingScore,
    pointsAwarded: attempt.pointsAwarded,
    pointsPossible: attempt.pointsPossible,
    feedback: attempt.feedback,
    rows: snap.questions.map((q) => {
      const r = results.get(q.id);
      const show = revealKeys && final && snap.assessment.showAnswers;
      return {
        id: q.id,
        prompt: q.prompt,
        scenario: q.scenario ?? null,
        type: q.type,
        points: q.points,
        awarded: r?.awarded ?? 0,
        correct: r?.correct ?? null,
        yourAnswer: describeResponse(q, answers[q.id], uploads),
        rightAnswer: show && !MANUAL_TYPES.includes(q.type) ? describeAnswer(q) : null,
        rationale: show ? (q.rationale ?? null) : null,
      };
    }),
    competencies: Object.entries(stored.competencies ?? {}).map(([name, v]) => ({ name, ...v })),
    remediation: (stored.remediation ?? []).map((id) => ({ id, title: lessons.find((l) => l.id === id)?.title ?? "" })).filter((x) => x.title),
    courseSlug: snap.assessment.courseSlug,
    lessonId: snap.assessment.lessonId,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
  };
}

/** The learner's own result. Keys and rationales appear only once the attempt is final. */
export async function attemptResult(actor: Actor, attemptId: string) {
  const attempt = await ownAttempt(actor, attemptId);
  if (attempt.status === "IN_PROGRESS") throw new ServiceError("This attempt has not been submitted.");
  return buildResult(attempt, true);
}

export async function attemptsFor(userId: string, quizId: string) {
  return prisma.quizAttempt.findMany({
    where: { userId, quizId },
    orderBy: { attemptNo: "desc" },
    select: { id: true, attemptNo: true, status: true, score: true, passed: true, submittedAt: true, startedAt: true, expiresAt: true },
  });
}

// ---------------------------------------------------------------------------
// Manual grading
// ---------------------------------------------------------------------------

export async function attemptForGrading(actor: Actor, attemptId: string) {
  await assertCan(actor, "assessment.grade", { entity: "QuizAttempt", id: attemptId });
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId }, include: { user: { select: { name: true, email: true } } } });
  if (!attempt) throw new ServiceError("That attempt no longer exists.");
  const snap = snapOf(attempt);
  const result = await buildResult(attempt, false);
  const uploads = await prisma.attemptUpload.findMany({ where: { attemptId }, select: { id: true, questionId: true, fileName: true } });
  return {
    attempt,
    learner: attempt.user,
    result,
    manual: snap.questions
      .filter((q) => MANUAL_TYPES.includes(q.type))
      .map((q) => ({
        id: q.id,
        prompt: q.prompt,
        scenario: q.scenario ?? null,
        points: q.points,
        rubric: "rubric" in q.answerKey ? (q.answerKey.rubric ?? null) : null,
        response: (attempt.answers as Record<string, Response>)[q.id] ?? null,
        upload: uploads.find((u) => u.questionId === q.id) ?? null,
      })),
  };
}

export async function gradeManually(actor: Actor, attemptId: string, awards: Record<string, number>, feedback?: string) {
  await assertCan(actor, "assessment.grade", { entity: "QuizAttempt", id: attemptId });
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new ServiceError("That attempt no longer exists.");
  if (attempt.userId === actor.id) throw new ServiceError("You cannot mark your own attempt.");
  if (attempt.status !== "PENDING_REVIEW") throw new ServiceError("This attempt is not waiting for marking.");
  const snap = snapOf(attempt);
  const manual = snap.questions.filter((q) => MANUAL_TYPES.includes(q.type));
  for (const q of manual) {
    const v = awards[q.id];
    if (v === undefined || !Number.isInteger(v) || v < 0 || v > q.points) throw new ServiceError(`Give every written answer a whole-number mark between 0 and ${q.points}.`);
  }
  const grade = gradeAttempt(snap.questions, attempt.answers as Record<string, Response>, awards);
  const passed = grade.score >= snap.assessment.passingScore;
  const res = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, status: "PENDING_REVIEW" },
    data: {
      status: "GRADED",
      score: grade.score,
      passed,
      pointsAwarded: grade.pointsAwarded,
      pointsPossible: grade.pointsPossible,
      breakdown: { competencies: grade.breakdown, remediation: grade.remediation, results: grade.results } as never,
      feedback: feedback?.trim() || null,
      gradedAt: new Date(),
      gradedById: actor.id,
    },
  });
  if (res.count === 0) throw new ServiceError("Someone else marked this attempt first.");
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "grade", entity: "QuizAttempt", entityId: attemptId, after: { score: grade.score, passed, manual: awards } });
  if (passed) await completeViaAssessment(attempt.userId, snap);
  await notifyUsers([attempt.userId], { kind: "graded", title: `${snap.assessment.title} has been marked`, body: `${grade.score}%${passed ? ", passed" : ""}.`, href: `/academy/attempts/${attemptId}` });
  return { score: grade.score, passed };
}

export async function pendingGrading() {
  return prisma.quizAttempt.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { submittedAt: "asc" },
    select: { id: true, submittedAt: true, attemptNo: true, user: { select: { name: true } }, quiz: { select: { title: true, lesson: { select: { title: true, module: { select: { program: { select: { name: true } } } } } } } } },
  });
}
