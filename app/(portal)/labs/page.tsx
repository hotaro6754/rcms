import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StartLabButton } from "@/components/portal/StartLabButton";

export const metadata = { title: "Governance Labs" };

const STATE_TONE: Record<string, string> = {
  IN_PROGRESS: "bg-warning-bg text-warning",
  SUBMITTED: "bg-accent text-accent-foreground",
  GRADED: "bg-success-bg text-success",
};

/**
 * Lab index. A scenario is a client engagement the learner has not seen, with a failure
 * they have to find. Unlike a quiz there is no single right answer — the rubric marks
 * judgement, so the same scenario can be attempted once and graded on what they decided.
 */
export default async function LabsPage() {
  const user = await requireUser();

  const [scenarios, attempts] = await Promise.all([
    prisma.scenario.findMany({
      where: { state: "PUBLISHED" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.labAttempt.findMany({
      where: { userId: user.id },
      include: { rubricScores: true },
    }),
  ]);

  const byScenario = new Map(attempts.map((a) => [a.scenarioId, a]));

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12">
      <p className="label-caps">Governance Labs</p>
      <h1 className="mt-2 text-[clamp(1.8rem,3.2vw,2.5rem)] leading-tight">
        Run the review, not a quiz about it
      </h1>
      <p className="mt-4 max-w-[66ch] text-[14px] leading-relaxed text-muted-foreground">
        Each lab is a client engagement with something wrong in it. You get the telemetry an
        operations manager would get and nothing else. Find the cause, decide the staffing,
        assign the actions, and write the summary you would actually send. A trainer marks it
        against a rubric.
      </p>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {scenarios.map((s) => {
          const t = s.telemetry as { brief?: string } | null;
          const attempt = byScenario.get(s.id);
          const total = attempt?.rubricScores.reduce((n, r) => n + r.score, 0) ?? 0;
          const max = attempt?.rubricScores.reduce((n, r) => n + r.maxScore, 0) ?? 0;

          return (
            <Card key={s.id} className="gap-0 py-0">
              <CardHeader className="gap-0 border-b border-border px-6 py-5 [.border-b]:pb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-data text-micro text-muted-foreground">
                      {s.specialty} · {s.providers} providers · {s.reviewPeriod}
                    </span>
                    <h2 className="mt-1.5 text-[1.35rem] leading-tight">{s.clientName}</h2>
                  </div>
                  {attempt && (
                    <Badge
                      className={`rounded-full border-transparent text-micro font-semibold ${
                        STATE_TONE[attempt.state]
                      }`}
                    >
                      {attempt.state === "GRADED"
                        ? `${total}/${max}`
                        : attempt.state.toLowerCase().replace("_", " ")}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="px-6 py-5">
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  {t?.brief ??
                    "A worked example rather than an assessed lab. Explore the review stage by stage on the public site."}
                </p>

                <div className="mt-5">
                  {t?.brief ? (
                    attempt ? (
                      <Link
                        href={`/labs/${attempt.id}`}
                        className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                      >
                        {attempt.state === "IN_PROGRESS" ? "Continue the review" : "See your marks"}
                      </Link>
                    ) : (
                      <StartLabButton scenarioId={s.id} />
                    )
                  ) : (
                    <Link
                      href="/governance"
                      className="inline-flex min-h-11 items-center rounded-full border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
                    >
                      Open the worked example
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
