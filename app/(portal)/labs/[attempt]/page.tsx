import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { LabWorkspace, type CapacityResult, type RcaStep } from "@/components/portal/LabWorkspace";
import { ScenarioTelemetry, type LearnerScenario } from "@/components/portal/ScenarioTelemetry";
import type { ScenarioSeed } from "@/lib/data/scenarios";

export const metadata = { title: "Governance Lab" };

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ attempt: string }>;
}) {
  const { attempt: attemptId } = await params;
  const user = await requireUser();

  const attempt = await prisma.labAttempt.findUnique({
    where: { id: attemptId },
    include: {
      scenario: true,
      capacityRuns: { orderBy: { createdAt: "desc" } },
      rcaBoard: true,
      actionItems: { orderBy: { createdAt: "asc" } },
      executiveNote: true,
      rubricScores: { orderBy: { createdAt: "asc" } },
    },
  });

  // An attempt belongs to one learner. Anyone else gets a 404 rather than a 403, because
  // the existence of another student's attempt is not their business either.
  if (!attempt || attempt.userId !== user.id) notFound();

  // hiddenCause is the answer. It stays on the server: the learner view is the telemetry
  // an operations manager would be handed and nothing more.
  const full = { ...(attempt.scenario.telemetry as unknown as ScenarioSeed) };
  delete (full as Partial<ScenarioSeed>).hiddenCause;
  const scenario = full as LearnerScenario;

  const total = attempt.rubricScores.reduce((n, r) => n + r.score, 0);
  const max = attempt.rubricScores.reduce((n, r) => n + r.maxScore, 0);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link
        href="/labs"
        className="inline-flex items-center gap-1.5 text-micro text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Governance Labs
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <p className="text-data text-micro text-muted-foreground">
          {scenario.specialty} · {scenario.providers} providers · {scenario.reviewPeriod}
        </p>
        <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.3rem)] leading-tight">
          {attempt.scenario.clientName}
        </h1>
        <p className="mt-4 max-w-[70ch] text-[14.5px] leading-relaxed text-secondary-foreground">
          {scenario.brief}
        </p>
      </header>

      {attempt.state === "IN_PROGRESS" ? (
        <div className="mt-8">
          <LabWorkspace
            attemptId={attempt.id}
            scenario={scenario}
            runs={attempt.capacityRuns.map((r) => ({
              id: r.id,
              analysts: r.analysts,
              qaBar: r.qaBar,
              automation: r.automation,
              result: r.result as unknown as CapacityResult,
            }))}
            rca={
              attempt.rcaBoard
                ? {
                    subject: attempt.rcaBoard.subject,
                    steps: attempt.rcaBoard.steps as unknown as RcaStep[],
                    conclusion: attempt.rcaBoard.conclusion,
                  }
                : null
            }
            actions={attempt.actionItems.map((a) => ({
              id: a.id,
              action: a.action,
              owner: a.owner,
              dueDate: a.dueDate,
              expectedImpact: a.expectedImpact,
            }))}
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          <section className="rounded-[var(--radius)] border border-border bg-card px-6 py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold">
                {attempt.state === "GRADED" ? "Your marks" : "Submitted"}
              </h2>
              {attempt.state === "GRADED" && (
                <span className="text-data text-[1.5rem] leading-none">
                  {total}/{max}
                </span>
              )}
            </div>

            {attempt.state === "GRADED" ? (
              <ul className="mt-5 flex flex-col gap-3">
                {attempt.rubricScores.map((r) => (
                  <li key={r.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13.5px] font-medium">{r.criterion}</span>
                      <span className="text-data text-micro">
                        {r.score}/{r.maxScore}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="mt-1.5 text-micro leading-relaxed text-muted-foreground">
                        {r.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
                Sent for marking on{" "}
                {attempt.submittedAt?.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                . A trainer scores it against the rubric and you get a notification with the
                comments. Nothing below can be edited now.
              </p>
            )}
          </section>

          {attempt.executiveNote && (
            <section>
              <h2 className="text-[15px] font-semibold">Your executive note</h2>
              <dl className="mt-4 grid gap-4 lg:grid-cols-2">
                {(
                  [
                    ["What changed", attempt.executiveNote.whatChanged],
                    ["Why it changed", attempt.executiveNote.whyChanged],
                    ["Root cause", attempt.executiveNote.rootCause],
                    ["Recommended action", attempt.executiveNote.recommendedAction],
                    ["Financial impact", attempt.executiveNote.financialImpact],
                    [
                      "Owner and deadline",
                      `${attempt.executiveNote.owner} · ${attempt.executiveNote.deadline}`,
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[var(--radius)] border border-border bg-card px-5 py-4"
                  >
                    <dt className="label-caps">{label}</dt>
                    <dd className="mt-2 text-[13.5px] leading-relaxed text-secondary-foreground">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {attempt.rcaBoard && (
            <section>
              <h2 className="text-[15px] font-semibold">
                Your analysis — {attempt.rcaBoard.subject}
              </h2>
              <ol className="mt-4 flex flex-col gap-2">
                {(attempt.rcaBoard.steps as unknown as RcaStep[])
                  .filter((s) => s.answer)
                  .map((s, i) => (
                    <li
                      key={i}
                      className="rounded-[var(--radius)] border border-border bg-card px-5 py-4"
                    >
                      <p className="label-caps">Level {i + 1}</p>
                      <p className="mt-1 text-micro text-muted-foreground">{s.question}</p>
                      <p className="mt-2 text-[13.5px] leading-relaxed">{s.answer}</p>
                      {s.evidence && (
                        <p className="text-data mt-1.5 text-micro text-muted-foreground">
                          {s.evidence}
                        </p>
                      )}
                    </li>
                  ))}
              </ol>
              {attempt.rcaBoard.conclusion && (
                <p className="mt-4 max-w-[70ch] text-[13.5px] leading-relaxed text-secondary-foreground">
                  {attempt.rcaBoard.conclusion}
                </p>
              )}
            </section>
          )}

          {attempt.actionItems.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold">Actions you assigned</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {attempt.actionItems.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-[var(--radius)] border border-border bg-card px-4 py-3"
                  >
                    <p className="text-[13.5px] leading-snug">{a.action}</p>
                    <p className="text-data mt-1.5 text-micro text-muted-foreground">
                      {a.owner} · due {a.dueDate}
                      {a.expectedImpact && ` · ${a.expectedImpact}`}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-[15px] font-semibold">The account as you saw it</h2>
            <div className="mt-4">
              <ScenarioTelemetry scenario={scenario} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
