import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Pill } from "@/components/admin/kit";
import { CaseWorkbench } from "@/components/sim/CaseWorkbench";
import { CaseResult } from "@/components/sim/CaseResult";
import { requestCaseReviewAction, saveCaseAnswersAction, startCaseAction, submitCaseAction } from "@/lib/actions/sims";
import { attemptForLearner } from "@/lib/services/sims/attempts";

export const metadata = { title: "Case attempt" };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const a = await attemptForLearner(actor, id).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });
  const open = a.state === "IN_PROGRESS";

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link href="/cases" className="text-micro text-muted-foreground hover:text-foreground">
        ← Case practice
      </Link>
      <PageHead
        kicker={`Attempt ${a.attemptNo} · case version ${a.version}`}
        title={a.view.title}
        lede={
          <span className="flex flex-wrap items-center gap-2">
            {open ? <Pill tone="amber">In progress</Pill> : a.state === "REVIEWED" ? <Pill tone="green">Reviewed by an instructor</Pill> : <Pill>Scored</Pill>}
            <span>Synthetic case: payers, accounts and policies are fictional.</span>
          </span>
        }
      />

      <div className="mt-8">
        {open ? (
          <CaseWorkbench view={a.view} initial={a.answers} save={saveCaseAnswersAction.bind(null, a.id)} submit={submitCaseAction.bind(null, a.id)} />
        ) : (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <CaseResult
              result={a.result!}
              outcomes={a.outcomes}
              instructorNote={a.instructorNote}
              revealHint="The expected decision is shown once you pass, or after your second attempt."
            />
            <aside className="flex flex-col gap-6">
              <div>
                <h2 className="text-[14px] font-semibold">Attempts</h2>
                <ol className="mt-2 flex flex-col gap-1.5 text-[13px]">
                  {a.history.map((h) => (
                    <li key={h.id}>
                      <Link href={`/cases/attempt/${h.id}`} aria-current={h.id === a.id ? "page" : undefined} className={`flex justify-between gap-2 rounded-[3px] px-2 py-1 ${h.id === a.id ? "bg-secondary" : "hover:bg-secondary"}`}>
                        <span>Attempt {h.attemptNo}</span>
                        <span className="text-data">{h.state === "IN_PROGRESS" ? "open" : `${h.score}${h.passed ? " ✓" : ""}`}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
              {a.attemptsLeft !== 0 && !a.history.some((h) => h.state === "IN_PROGRESS") && (
                <ActionForm action={startCaseAction}>
                  <input type="hidden" name="caseId" value={a.caseId} />
                  <button className={`${BTN} w-full`}>Try again{a.attemptsLeft !== null ? ` (${a.attemptsLeft} left)` : ""}</button>
                </ActionForm>
              )}
              {a.state === "SCORED" && (
                <ActionForm action={requestCaseReviewAction} success="An instructor has been asked to review it.">
                  <input type="hidden" name="attemptId" value={a.id} />
                  <button className={`${BTN_OUTLINE} w-full`}>Ask an instructor to review</button>
                  <p className="mt-2 text-[12px] text-muted-foreground">Useful if you think the automated check of your note or rationale missed something.</p>
                </ActionForm>
              )}
              <details className="text-[13px]">
                <summary className="cursor-pointer font-medium">Your answers</summary>
                <dl className="mt-2 flex flex-col gap-2">
                  <dt className="text-muted-foreground">Rationale</dt>
                  <dd className="whitespace-pre-line">{a.answers.rationale || "—"}</dd>
                  <dt className="text-muted-foreground">Account note</dt>
                  <dd className="whitespace-pre-line">{a.answers.notes || "—"}</dd>
                </dl>
              </details>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
