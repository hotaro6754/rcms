import { redirect } from "next/navigation";
import { requireActor, can, isStaff } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { overview } from "@/lib/services/reports/overview";
import { runDueApprovals } from "@/lib/services/approvals";
import { runScheduledExpiries, runScheduledPublications } from "@/lib/services/cms/release";
import { CommandCenter } from "@/components/admin/dashboard/CommandCenter";

export const metadata = { title: "Dashboard" };

/**
 * The admin's front page: the Academy command center. Work waiting for an admin (marking,
 * unassigned support cases) is folded into its Signals. Due scheduled items are applied on the
 * way in as a backstop to the cron route.
 */
export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const actor = await requireActor();
  if (!isStaff(actor)) redirect("/account");
  await Promise.all([runScheduledPublications().catch(() => []), runScheduledExpiries().catch(() => []), runDueApprovals().catch(() => undefined)]);

  const [data, toGrade, unassigned] = await Promise.all([
    overview(actor),
    can(actor, "assessment.grade") ? prisma.quizAttempt.count({ where: { status: "PENDING_REVIEW" } }) : 0,
    can(actor, "support.assign") ? prisma.supportTicket.count({ where: { assigneeId: null, status: { notIn: ["RESOLVED", "CLOSED"] } } }) : 0,
  ]);
  const work = [
    ...(toGrade ? [{ tone: "act" as const, title: `${toGrade} assessment answer${toGrade > 1 ? "s" : ""} to mark`, body: "Written answers and uploads wait for you before the student gets a result.", href: "/admin/grading" }] : []),
    ...(unassigned ? [{ tone: "act" as const, title: `${unassigned} student question${unassigned > 1 ? "s" : ""} waiting in Support`, body: "Nobody has picked these up yet.", href: "/admin/support?unassigned=1" }] : []),
  ];

  return (
    <>
      {denied && (
        <p role="alert" className="border-b border-warning/40 bg-warning-bg px-6 py-2.5 text-[13.5px]">
          That page is not available to your account.
        </p>
      )}
      <CommandCenter data={{ ...data, insights: [...work, ...data.insights] }} name={actor.name.split(" ")[0]} />
    </>
  );
}
