import Link from "next/link";
import { requirePagePermission } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { Empty, Pill, Table, Td, when } from "@/components/admin/kit";
import { attemptsForReview } from "@/lib/services/sims/attempts";

export const metadata = { title: "Case attempts" };

export default async function CaseAttemptsQueue({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const actor = await requirePagePermission("assessment.grade");
  const sp = await searchParams;
  const state = sp.state === "REVIEWED" ? "REVIEWED" : sp.state === "all" ? undefined : "SCORED";
  const rows = await attemptsForReview(actor, { state });
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link href="/admin/grading" className="text-micro text-muted-foreground hover:text-foreground">
        ← Grading
      </Link>
      <PageHead kicker="Assessment" title="Case attempts" lede="Attempts are scored automatically on submission. Review them here to read the learner's reasoning, adjust the automated documentation and rationale scores, and leave feedback." />
      <nav aria-label="Filter" className="mt-6 flex gap-3 text-[13px]">
        {[
          { v: "SCORED", l: "Not reviewed" },
          { v: "REVIEWED", l: "Reviewed" },
          { v: "all", l: "All" },
        ].map((f) => (
          <Link key={f.v} href={`?state=${f.v}`} aria-current={(state ?? "all") === f.v ? "page" : undefined} className="underline-offset-4 aria-[current=page]:font-semibold aria-[current=page]:underline">
            {f.l}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {rows.length === 0 ? (
          <Empty title="Nothing here" />
        ) : (
          <Table head={["Learner", "Case", "Attempt", "Score", "Submitted"]}>
            {rows.map((a) => (
              <tr key={a.id}>
                <Td>
                  <Link href={`/admin/grading/cases/${a.id}`} className="font-medium hover:underline">
                    {a.user.name}
                  </Link>
                </Td>
                <Td>
                  {a.case.title} <span className="text-muted-foreground">v{a.version.version}</span>
                </Td>
                <Td>#{a.attemptNo}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    {a.score}
                    {a.passed ? <Pill tone="green">pass</Pill> : <Pill tone="red">not passed</Pill>}
                    {a.state === "REVIEWED" && <Pill>reviewed</Pill>}
                  </span>
                </Td>
                <Td>{when(a.submittedAt, true)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
