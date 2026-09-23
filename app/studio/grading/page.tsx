import Link from "next/link";
import { requireTrainer } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Grading queue" };

/**
 * The marking queue. Submitted first and oldest first, because a review that sits unmarked
 * for a week teaches the learner that it did not matter.
 */
export default async function GradingPage() {
  await requireTrainer();

  const attempts = await prisma.labAttempt.findMany({
    where: { state: { in: ["SUBMITTED", "GRADED"] } },
    orderBy: [{ state: "asc" }, { submittedAt: "asc" }],
    include: {
      user: { select: { name: true, email: true } },
      scenario: { select: { clientName: true, reviewPeriod: true } },
      rubricScores: { select: { score: true, maxScore: true } },
      _count: { select: { actionItems: true, capacityRuns: true } },
    },
  });

  const waiting = attempts.filter((a) => a.state === "SUBMITTED");

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <p className="label-caps">Governance Labs</p>
      <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.3rem)] leading-tight">Grading queue</h1>
      <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
        {waiting.length === 0
          ? "Nothing waiting to be marked."
          : `${waiting.length} review${waiting.length === 1 ? "" : "s"} waiting. Each is marked against five criteria worth five points each; the comment is the part the learner reads twice.`}
      </p>

      {attempts.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Learner", "Scenario", "Submitted", "Work", "State", ""].map((h) => (
                  <th key={h} className="label-caps px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => {
                const total = a.rubricScores.reduce((n, r) => n + r.score, 0);
                const max = a.rubricScores.reduce((n, r) => n + r.maxScore, 0);
                return (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <span className="text-[13.5px] font-medium">{a.user.name}</span>
                      <span className="block text-micro text-muted-foreground">{a.user.email}</span>
                    </td>
                    <td className="px-4 py-3 text-micro">
                      {a.scenario.clientName}
                      <span className="block text-muted-foreground">{a.scenario.reviewPeriod}</span>
                    </td>
                    <td className="text-data px-4 py-3 text-micro text-muted-foreground">
                      {a.submittedAt?.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="text-data px-4 py-3 text-micro text-muted-foreground">
                      {a._count.capacityRuns} runs · {a._count.actionItems} actions
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`rounded-full border-transparent text-micro font-semibold ${
                          a.state === "GRADED"
                            ? "bg-success-bg text-success"
                            : "bg-warning-bg text-warning"
                        }`}
                      >
                        {a.state === "GRADED" ? `${total}/${max}` : "waiting"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/studio/grading/${a.id}`}
                        className="text-micro font-medium text-primary hover:underline"
                      >
                        {a.state === "GRADED" ? "Review marks" : "Mark it"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
