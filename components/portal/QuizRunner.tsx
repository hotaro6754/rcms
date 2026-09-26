"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { submitQuizAttempt } from "@/lib/actions/quiz";
import { Button } from "@/components/ui/button";

export interface RunnerQuestion {
  id: string;
  prompt: string;
  options: string[];
}

interface ReviewRow {
  questionId: string;
  prompt: string;
  given: number | null;
  correct: number;
  right: boolean;
  rationale: string | null;
  options: string[];
}

/**
 * The student side of a quiz. Options arrive without the answer key; grading and the
 * rationale come back from the server after submission.
 */
export function QuizRunner({
  quizId,
  title,
  passingScore,
  questions,
  lastScore,
}: {
  quizId: string;
  title: string;
  passingScore: number;
  questions: RunnerQuestion[];
  lastScore: { score: number; passed: boolean } | null;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    review: ReviewRow[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const answered = Object.keys(answers).length;
  const complete = answered === questions.length;

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="rounded-[var(--radius)] border border-border bg-card"
      >
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <span
            className={`text-data rounded-full px-2.5 py-0.5 text-micro font-semibold ${
              result.passed ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
            }`}
          >
            {result.score}% · {result.passed ? "passed" : `pass mark ${passingScore}%`}
          </span>
        </header>

        <ul className="divide-y divide-border">
          {result.review.map((r, i) => (
            <li key={r.questionId} className="px-5 py-4">
              <div className="flex items-start gap-3">
                {r.right ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Correct" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Wrong" />
                )}
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium leading-snug">
                    {i + 1}. {r.prompt}
                  </p>
                  {!r.right && (
                    <p className="mt-2 text-micro text-muted-foreground">
                      You chose{" "}
                      <span className="text-danger">
                        {r.given !== null ? r.options[r.given] : "nothing"}
                      </span>
                      . The answer is{" "}
                      <span className="text-success">{r.options[r.correct]}</span>.
                    </p>
                  )}
                  {r.rationale && (
                    <p className="mt-2 border-l-2 border-border pl-3 text-micro leading-relaxed text-muted-foreground">
                      {r.rationale}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-border px-5 py-4">
          <Button
            variant="outline"
            className="min-h-10 rounded-full"
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
          >
            Try again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <span className="text-data text-micro text-muted-foreground">
          {questions.length} questions · pass at {passingScore}%
        </span>
        {lastScore && (
          <span className="text-data ml-auto text-micro text-muted-foreground">
            last attempt {lastScore.score}%
          </span>
        )}
      </header>

      <ol className="divide-y divide-border">
        {questions.map((q, i) => (
          <li key={q.id} className="px-5 py-4">
            <fieldset>
              <legend className="text-[13.5px] font-medium leading-snug">
                {i + 1}. {q.prompt}
              </legend>
              <div className="mt-3 flex flex-col gap-2">
                {q.options.map((o, oi) => (
                  <label key={oi} className="flex cursor-pointer items-start gap-2.5 text-micro">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === oi}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                    />
                    <span className="text-secondary-foreground">{o}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4">
        <Button
          disabled={!complete || pending}
          className="min-h-10 rounded-full"
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await submitQuizAttempt(quizId, answers);
              if (res.ok) setResult(res.data);
              else setError(res.error);
            })
          }
        >
          Submit answers
        </Button>
        <span className="text-micro text-muted-foreground">
          {answered} of {questions.length} answered
        </span>
        {error && (
          <span role="alert" className="text-micro text-danger">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
