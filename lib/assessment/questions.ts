import { randomBytes, randomInt } from "node:crypto";
import { z } from "zod";
import type { QuestionType } from "@prisma/client";

/**
 * Question definitions, attempt preparation and grading. Pure functions, no database.
 *
 * Answer keys never leave the server. When an attempt starts, every option and target is
 * given an opaque random token for that attempt only, and the learner's page works in
 * tokens. Display order is shuffled for ordering and matching questions (and for others
 * when the assessment asks for it), so neither position nor token reveals the answer.
 *
 * Scoring is all-or-nothing per question, weighted by `points`. Short answers and uploads
 * are marked by a person; until then the attempt is "pending review" and nothing is passed.
 */

export const QUESTION_LABEL: Record<QuestionType, string> = {
  SINGLE: "Multiple choice",
  MULTI: "Multiple select",
  TRUE_FALSE: "True or false",
  MATCHING: "Matching",
  SEQUENCE: "Correct sequence",
  SHORT_ANSWER: "Written answer (manually graded)",
  FILE_UPLOAD: "Document upload (manually graded)",
};

export const MANUAL_TYPES: QuestionType[] = ["SHORT_ANSWER", "FILE_UPLOAD"];

export interface QuestionDef {
  id: string;
  type: QuestionType;
  scenario?: string | null;
  prompt: string;
  options: string[];
  targets: string[];
  answerKey: AnswerKey;
  rationale?: string | null;
  points: number;
  difficulty: number;
  competency?: string | null;
  remediationLessonId?: string | null;
}

export type AnswerKey =
  | { index: number }
  | { indices: number[] }
  | { pairs: number[] }
  | { order: number[] }
  | { rubric?: string; maxWords?: number };

const base = {
  scenario: z.string().trim().max(10_000).optional().nullable(),
  prompt: z.string().trim().min(5, "Write the question.").max(2_000),
  rationale: z.string().trim().max(2_000).optional().nullable(),
  points: z.coerce.number().int().min(1).max(100).default(1),
  difficulty: z.coerce.number().int().min(1).max(3).default(2),
  competency: z.string().trim().max(120).optional().nullable(),
  remediationLessonId: z.string().trim().max(60).optional().nullable(),
};

const option = z.string().trim().min(1).max(500);

export const QuestionInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SINGLE"), ...base, options: z.array(option).min(2, "Give at least two options.").max(8), answerKey: z.object({ index: z.number().int().min(0) }) }),
  z.object({ type: z.literal("TRUE_FALSE"), ...base, answerKey: z.object({ index: z.number().int().min(0).max(1) }) }),
  z.object({
    type: z.literal("MULTI"),
    ...base,
    options: z.array(option).min(3, "Give at least three options.").max(10),
    answerKey: z.object({ indices: z.array(z.number().int().min(0)).min(1, "Mark at least one correct option.") }),
  }),
  z.object({
    type: z.literal("MATCHING"),
    ...base,
    options: z.array(option).min(2, "Give at least two items to match.").max(10),
    targets: z.array(option).min(2).max(12),
    answerKey: z.object({ pairs: z.array(z.number().int().min(0)) }),
  }),
  z.object({ type: z.literal("SEQUENCE"), ...base, options: z.array(option).min(3, "Give at least three steps to order.").max(10) }),
  z.object({ type: z.literal("SHORT_ANSWER"), ...base, answerKey: z.object({ rubric: z.string().trim().max(4_000).optional(), maxWords: z.number().int().min(10).max(3_000).optional() }).default({}) }),
  z.object({ type: z.literal("FILE_UPLOAD"), ...base, answerKey: z.object({ rubric: z.string().trim().max(4_000).optional() }).default({}) }),
]);

export type QuestionInputT = z.infer<typeof QuestionInput>;

