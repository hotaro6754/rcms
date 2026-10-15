import { requireActor, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, FIELD, Panel, StatusPill, when } from "@/components/admin/kit";
import { cancelApprovalAction, decideApprovalAction } from "@/lib/actions/admin";
import { APPROVAL_LABEL, HANDLERS } from "@/lib/services/approvals";

export const metadata = { title: "Approvals" };

/** Maker-checker inbox: what is waiting for me, what I asked for, and (with approvals.view) everything. */
export default async function ApprovalsPage() {
  const actor = await requireActor();
  const decidable = Object.entries(HANDLERS).filter(([, h]) => can(actor, h.approve)).map(([k]) => k);
  const viewAll = can(actor, "approvals.view");
  if (!decidable.length && !viewAll && !can(actor, "roles.request")) redirect("/admin");

  const [pending, mine, history] = await Promise.all([
    prisma.approvalRequest.findMany({ where: { status: "PENDING", kind: { in: decidable as never[] } }, orderBy: { createdAt: "asc" } }),
    prisma.approvalRequest.findMany({ where: { requestedById: actor.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    viewAll ? prisma.approvalRequest.findMany({ where: { status: { not: "PENDING" } }, orderBy: { updatedAt: "desc" }, take: 50 }) : Promise.resolve([]),
  ]);
  const ids = [...new Set([...pending, ...mine, ...history].flatMap((r) => [r.requestedById, r.decidedById]).filter(Boolean) as string[])];
  const people = Object.fromEntries((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Administration" title="Approvals" lede="Sensitive changes need a second person: role changes, prices, vendor payout details, large exports, configuration, progress resets and permanent deletions. The requester can never approve their own request." />

      <section className="mt-8">
        <h2 className="label-caps mb-3">Waiting for you</h2>
        {pending.filter((r) => r.requestedById !== actor.id).length === 0 ? (
          <Empty title="Nothing waiting for your decision." />
        ) : (
          <ul className="flex flex-col gap-3">
            {pending
              .filter((r) => r.requestedById !== actor.id)
              .map((r) => (
                <li key={r.id} className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
                  <p className="text-micro text-muted-foreground">
                    {APPROVAL_LABEL[r.kind]} · requested by {people[r.requestedById] ?? "unknown"} · {when(r.createdAt, true)}
                  </p>
                  <p className="mt-1 text-[15px] font-medium">{r.summary}</p>
                  <p className="mt-1 text-[13.5px]">Reason: {r.reason}</p>
                  <ActionForm action={decideApprovalAction} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input name="note" placeholder="Note (required to reject)" aria-label="Decision note" className={`${FIELD} max-w-sm`} />
                    <button name="decision" value="approve" className="rounded-[3px] bg-primary px-3 py-1.5 text-[13px] text-primary-foreground">
                      Approve
                    </button>
                    <button name="decision" value="reject" className="rounded-[3px] border border-input px-3 py-1.5 text-[13px]">
                      Reject
                    </button>
                  </ActionForm>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="label-caps mb-3">Your requests</h2>
        {mine.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">You have not requested anything.</p>
        ) : (
          <ul className="divide-y divide-border">
            {mine.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-[13.5px]">
                <StatusPill status={r.status} /> {r.summary}
                <span className="text-micro text-muted-foreground">
                  {when(r.createdAt)}
                  {r.decidedById && ` · ${people[r.decidedById]}`}
                  {r.decisionNote && ` · “${r.decisionNote}”`}
                  {r.failure && ` · ${r.failure}`}
                </span>
                {r.status === "PENDING" && (
                  <ActionButton action={cancelApprovalAction} fields={{ id: r.id }} className="ml-auto">
                    Cancel
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {viewAll && (
        <Panel title="Decided recently" className="mt-10">
          <ul className="divide-y divide-border text-[13px]">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-1.5">
                <StatusPill status={r.status} /> {APPROVAL_LABEL[r.kind]}: {r.summary}
                <span className="text-micro text-muted-foreground">
                  {people[r.requestedById]} → {r.decidedById ? people[r.decidedById] : "—"} · {when(r.decidedAt ?? r.updatedAt, true)}
                </span>
              </li>
            ))}
            {history.length === 0 && <li className="text-muted-foreground">None.</li>}
          </ul>
        </Panel>
      )}
    </div>
  );
}
