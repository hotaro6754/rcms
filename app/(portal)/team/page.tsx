import { redirect } from "next/navigation";
import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { TeamTable } from "@/components/portal/TeamTable";
import { teamReport } from "@/lib/services/people/corporate";

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
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Corporate account" title={org.name} lede={`${org.members.length} of ${org.seats} seats used · ${completed} of ${assigned} course enrolments completed. To add people or change assignments, contact your account manager.`} />
      <div className="mt-8">
        <TeamTable rows={rows} />
      </div>
    </div>
  );
}
