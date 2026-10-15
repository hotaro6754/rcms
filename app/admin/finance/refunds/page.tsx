import { requirePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, FIELD, inr, Pill, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { decideRefundAction, recordProviderRefundAction, submitRefundAction } from "@/lib/actions/commerce";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Refunds" };

/** The refund register: request → approval by someone else → provider → confirmation. */
export default async function RefundsPage() {
  const actor = await requirePermission("finance.view");
  const [refunds, windowDays, maxPct, limit] = await Promise.all([
    prisma.refund.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { order: { select: { number: true, amount: true, paidAt: true, user: { select: { name: true } }, product: { select: { name: true } } } } } }),
    getSetting("refund.windowDays"),
    getSetting("refund.maxConsumptionPct"),
    getSetting("refund.routineLimit"),
  ]);
  const people = await prisma.user.findMany({ where: { id: { in: refunds.flatMap((r) => [r.requestedById, r.approvedBy]).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const name = (id: string | null) => people.find((p) => p.id === id)?.name ?? "—";
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Payments and finance" title="Refunds" lede={`Policy: within ${windowDays} days of payment and less than ${maxPct}% of the course completed. Anything outside it, or above ₹${Number(limit).toLocaleString("en-IN")}, is exceptional and needs an Academy Director.`} />
      <div className="mt-8">
        {refunds.length === 0 ? (
          <Empty title="No refunds." />
        ) : (
          <Table head={["Order", "Amount", "Reason and checks", "Requested", "Status", "Next step"]} minWidth="70rem">
            {refunds.map((r) => (
              <tr key={r.id}>
                <Td>
                  <span className="text-data text-[12px]">{r.order.number}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {r.order.user.name} · {r.order.product.name}
                  </span>
                </Td>
                <Td>
                  {inr(r.amount)} <span className="block text-[12px] text-muted-foreground">of {inr(r.order.amount)}</span>
                </Td>
                <Td>
                  {r.reason}
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.exceptional ? <Pill tone="red">exceptional</Pill> : <Pill tone="green">routine</Pill>}
                    {!r.policyEligible && <Pill tone="amber">outside policy</Pill>}
                    <Pill>{r.consumptionPct}% consumed</Pill>
                  </span>
                  {r.decisionNote && <span className="block text-[12px] text-muted-foreground">Decision: {r.decisionNote}</span>}
                </Td>
                <Td>
                  {name(r.requestedById)}
                  <span className="block text-[12px] text-muted-foreground">{when(r.createdAt, true)}</span>
                </Td>
                <Td>
                  <StatusPill status={r.status} />
                  {r.approvedBy && <span className="block text-[12px] text-muted-foreground">by {name(r.approvedBy)}</span>}
                  {r.gatewayRef && <span className="text-data block text-[11px]">{r.gatewayRef}</span>}
                </Td>
                <Td>
                  {r.status === "REQUESTED" && r.requestedById !== actor.id && can(actor, r.exceptional ? "refund.approve_exceptional" : "refund.approve") && (
                    <ActionForm action={decideRefundAction} className="flex flex-col gap-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="note" placeholder="Note (required to reject)" aria-label="Decision note" className={FIELD} />
                      <span className="flex gap-1.5">
                        <button name="decision" value="approve" className="rounded-[3px] bg-primary px-3 py-1.5 text-[12.5px] text-primary-foreground">
                          Approve
                        </button>
                        <button name="decision" value="reject" className="rounded-[3px] border border-input px-3 py-1.5 text-[12.5px]">
                          Reject
                        </button>
                      </span>
                    </ActionForm>
                  )}
                  {r.status === "REQUESTED" && r.requestedById === actor.id && <span className="text-[12px] text-muted-foreground">Waiting for another approver</span>}
                  {r.status === "APPROVED" && can(actor, "refund.approve") && (
                    <ActionButton action={submitRefundAction} fields={{ id: r.id }} confirm="Send this refund to Razorpay?">
                      Submit to provider
                    </ActionButton>
                  )}
                  {["APPROVED", "SUBMITTED"].includes(r.status) && can(actor, "payment.reconcile") && (
                    <ActionForm action={recordProviderRefundAction} className="mt-2 flex gap-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="providerRef" required placeholder="Provider refund id" aria-label="Provider refund reference" className="min-h-8 w-36 rounded-[3px] border border-input bg-card px-2 text-[12px]" />
                      <button className="rounded-[3px] border border-input px-2 text-[12px]">Record</button>
                    </ActionForm>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
