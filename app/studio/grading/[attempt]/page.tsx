import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTrainer } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { GradeForm } from "@/components/studio/GradeForm";
import type { RcaStep, CapacityResult } from "@/components/portal/LabWorkspace";
import type { ScenarioSeed } from "@/lib/data/scenarios";
import { count, money } from "@/lib/utils";

export const metadata = { title: "Mark a review" };

export default async function GradeAttemptPage({
  params,
}: {
  params: Promise<{ attempt: string }>;
}) {
  const { attempt: attemptId } = await params;
  await requireTrainer();

  const attempt = await prisma.labAttempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { name: true, email: true } },
      scenario: true,
      capacityRuns: { orderBy: { createdAt: "desc" } },
      rcaBoard: true,
      actionItems: { orderBy: { createdAt: "asc" } },
      executiveNote: true,
      rubricScores: true,
    },
  });

  if (!attempt) notFound();
  if (attempt.state === "IN_PROGRESS") notFound();

  const telemetry = attempt.scenario.telemetry as unknown as ScenarioSeed;
  const steps = (attempt.rcaBoard?.steps as unknown as RcaStep[] | undefined)?.filter(
    (s) => s.answer,
  );
  const latest = attempt.capacityRuns[0];
  const result = latest?.result as unknown as CapacityResult | undefined;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link
        href="/studio/grading"
        className="inline-flex items-center gap-1.5 text-micro text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Grading queue
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <p className="text-data text-micro text-muted-foreground">
          {attempt.user.name} · {attempt.user.email}
        </p>
        <h1 className="mt-2 text-[clamp(1.6rem,2.8vw,2.1rem)] leading-tight">
          {attempt.scenario.clientName}, {attempt.scenario.reviewPeriod}
        </h1>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="flex flex-col gap-8">
          {/* The answer, on the trainer's screen only. It is never sent to the learner's
              client — the attempt page strips it before rendering. */}
          <section className="rounded-[var(--radius)] border border-warning/40 bg-warning-bg/60 px-5 py-4">
            <p className="label-caps text-warning">What actually happened</p>
            <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed">
              {telemetry.hiddenCause}
            </p>
          </section>

          {attempt.executiveNote && (
            <section>
              <h2 className="text-[15px] font-semibold">Executive note</h2>
              <dl className="mt-3 flex flex-col gap-3">
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
                    <dd className="mt-1.5 text-[13.5px] leading-relaxed text-secondary-foreground">
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
                Analysis — {attempt.rcaBoard.subject}
              </h2>
              <ol className="mt-3 flex flex-col gap-2">
                {steps?.map((s, i) => (
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
                <p className="mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-secondary-foreground">
                  {attempt.rcaBoard.conclusion}
                </p>
              )}
            </section>
          )}

          <section>
            <h2 className="text-[15px] font-semibold">Capacity decision</h2>
            {result ? (
              <>
                <p className="text-data mt-3 text-[13.5px]">
                  {latest.analysts} analysts · QA {latest.qaBar}% · automation {latest.automation}%
                </p>
                <p className="text-data mt-1.5 text-micro text-muted-foreground">
                  {count(result.capacity)} claims a day ·{" "}
                  {result.daysToClear ? `${result.daysToClear} days to clear` : "never clears"} ·{" "}
                  {money(result.monthlyCost)} a month · {result.costToCollect}% cost to collect
                </p>
                {attempt.capacityRuns.length > 1 && (
                  <p className="mt-2 text-micro text-muted-foreground">
                    {attempt.capacityRuns.length} configurations tried before settling here.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-micro text-muted-foreground">No run recorded.</p>
            )}
          </section>

          <section>
            <h2 className="text-[15px] font-semibold">Actions assigned</h2>
            <ul className="mt-3 flex flex-col gap-2">
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
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <GradeForm
            attemptId={attempt.id}
            existing={attempt.rubricScores.map((r) => ({
              criterion: r.criterion,
              score: r.score,
              comment: r.comment,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
