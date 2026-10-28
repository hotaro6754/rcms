import { redirect } from "next/navigation";
import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { TeamTable } from "@/components/portal/TeamTable";
import { teamReport } from "@/lib/services/people/corporate";
import { standings } from "@/lib/services/sims/competencies";
import { prisma } from "@/lib/db";
import { Pill } from "@/components/admin/kit";

export const metadata = { title: "Team" };

/** The corporate manager's view: their own organisation's seats and progress, nothing else. */
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const actor = await requireActor();
  if (!actor.managedOrgIds.length) redirect("/academy");
  const { org: requested } = await searchParams;
  const orgId = requested && actor.managedOrgIds.includes(requested) ? requested : actor.managedOrgIds[0];
  const { org, rows } = await teamReport(actor, orgId);
  const completed = rows.reduce((n, r) => n + r.enrolments.filter((e) => e.state === "COMPLETED").length, 0);
  const assigned = rows.reduce((n, r) => n + r.enrolments.length, 0);
  // Competency evidence comes from the same authorised report: only this organisation's members.
  const userIds = rows.map((r) => r.member.userId);
  const [byUser, competencies] = await Promise.all([standings(userIds), prisma.competency.findMany({ where: { status: "ACTIVE" }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } })]);
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Corporate account" title={org.name} lede={`${org.members.length} of ${org.seats} seats used · ${completed} of ${assigned} course enrolments completed. To add people or change assignments, contact your account manager.`} />
      <div className="mt-8">
        <TeamTable rows={rows} />
      </div>
      <section aria-labelledby="comp-h" className="mt-12">
        <h2 id="comp-h" className="text-[1.25rem] font-semibold">
          Competency evidence
        </h2>
        <p className="mt-1 max-w-[70ch] text-[13.5px] text-muted-foreground">From scored case simulations, not lesson completion. Demonstrated means the person passed a case with no critical error and met the threshold on the criteria that evidence the competency.</p>
        {competencies.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-muted-foreground">No competencies are active yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
            <table className="w-full min-w-[40rem] border-collapse text-left text-[13px]">
              <caption className="sr-only">Competency evidence by team member</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-3 font-medium">Person</th>
                  {competencies.map((c) => (
                    <th key={c.id} scope="col" className="px-3 py-3 font-medium" title={c.name}>
                      <abbr title={c.name} className="no-underline">{c.code}</abbr>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = byUser.get(r.member.userId) ?? [];
                  return (
                    <tr key={r.member.id} className="border-b border-border last:border-0">
                      <th scope="row" className="px-4 py-3 text-left font-medium">{r.member.user.name}</th>
                      {competencies.map((c) => {
                        const x = s.find((y) => y.competencyId === c.id);
                        return (
                          <td key={c.id} className="px-3 py-3">
                            {!x ? <span className="text-muted-foreground">No evidence</span> : x.demonstrated ? <Pill tone="green">Demonstrated</Pill> : x.expired ? <Pill tone="amber">Reassess</Pill> : <Pill tone="amber">Not yet</Pill>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
