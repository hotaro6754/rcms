import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Empty, inr, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { settlementAction } from "@/lib/actions/vendors";

export const metadata = { title: "Vendor settlements" };

/**
 * Deliverable accepted → invoice received → finance validation → payment approval → payment
 * recorded → reconciled. Each step is a different person; whoever touched a vendor's payout
 * details cannot approve that vendor's payments.
 */
export default async function SettlementsPage() {
  const actor = await requirePagePermission(["finance.view", "settlement.approve"]);
  const invoices = await prisma.vendorInvoice.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { vendor: { select: { legalName: true, payoutLast4: true } }, deliverable: { select: { title: true, status: true, fee: true } } } });
  const people = await prisma.user.findMany({ where: { id: { in: invoices.flatMap((i) => [i.validatedById, i.approvedById, i.paidById]).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const name = (id: string | null) => people.find((p) => p.id === id)?.name;
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Payments and finance" title="Vendor settlements" lede="Payment is recorded here after it is made through the bank or payout provider; RCMExcel does not move vendor money itself." />
      <div className="mt-8">
        {invoices.length === 0 ? (
          <Empty title="No vendor invoices." />
        ) : (
          <Table head={["Vendor", "Invoice", "For", "Amount", "Status", "Trail", "Next step"]} minWidth="72rem">
            {invoices.map((i) => (
              <tr key={i.id}>
                <Td>
                  {i.vendor.legalName}
                  <span className="block text-[12px] text-muted-foreground">payout ••{i.vendor.payoutLast4 ?? "—"}</span>
                </Td>
                <Td className="text-data text-[12px]">
                  {i.number}
                  <span className="block">{when(i.createdAt)}</span>
                </Td>
                <Td>
                  {i.deliverable ? (
                    <>
                      {i.deliverable.title}
                      <span className="block text-[12px] text-muted-foreground">
                        {i.deliverable.status.toLowerCase()} · fee {inr(i.deliverable.fee)}
                      </span>
                    </>
                  ) : (
                    "General"
                  )}
                </Td>
                <Td>{inr(i.amount)}</Td>
                <Td>
                  <StatusPill status={i.status} />
                  {i.rejectReason && <span className="block text-[12px] text-danger">{i.rejectReason}</span>}
                </Td>
                <Td className="text-[12px] text-muted-foreground">
                  {name(i.validatedById) && <span className="block">validated: {name(i.validatedById)}</span>}
                  {name(i.approvedById) && <span className="block">approved: {name(i.approvedById)}</span>}
                  {name(i.paidById) && (
                    <span className="block">
                      paid: {name(i.paidById)} ({i.paymentRef})
                    </span>
                  )}
                </Td>
                <Td>
                  {i.status === "SUBMITTED" && can(actor, "settlement.validate") && (
                    <div className="flex flex-col gap-1.5">
                      <ActionButton action={settlementAction} fields={{ id: i.id, op: "validate" }}>
                        Validate
                      </ActionButton>
                      <ActionForm action={settlementAction} className="flex gap-1">
                        <input type="hidden" name="id" value={i.id} />
                        <input type="hidden" name="op" value="reject" />
                        <input name="reason" required placeholder="Reason" aria-label="Reason for rejection" className="min-h-8 w-32 rounded-[3px] border border-input bg-card px-2 text-[12px]" />
                        <button className="rounded-[3px] border border-input px-2 text-[12px]">Reject</button>
                      </ActionForm>
                    </div>
                  )}
                  {i.status === "VALIDATED" && can(actor, "settlement.approve") && (
                    <ActionButton action={settlementAction} fields={{ id: i.id, op: "approve" }} variant="default" confirm="Approve this vendor payment?">
                      Approve payment
                    </ActionButton>
                  )}
                  {i.status === "APPROVED" && can(actor, "settlement.pay") && (
                    <ActionForm action={settlementAction} className="flex gap-1">
                      <input type="hidden" name="id" value={i.id} />
                      <input type="hidden" name="op" value="pay" />
                      <input name="paymentRef" required placeholder="Transaction ref" aria-label="Payment reference" className="min-h-8 w-36 rounded-[3px] border border-input bg-card px-2 text-[12px]" />
                      <button className="rounded-[3px] border border-input px-2 text-[12px]">Record paid</button>
                    </ActionForm>
                  )}
                  {i.status === "PAID" && can(actor, "payment.reconcile") && (
                    <ActionButton action={settlementAction} fields={{ id: i.id, op: "reconcile" }}>
                      Mark reconciled
                    </ActionButton>
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
