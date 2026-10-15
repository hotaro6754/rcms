import type { QuestionType } from "@prisma/client";

/** Client-safe: names for question types. (lib/assessment/questions.ts is server-only.) */
export const QUESTION_LABEL: Record<QuestionType, string> = {
  SINGLE: "Multiple choice",
  MULTI: "Multiple select",
  TRUE_FALSE: "True or false",
  MATCHING: "Matching",
  SEQUENCE: "Correct sequence",
  SHORT_ANSWER: "Written answer (manually graded)",
  FILE_UPLOAD: "Document upload (manually graded)",
};