/** Validates an authored question and returns the columns to store, or an error sentence. */
export function normaliseQuestion(input: unknown):
  | { ok: true; value: Omit<QuestionDef, "id"> }
  | { ok: false; error: string } {
  const parsed = QuestionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the question." };
  const q = parsed.data;
  const common = {
    type: q.type,
    scenario: q.scenario || null,
    prompt: q.prompt,
    rationale: q.rationale || null,
    points: q.points,
    difficulty: q.difficulty,
    competency: q.competency || null,
    remediationLessonId: q.remediationLessonId || null,
  };
  switch (q.type) {
    case "SINGLE":
      if (q.answerKey.index >= q.options.length) return { ok: false, error: "Mark which option is correct." };
      return { ok: true, value: { ...common, options: q.options, targets: [], answerKey: { index: q.answerKey.index } } };
    case "TRUE_FALSE":
      return { ok: true, value: { ...common, options: ["True", "False"], targets: [], answerKey: { index: q.answerKey.index } } };
    case "MULTI": {
      const idx = [...new Set(q.answerKey.indices)].sort((a, b) => a - b);
      if (idx.some((i) => i >= q.options.length)) return { ok: false, error: "A correct option is out of range." };
      if (idx.length === q.options.length) return { ok: false, error: "At least one option should be wrong." };
      return { ok: true, value: { ...common, options: q.options, targets: [], answerKey: { indices: idx } } };
    }
    case "MATCHING": {
      if (q.answerKey.pairs.length !== q.options.length) return { ok: false, error: "Match every item to a target." };
      if (q.answerKey.pairs.some((t) => t >= q.targets.length)) return { ok: false, error: "A match points at a target that does not exist." };
      if (new Set(q.answerKey.pairs).size !== q.answerKey.pairs.length) return { ok: false, error: "Each target can be matched once." };
      return { ok: true, value: { ...common, options: q.options, targets: q.targets, answerKey: { pairs: q.answerKey.pairs } } };
    }
    case "SEQUENCE":
      // Authored in the correct order; the key is that order.
      return { ok: true, value: { ...common, options: q.options, targets: [], answerKey: { order: q.options.map((_, i) => i) } } };
    case "SHORT_ANSWER":
    case "FILE_UPLOAD":
      return { ok: true, value: { ...common, options: [], targets: [], answerKey: q.answerKey ?? {} } };
  }
}

/** Legacy `correct` column, kept in step for single-answer types. */
export function legacyCorrect(type: QuestionType, key: AnswerKey) {
  return (type === "SINGLE" || type === "TRUE_FALSE") && "index" in key ? key.index : 0;
}

// ---------------------------------------------------------------------------
// Attempt preparation
// ---------------------------------------------------------------------------

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const token = () => randomBytes(6).toString("base64url");

export interface PreparedQuestion extends QuestionDef {
  optionTokens: string[];
  targetTokens: string[];
  /** Original option indices, in the order the learner sees them. */
  displayOrder: number[];
  targetDisplayOrder: number[];
}

export function prepareQuestion(q: QuestionDef, randomiseOptions: boolean): PreparedQuestion {
  const idx = q.options.map((_, i) => i);
  const tIdx = q.targets.map((_, i) => i);
  const alwaysShuffle = q.type === "SEQUENCE" || q.type === "MATCHING";
  const shuffleChoices = q.type !== "TRUE_FALSE" && (alwaysShuffle || randomiseOptions);
  let displayOrder = shuffleChoices ? shuffle(idx) : idx;
  // A sequence shown already in order would give the answer away.
  if (q.type === "SEQUENCE" && displayOrder.length > 1) {
    for (let i = 0; i < 5 && displayOrder.every((v, j) => v === j); i++) displayOrder = shuffle(idx);
  }
  return {
    ...q,
    optionTokens: idx.map(token),
    targetTokens: tIdx.map(token),
    displayOrder,
    targetDisplayOrder: alwaysShuffle ? shuffle(tIdx) : tIdx,
  };
}

/** What the learner's browser receives: text and tokens only, never a key. */
export interface LearnerQuestion {
  id: string;
  type: QuestionType;
  scenario: string | null;
  prompt: string;
  points: number;
  options: { token: string; text: string }[];
  targets: { token: string; text: string }[];
  maxWords?: number;
}

