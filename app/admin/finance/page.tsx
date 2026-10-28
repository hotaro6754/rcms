import Link from "next/link";
import type { OrderState, Prisma, ReconciliationStatus } from "@prisma/client";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, inr, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { reconcileAction, requestRefundAction } from "@/lib/actions/commerce";
import { paymentsConfigured, webhooksConfigured } from "@/lib/payments/razorpay";

export const metadata = { title: "Orders and payments" };

const STATES: OrderState[] = ["CREATED", "PENDING", "PAID", "FAILED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"];
const RECON: ReconciliationStatus[] = ["UNRECONCILED", "RECONCILED", "EXCEPTION"];

/** Every order with its payments, invoice, refunds and reconciliation status (blueprint §8.2). */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; reconciliation?: string }> }) {
  const actor = await requirePagePermission("finance.view");
  const sp = await searchParams;
  const where: Prisma.OrderWhereInput = {
    ...(STATES.includes(sp.state as OrderState) ? { state: sp.state as OrderState } : {}),
    ...(RECON.includes(sp.reconciliation as ReconciliationStatus) ? { payments: { some: { reconciliation: sp.reconciliation as ReconciliationStatus } } } : {}),
    ...(sp.q ? { OR: [{ number: { contains: sp.q } }, { user: { email: { contains: sp.q } } }, { gatewayRef: sp.q }] } : {}),
  };
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true } }, product: { select: { name: true } }, payments: true, invoice: { select: { number: true } }, refunds: { select: { amount: true, status: true } } },
  });
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Payments and finance" title="Orders and payments" lede="An order is marked paid only after the server verifies the payment provider's signature. Card details never reach RCMExcel." />
      <p className="mt-4 text-[13px]">
        Razorpay: {paymentsConfigured() ? <span className="text-success">API keys configured</span> : <span className="text-warning">not configured — checkout is disabled</span>} · webhooks:{" "}
        {webhooksConfigured() ? <span className="text-success">secret configured</span> : <span className="text-warning">no secret — events are rejected</span>}
      </p>
      <form className="mt-6 flex flex-wrap items-end gap-3">
        <Field label="Search order, email or provider id" htmlFor="q" className="min-w-[16rem] flex-1">
          <input id="q" name="q" defaultValue={sp.q} className={FIELD} />
        </Field>
        <Field label="Status" htmlFor="state">
          <select id="state" name="state" defaultValue={sp.state ?? ""} className={FIELD}>
            <option value="">Any</option>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Reconciliation" htmlFor="rec">
          <select id="rec" name="reconciliation" defaultValue={sp.reconciliation ?? ""} className={FIELD}>
            <option value="">Any</option>
            {RECON.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <button className={BTN}>Filter</button>
      </form>
      <div className="mt-6">
        {orders.length === 0 ? (
          <Empty title="No orders match." />
        ) : (
          <Table head={["Order", "Customer", "Product", "Amount", "Status", "Payment and reconciliation", ""]} minWidth="72rem">
            {orders.map((o) => (
              <tr key={o.id}>
                <Td>
                  <span className="text-data text-[12px]">{o.number}</span>
                  <span className="block text-[12px] text-muted-foreground">{when(o.createdAt, true)}</span>
                  {o.invoice && (
                    <Link href={`/account/invoices/${o.id}`} className="text-[12px] underline">
                      {o.invoice.number}
                    </Link>
                  )}
                </Td>
                <Td>
                  {can(actor, "subscriber.view") ? (
                    <Link href={`/admin/subscribers/${o.user.id}`} className="hover:underline">
                      {o.user.name}
                    </Link>
                  ) : (
                    o.user.name
                  )}
                  <span className="block text-[12px] text-muted-foreground">{o.user.email}</span>
                </Td>
                <Td>{o.product.name}</Td>
                <Td>
                  {inr(o.amount)}
                  {o.discount > 0 && <span className="block text-[12px] text-muted-foreground">−{inr(o.discount)} discount</span>}
                  {o.tax > 0 && <span className="block text-[12px] text-muted-foreground">{inr(o.tax)} tax</span>}
                </Td>
                <Td>
                  <StatusPill status={o.state} />
                  {o.failureReason && <span className="block text-[12px] text-danger">{o.failureReason}</span>}
                  {o.refunds.map((r, i) => (
                    <span key={i} className="block text-[12px] text-muted-foreground">
                      refund {inr(r.amount)} {r.status.toLowerCase()}
                    </span>
                  ))}
                </Td>
                <Td>
                  {o.payments.map((p) => (
                    <div key={p.id} className="text-[12px]">
                      <span className="text-data">{p.gatewayRef}</span> · {p.method ?? "—"} · {p.status} · <StatusPill status={p.reconciliation} />
                      {p.reconciliationNote && <span className="block text-muted-foreground">{p.reconciliationNote}</span>}
                      {can(actor, "payment.reconcile") && (
                        <ActionForm action={reconcileAction} className="mt-1 flex flex-wrap gap-1">
                          <input type="hidden" name="id" value={p.id} />
                          <select name="status" defaultValue={p.reconciliation} aria-label="Reconciliation status" className="min-h-7 rounded-[3px] border border-input bg-card px-1 text-[11.5px]">
                            {RECON.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                          <input name="note" placeholder="Note" aria-label="Reconciliation note" className="min-h-7 w-28 rounded-[3px] border border-input bg-card px-1.5 text-[11.5px]" />
                          <button className="min-h-7 rounded-[3px] border border-input px-2 text-[11.5px]">Save</button>
                        </ActionForm>
                      )}
                    </div>
                  ))}
                </Td>
                <Td>
                  {can(actor, "refund.request") && ["PAID", "PARTIALLY_REFUNDED"].includes(o.state) && (
                    <details>
                      <summary className="cursor-pointer text-[12.5px] underline">Request refund</summary>
                      <ActionForm action={requestRefundAction} className="mt-2 flex w-56 flex-col gap-1.5" success="Refund requested; it needs a second person's approval.">
                        <input type="hidden" name="orderId" value={o.id} />
                        <input name="amount" type="number" step="0.01" min="1" required placeholder="Amount (₹)" aria-label="Refund amount in rupees" className={FIELD} />
                        <input name="reason" required minLength={5} placeholder="Reason" aria-label="Refund reason" className={FIELD} />
                        <button className="rounded-[3px] border border-input px-2 py-1.5 text-[12.5px]">Request</button>
                      </ActionForm>
                    </details>
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
