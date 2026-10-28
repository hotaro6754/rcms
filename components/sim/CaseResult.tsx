import type { SimResult } from "@/lib/sim/score";
import { Pill } from "@/components/admin/kit";

/**
 * The scored result of a case attempt. Presentational and server-safe; also used by the author
 * preview on the client. Everything shown comes from the stored result, which the server wrote.
 */

export interface OutcomeView {
  code: string;
  name: string;
  level: number;
  demonstrated: boolean;
  evidenceScore: number;
}

export function CaseResult({
  result,
  outcomes,
  instructorNote,
  revealHint,
}: {
  result: SimResult;
  outcomes?: OutcomeView[];
  instructorNote?: string | null;
  /** Shown when the expected decision is still hidden. */
  revealHint?: string;
}) {
  const weak = result.criteria.filter((c) => c.score < 75);
  const strong = result.criteria.filter((c) => c.score >= 75);
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="result-h" className="flex flex-wrap items-end gap-6 border-b border-border pb-6">
        <div>
          <h2 id="result-h" className="label-caps">
            Result
          </h2>
          <p className="text-data mt-2 text-[3rem] font-medium leading-none">
            {result.score}
            <span className="ml-1 text-[1.1rem] text-muted-foreground">/ 100</span>
          </p>
        </div>
        <div className="flex flex-col gap-1.5 pb-1">
          {result.passed ? <Pill tone="green">Passed</Pill> : <Pill tone="red">Not passed</Pill>}
          <span className="text-micro text-muted-foreground">Pass mark {result.passMark}, with no critical errors.</span>
        </div>
      </section>

      {instructorNote && (
        <section aria-labelledby="note-h" className="rounded-[var(--radius)] border border-border bg-card p-5">
          <h3 id="note-h" className="text-[14px] font-semibold">
            Instructor feedback
          </h3>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{instructorNote}</p>
        </section>
      )}

      {result.criticalErrors.length > 0 && (
        <section aria-labelledby="crit-h" className="rounded-[var(--radius)] border border-danger/40 bg-danger-bg p-5">
          <h3 id="crit-h" className="text-[14px] font-semibold text-danger">
            Critical {result.criticalErrors.length === 1 ? "error" : "errors"}: this attempt cannot pass
          </h3>
          <ul className="mt-3 flex flex-col gap-3">
            {result.criticalErrors.map((c) => (
              <li key={c.id}>
                <p className="text-[14px] font-medium">{c.label}</p>
                <p className="mt-0.5 text-[13.5px] leading-relaxed">{c.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.actionGateFailed && result.criticalErrors.length === 0 && (
        <p className="border-l-2 border-warning pl-3 text-[14px]">This case can only be passed by choosing the action that resolves it. Your score reflects everything else you did well.</p>
      )}

      {result.actionRisk && (
        <section aria-labelledby="risk-h" className="border-l-2 border-warning pl-4">
          <h3 id="risk-h" className="text-[14px] font-semibold">
            What the action you chose would risk
          </h3>
          <p className="mt-1 text-[14px] leading-relaxed">{result.actionRisk}</p>
        </section>
      )}

      <section aria-labelledby="crit-table-h">
        <h3 id="crit-table-h" className="text-[1.1rem] font-semibold">
          Rubric
        </h3>
        <ul className="mt-4 flex flex-col divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
          {result.criteria.map((c) => (
            <li key={c.key} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-6">
              <div>
                <p className="text-[14px] font-medium">{c.label}</p>
                <p className="text-micro text-muted-foreground">
                  Weight {c.weight}
                  {c.adjusted ? " · set by instructor" : ""}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <span className={`block h-full ${c.score >= 75 ? "bg-success" : c.score >= 50 ? "bg-warning" : "bg-danger"}`} style={{ width: `${c.score}%` }} />
                  </span>
                  <span className="text-data w-10 text-right text-[13px]">{c.score}</span>
                </div>
              </div>
              <p className="text-[13.5px] leading-relaxed text-secondary-foreground">{c.comment}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] text-muted-foreground">{result.automatedNote}</p>
      </section>

      <section aria-labelledby="sum-h" className="grid gap-6 md:grid-cols-2">
        <h3 id="sum-h" className="sr-only">
          Summary
        </h3>
        <div>
          <p className="text-[14px] font-semibold">What you did well</p>
          {strong.length ? (
            <ul className="mt-2 list-disc pl-5 text-[13.5px] leading-relaxed">
              {strong.map((c) => (
                <li key={c.key}>{c.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-muted-foreground">Nothing scored 75 or more this time.</p>
          )}
        </div>
        <div>
          <p className="text-[14px] font-semibold">What to practise</p>
          {weak.length ? (
            <ul className="mt-2 list-disc pl-5 text-[13.5px] leading-relaxed">
              {weak.map((c) => (
                <li key={c.key}>{c.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13.5px] text-muted-foreground">Every criterion scored 75 or more.</p>
          )}
        </div>
      </section>

      {outcomes && outcomes.length > 0 && (
        <section aria-labelledby="comp-h">
          <h3 id="comp-h" className="text-[1.1rem] font-semibold">
            Competency evidence from this attempt
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {outcomes.map((o) => (
              <li key={o.code} className="flex items-start justify-between gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3">
                <span>
                  <span className="text-data text-micro text-muted-foreground">{o.code}</span>
                  <span className="block text-[13.5px] font-medium">{o.name}</span>
                </span>
                {o.demonstrated ? <Pill tone="green">Demonstrated</Pill> : <Pill tone="amber">Needs practice</Pill>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.revealed ? (
        <section aria-labelledby="exp-h" className="rounded-[var(--radius)] border border-border bg-card p-6">
          <h3 id="exp-h" className="text-[1.1rem] font-semibold">
            The expected decision
          </h3>
          <p className="mt-3 text-[14px] leading-relaxed">{result.revealed.decision}</p>
          <dl className="mt-5 grid gap-x-6 gap-y-3 text-[13.5px] sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt className="text-muted-foreground">Issue</dt>
            <dd>{result.revealed.correct.issue}</dd>
            <dt className="text-muted-foreground">Action</dt>
            <dd>{result.revealed.correct.action}</dd>
            {result.revealed.correct.policy && (
              <>
                <dt className="text-muted-foreground">Rule</dt>
                <dd>{result.revealed.correct.policy}</dd>
              </>
            )}
            {result.revealed.correct.deadline && (
              <>
                <dt className="text-muted-foreground">Deadline</dt>
                <dd>{result.revealed.correct.deadline}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Escalate?</dt>
            <dd>
              {result.revealed.correct.escalate ? "Yes. " : "No. "}
              {result.revealed.correct.escalation}
            </dd>
            <dt className="text-muted-foreground">Evidence that decides it</dt>
            <dd>{result.revealed.supportingEvidence.join("; ")}</dd>
            {result.revealed.missingInfo.length > 0 && (
              <>
                <dt className="text-muted-foreground">Still to find out</dt>
                <dd>{result.revealed.missingInfo.join("; ")}</dd>
              </>
            )}
          </dl>
          {result.revealed.chosenExplanations.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="text-[14px] font-semibold">About your choices</p>
              <ul className="mt-2 flex flex-col gap-2.5">
                {result.revealed.chosenExplanations.map((c) => (
                  <li key={c.question} className="text-[13.5px] leading-relaxed">
                    <span className="font-medium">
                      {c.question}: {c.label}.
                    </span>{" "}
                    {c.explanation}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-5 text-[13.5px] leading-relaxed">
            <span className="font-semibold">How to get it right next time: </span>
            {result.revealed.howToCorrect}
          </p>
        </section>
      ) : (
        revealHint && <p className="text-[13.5px] text-muted-foreground">{revealHint}</p>
      )}
    </div>
  );
}
