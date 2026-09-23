"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { gradeAttempt } from "@/lib/actions/labs";
import { RUBRIC } from "@/lib/data/scenarios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface ExistingScore {
  criterion: string;
  score: number;
  comment: string | null;
}

/**
 * Marking surface. The guidance for each criterion sits next to its input rather than in a
 * separate document, so two trainers grading the same work land in the same place.
 * Re-grading is allowed: the scores are replaced, and the learner is notified again.
 */
export function GradeForm({
  attemptId,
  existing,
}: {
  attemptId: string;
  existing: ExistingScore[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const prior = new Map(existing.map((e) => [e.criterion, e]));

  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(RUBRIC.map((r) => [r.criterion, prior.get(r.criterion)?.score ?? 0])),
  );
  const total = Object.values(scores).reduce((n, s) => n + s, 0);
  const max = RUBRIC.reduce((n, r) => n + r.max, 0);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await gradeAttempt(attemptId, fd);
          if (res.ok) router.push("/studio/grading");
          else setError(res.error);
        })
      }
      className="rounded-[var(--radius)] border border-border bg-card px-6 py-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Rubric</h2>
        <span className="text-data text-[1.5rem] leading-none">
          {total}/{max}
        </span>
      </div>

      <ul className="mt-5 flex flex-col gap-6">
        {RUBRIC.map((r) => (
          <li key={r.criterion} className="border-t border-border pt-5 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[13.5px] font-medium">{r.criterion}</h3>
              <span className="text-data text-micro text-muted-foreground">
                {scores[r.criterion]} / {r.max}
              </span>
            </div>
            <p className="mt-1.5 max-w-[68ch] text-micro leading-relaxed text-muted-foreground">
              {r.guidance}
            </p>

            <div
              role="radiogroup"
              aria-label={r.criterion}
              className="mt-3 flex flex-wrap gap-1.5"
            >
              {Array.from({ length: r.max + 1 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={scores[r.criterion] === n}
                  onClick={() => setScores((s) => ({ ...s, [r.criterion]: n }))}
                  className={`text-data min-h-10 min-w-10 rounded-full border text-[13.5px] transition-colors ${
                    scores[r.criterion] === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-card hover:bg-secondary"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <input type="hidden" name={`score:${r.criterion}`} value={scores[r.criterion]} />

            <Textarea
              name={`comment:${r.criterion}`}
              rows={2}
              defaultValue={prior.get(r.criterion)?.comment ?? ""}
              placeholder="What would have made this a full mark?"
              className="mt-3"
            />
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-4 text-micro text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-6 min-h-11 rounded-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {existing.length > 0 ? "Update marks" : "Release marks"}
      </Button>
      <p className="mt-2 text-micro text-muted-foreground">
        The learner is notified with the total and every comment.
      </p>
    </form>
  );
}