export function toLearner(q: PreparedQuestion): LearnerQuestion {
  return {
    id: q.id,
    type: q.type,
    scenario: q.scenario ?? null,
    prompt: q.prompt,
    points: q.points,
    options: q.displayOrder.map((i) => ({ token: q.optionTokens[i], text: q.options[i] })),
    targets: q.targetDisplayOrder.map((i) => ({ token: q.targetTokens[i], text: q.targets[i] })),
    maxWords: "maxWords" in q.answerKey ? q.answerKey.maxWords : undefined,
  };
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export type Response = string | string[] | Record<string, string> | null | undefined;

export interface QuestionResult {
  questionId: string;
  points: number;
  awarded: number;
  /** null while waiting for a person to mark it. */
  correct: boolean | null;
  manual: boolean;
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

export function gradeQuestion(q: PreparedQuestion, response: Response): QuestionResult {
  const result = (correct: boolean | null): QuestionResult => ({
    questionId: q.id,
    points: q.points,
    awarded: correct ? q.points : 0,
    correct,
    manual: correct === null,
  });
  const ix = (t: unknown) => (typeof t === "string" ? q.optionTokens.indexOf(t) : -1);
  const tx = (t: unknown) => (typeof t === "string" ? q.targetTokens.indexOf(t) : -1);
  const key = q.answerKey;

  switch (q.type) {
    case "SINGLE":
    case "TRUE_FALSE":
      return result("index" in key && ix(response) === key.index);
    case "MULTI": {
      if (!Array.isArray(response) || !("indices" in key)) return result(false);
      const chosen = [...new Set(response.map(ix))];
      return result(!chosen.includes(-1) && sameSet(chosen, key.indices));
    }
    case "SEQUENCE": {
      if (!Array.isArray(response) || !("order" in key)) return result(false);
      const order = response.map(ix);
      return result(order.length === key.order.length && order.every((v, i) => v === key.order[i]));
    }
    case "MATCHING": {
      if (!response || typeof response !== "object" || Array.isArray(response) || !("pairs" in key)) return result(false);
      const map = response as Record<string, string>;
      return result(key.pairs.every((target, i) => tx(map[q.optionTokens[i]]) === target));
    }
    case "SHORT_ANSWER":
    case "FILE_UPLOAD":
      return result(null);
  }
}

export interface AttemptGrade {
  results: QuestionResult[];
  pointsAwarded: number;
  pointsPossible: number;
  score: number;
  needsReview: boolean;
  /** Per competency: awarded / possible, auto-graded questions only. */
  breakdown: Record<string, { awarded: number; possible: number }>;
  /** Lessons to revisit, from wrongly answered questions. */
  remediation: string[];
}

export function gradeAttempt(questions: PreparedQuestion[], answers: Record<string, Response>, manualAwards: Record<string, number> = {}): AttemptGrade {
  const results = questions.map((q) => {
    const r = gradeQuestion(q, answers[q.id]);
    if (r.manual && manualAwards[q.id] !== undefined) {
      const awarded = Math.max(0, Math.min(q.points, Math.round(manualAwards[q.id])));
      return { ...r, awarded, correct: awarded === q.points, manual: true };
    }
    return r;
  });
  const pointsPossible = results.reduce((n, r) => n + r.points, 0);
  const pointsAwarded = results.reduce((n, r) => n + r.awarded, 0);
  const needsReview = results.some((r) => r.manual && r.correct === null);
  const breakdown: AttemptGrade["breakdown"] = {};
  const remediation = new Set<string>();
  questions.forEach((q, i) => {
    const r = results[i];
    const c = q.competency || "General";
    breakdown[c] ??= { awarded: 0, possible: 0 };
    breakdown[c].possible += r.points;
    breakdown[c].awarded += r.awarded;
    if (r.correct === false && q.remediationLessonId) remediation.add(q.remediationLessonId);
  });
  return {
    results,
    pointsAwarded,
    pointsPossible,
    score: pointsPossible ? Math.round((pointsAwarded / pointsPossible) * 100) : 0,
    needsReview,
    breakdown,
    remediation: [...remediation],
  };
}

/** The correct answer in words, for the post-submission review. */
export function describeAnswer(q: PreparedQuestion): string {
  const key = q.answerKey;
  switch (q.type) {
    case "SINGLE":
    case "TRUE_FALSE":
      return "index" in key ? q.options[key.index] : "";
    case "MULTI":
      return "indices" in key ? key.indices.map((i) => q.options[i]).join("; ") : "";
    case "SEQUENCE":
      return q.options.join(" → ");
    case "MATCHING":
      return "pairs" in key ? q.options.map((o, i) => `${o} → ${q.targets[key.pairs[i]]}`).join("; ") : "";
    default:
      return "Marked by a reviewer";
  }
}
