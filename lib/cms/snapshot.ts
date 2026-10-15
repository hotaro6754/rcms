import type { AssessmentKind, BlockKind, LessonCompletion } from "@prisma/client";
import type { QuestionDef } from "@/lib/assessment/questions";

/**
 * The shape of a released course. Written once by the release service, read by every
 * learner-facing page, never edited. `schema` exists so a future change to this shape can
 * read old releases.
 *
 * Answer keys are inside (attempts are prepared from them on the server). Nothing that
 * reads a snapshot may send it to a browser whole; learner pages pick fields.
 */

export interface SnapshotBlock {
  id: string;
  kind: BlockKind;
  data: Record<string, unknown>;
}

export interface SnapshotResource {
  id: string;
  title: string;
  mimeType: string;
  sizeBytes: number | null;
}

export interface SnapshotAssessment {
  id: string;
  title: string;
  kind: AssessmentKind;
  instructions: string | null;
  passingScore: number;
  timeLimitMinutes: number | null;
  maxAttempts: number | null;
  retakeWaitMinutes: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  drawCount: number;
  showAnswers: boolean;
  questions: QuestionDef[];
  bank: QuestionDef[];
}

export interface SnapshotLesson {
  id: string;
  title: string;
  objectives: string[];
  minutes: number;
  freePreview: boolean;
  completionRule: LessonCompletion;
  effectiveDate: string | null;
  blocks: SnapshotBlock[];
  resources: SnapshotResource[];
  assessment: SnapshotAssessment | null;
}

export interface SnapshotModule {
  id: string;
  title: string;
  summary: string | null;
  objectives: string[];
  estimatedMinutes: number | null;
  lessons: SnapshotLesson[];
}

export interface SnapshotCourse {
  id: string;
  slug: string;
  name: string;
  levelId: string | null;
  tier: string;
  who: string;
  artefact: string;
  weeks: string;
  description: string | null;
  outcomes: string[];
  prerequisites: string[];
  durationMinutes: number | null;
  difficulty: string | null;
  isFree: boolean;
  includedInSubscription: boolean;
  disclaimer: string | null;
  effectiveDate: string | null;
  reviewDate: string | null;
  thumbnailId: string | null;
}

export interface CourseSnapshot {
  schema: 1;
  course: SnapshotCourse;
  modules: SnapshotModule[];
}

export function flatLessons(s: CourseSnapshot) {
  return s.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })));
}

export function findLesson(s: CourseSnapshot, lessonId: string) {
  return flatLessons(s).find((l) => l.id === lessonId) ?? null;
}

export function findAssessment(s: CourseSnapshot, quizId: string) {
  for (const l of flatLessons(s)) if (l.assessment?.id === quizId) return { lesson: l, assessment: l.assessment };
  return null;
}

export function snapshotMinutes(s: CourseSnapshot) {
  return flatLessons(s).reduce((n, l) => n + (l.minutes || 0), 0);
}
