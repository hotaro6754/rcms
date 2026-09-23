"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Plus, Trash2 } from "lucide-react";
import { addQuestion, createQuiz, deleteQuestion } from "@/lib/actions/studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface StudioQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  rationale: string | null;
}

export interface StudioQuiz {
  id: string;
  title: string;
  passingScore: number;
  questions: StudioQuestion[];
}

/**
 * Quiz builder. Four options by default because a scenario question with two is a coin
 * flip, and the rationale field is not optional in spirit — a wrong answer that does not
 * explain itself teaches nothing.
 */
export function QuizBuilder({ lessonId, quiz }: { lessonId: string; quiz: StudioQuiz | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [optionCount, setOptionCount] = useState(4);

  if (!quiz) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-6">
        <h2 className="text-[14px] font-semibold">No quiz on this lesson</h2>
        <p className="mt-2 max-w-[58ch] text-micro leading-relaxed text-muted-foreground">
          A check at the end of a lesson is what turns reading into recall. Scenario questions
          work better here than definitions.
        </p>
        <form
          action={(fd) =>
            start(async () => {
              const res = await createQuiz(lessonId, fd);
              if (!res.ok) setError(res.error);
            })
          }
          className="mt-4 flex flex-wrap items-end gap-2"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtitle" className="text-micro font-medium">Title</label>
            <Input id="qtitle" name="title" defaultValue="Check yourself" className="min-h-10 w-56" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pass" className="text-micro font-medium">Pass mark %</label>
            <Input id="pass" name="passingScore" type="number" min={0} max={100} defaultValue={70} className="min-h-10 w-28" />
          </div>
          <Button type="submit" disabled={pending} className="min-h-10 rounded-full">
            Add quiz
          </Button>
        </form>
        {error && <p role="alert" className="mt-3 text-micro text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[14px] font-semibold">{quiz.title}</h2>
        <span className="text-data text-micro text-muted-foreground">
          pass at {quiz.passingScore}% · {quiz.questions.length} questions
        </span>
      </header>

      <ul className="divide-y divide-border">
        <AnimatePresence initial={false}>
          {quiz.questions.map((q, i) => (
            <motion.li
              key={q.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="px-5 py-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-data mt-0.5 shrink-0 text-micro text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium leading-snug">{q.prompt}</p>
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {q.options.map((o, oi) => (
                      <li key={oi} className="flex items-start gap-2 text-micro">
                        {oi === q.correct ? (
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-label="Correct" />
                        ) : (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-input" />
                        )}
                        <span className={oi === q.correct ? "text-foreground" : "text-muted-foreground"}>
                          {o}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {q.rationale && (
                    <p className="mt-2.5 border-l-2 border-border pl-3 text-micro leading-relaxed text-muted-foreground">
                      {q.rationale}
                    </p>
                  )}
                </div>
                <Button
                  size="icon" variant="ghost" disabled={pending}
                  aria-label="Delete question"
                  onClick={() =>
                    start(async () => {
                      const res = await deleteQuestion(q.id);
                      if (!res.ok) setError(res.error);
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                </Button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="border-t border-border px-5 py-4">
        {adding ? (
          <form
            action={(fd) =>
              start(async () => {
                setError(null);
                const res = await addQuestion(quiz.id, fd);
                if (!res.ok) setError(res.error);
                else setAdding(false);
              })
            }
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="prompt" className="text-micro font-medium">Question</label>
              <Textarea id="prompt" name="prompt" rows={2} required
                placeholder="A claim denies CO-50 with RARC N706. What is the first thing you check?" />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-micro font-medium">Options — select the correct one</legend>
              {Array.from({ length: optionCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <input
                    type="radio" name="correct" value={i} required
                    aria-label={`Option ${i + 1} is correct`}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <Input name="option" placeholder={`Option ${i + 1}`} className="min-h-10" />
                </div>
              ))}
              {optionCount < 6 && (
                <Button
                  type="button" size="sm" variant="ghost" className="min-h-9 w-fit gap-1.5"
                  onClick={() => setOptionCount((n) => n + 1)}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Another option
                </Button>
              )}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="rationale" className="text-micro font-medium">
                Why that answer
              </label>
              <Textarea id="rationale" name="rationale" rows={2}
                placeholder="Shown after the attempt. A wrong answer that does not explain itself teaches nothing." />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="min-h-10 rounded-full">
                Add question
              </Button>
              <Button type="button" variant="ghost" className="min-h-10" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="ghost" className="min-h-9 gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add question
          </Button>
        )}
        {error && <p role="alert" className="mt-3 text-micro text-danger">{error}</p>}
      </div>
    </div>
  );
}
