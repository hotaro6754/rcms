import Link from "next/link";
import { requireActor, can, isStaff } from "@/lib/actor";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHead, Ruled } from "@/components/platform/PlatformShell";
import { BoardView } from "@/components/admin/BoardView";
import { board } from "@/lib/services/reports/dashboards";
import { runDueApprovals } from "@/lib/services/approvals";
import { runScheduledPublications } from "@/lib/services/cms/release";
import { ROLE_LABEL } from "@/lib/permissions";
import { when } from "@/components/admin/kit";

export const metadata = { title: "Admin Control Center" };

/**
 * The command centre's front page: the work waiting for this person (by their permissions),
 * then the executive dashboard for those allowed to see it. Due scheduled releases and
 * approved changes with an effective date are applied on the way in, as a backstop to the
 * cron route.
 */
export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const actor = await requireActor();
  if (!isStaff(actor)) redirect("/account");
  await Promise.all([runScheduledPublications().catch(() => []), runDueApprovals().catch(() => undefined)]);

  const [toReviewAcademic, toReviewCompliance, toPublish, toGrade, myTickets, unassigned, approvals, invoices, privacy, recentAudit] = await Promise.all([
    can(actor, "content.review.academic") ? prisma.program.count({ where: { status: "ACADEMIC_REVIEW" } }) : 0,
    can(actor, "content.review.compliance") ? prisma.program.count({ where: { status: "COMPLIANCE_REVIEW" } }) : 0,
    can(actor, "content.publish") ? prisma.program.count({ where: { status: "APPROVED" } }) : 0,
    can(actor, "assessment.grade") ? prisma.quizAttempt.count({ where: { status: "PENDING_REVIEW" } }) : 0,
    can(actor, "support.view_assigned") ? prisma.supportTicket.count({ where: { assigneeId: actor.id, status: { notIn: ["RESOLVED", "CLOSED"] } } }) : 0,
    can(actor, "support.assign") ? prisma.supportTicket.count({ where: { assigneeId: null, status: { notIn: ["RESOLVED", "CLOSED"] } } }) : 0,
    prisma.approvalRequest.findMany({ where: { status: "PENDING", requestedById: { not: actor.id } }, select: { kind: true } }),
    can(actor, "settlement.validate") || can(actor, "settlement.approve") ? prisma.vendorInvoice.count({ where: { status: { in: ["SUBMITTED", "VALIDATED"] } } }) : 0,
    can(actor, "subscriber.privacy") ? prisma.privacyRequest.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }) : 0,
    can(actor, "audit.view") ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, action: true, entity: true, outcome: true, createdAt: true, actor: { select: { name: true } } } }) : [],
  ]);
  const { HANDLERS } = await import("@/lib/services/approvals");
  const myApprovals = approvals.filter((a) => can(actor, HANDLERS[a.kind].approve)).length;

  const work = [
    { n: toReviewAcademic, label: "courses waiting for academic review", href: "/admin/content/review" },
    { n: toReviewCompliance, label: "courses waiting for compliance review", href: "/admin/content/review" },
    { n: toPublish, label: "approved courses ready to publish", href: "/admin/content/review" },
    { n: toGrade, label: "assessment attempts to mark", href: "/admin/grading" },
    { n: myTickets, label: "support cases assigned to you", href: "/admin/support?mine=1" },
    { n: unassigned, label: "unassigned support cases", href: "/admin/support?unassigned=1" },
    { n: myApprovals, label: "requests waiting for your approval", href: "/admin/approvals" },
    { n: invoices, label: "vendor invoices in the settlement workflow", href: "/admin/finance/settlements" },
    { n: privacy, label: "open privacy requests", href: "/admin/privacy" },
  ].filter((w) => w.n > 0);

  const exec = can(actor, "reports.view") ? await board(actor, "executive") : null;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Admin Control Center" title={`Hello, ${actor.name.split(" ")[0]}.`} lede={`Signed in as ${actor.staffRoles.map((r) => ROLE_LABEL[r]).join(", ")}. What you can see and do here follows those roles.`} />

      {denied && (
        <p role="alert" className="mt-6 border-l-2 border-warning pl-3 text-[14px]">
          Your roles do not include access to that page. If you need it, ask an administrator to request a role change.
        </p>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Ruled label="Waiting for you">
          {work.length === 0 ? (
            <p className="py-5 text-[14px] text-muted-foreground">Nothing is waiting for you.</p>
          ) : (
            <ul>
              {work.map((w) => (
                <li key={w.label} className="border-b border-border">
                  <Link href={w.href} className="flex items-baseline gap-4 py-3.5 hover:underline hover:underline-offset-4">
                    <span className="font-serif-display w-12 text-[1.8rem] leading-none">{w.n}</span>
                    <span className="text-[14px]">{w.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Ruled>
        {recentAudit.length > 0 && (
          <Ruled label="Audit trail" aside={<Link href="/admin/audit" className="text-data text-[10.5px] tracking-[0.1em] text-subtle hover:text-foreground">ALL →</Link>}>
            <ul>
              {recentAudit.map((a) => (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border py-2.5 text-[13px]">
                  <span>
                    <span className={`text-data mr-2 text-[10.5px] uppercase tracking-[0.08em] ${a.outcome === "success" ? "text-subtle" : "text-danger"}`}>{a.action}</span>
                    {a.entity}
                    {a.actor?.name && <span className="text-muted-foreground"> · {a.actor.name}</span>}
                  </span>
                  <span className="text-data text-[11px] text-subtle">{when(a.createdAt, true)}</span>
                </li>
              ))}
            </ul>
          </Ruled>
        )}
      </div>

      {exec && (
        <section className="mt-14">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[1.4rem]">Executive dashboard</h2>
            <Link href="/admin/reports" className="text-[13px] underline underline-offset-4">
              All dashboards
            </Link>
          </div>
          <BoardView board={exec} />
        </section>
      )}
    </div>
  );
}
