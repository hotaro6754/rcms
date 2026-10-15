import Link from "next/link";
import { requireActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton } from "@/components/admin/ActionForm";
import { Empty, inr, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { cancelSubscriptionAction } from "@/lib/actions/commerce";

export const metadata = { title: "Billing" };

/** The learner's orders, invoices, subscriptions and refunds. */
export default async function BillingPage() {
  const actor = await requireActor();
  const [orders, subs] = await Promise.all([
    prisma.order.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true } }, invoice: { select: { number: true } }, refunds: { select: { amount: true, status: true } } } }),
    prisma.subscription.findMany({ where: { userId: actor.id }, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true } } } }),
  ]);
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-12">
      <Link href="/account" className="text-micro text-muted-foreground hover:text-foreground">
        ← Account
      </Link>
      <PageHead kicker="Billing" title="Orders and invoices" lede="Payments are handled by Razorpay. To ask for a refund, open a support case with the order number." />
      <section className="mt-8">
        <h2 className="text-[1.2rem]">Subscriptions</h2>
        <div className="mt-3">
          {subs.length === 0 ? (
            <Empty title="No subscriptions" />
          ) : (
            <Table head={["Plan", "Status", "Current period ends", ""]}>
              {subs.map((s) => (
                <tr key={s.id}>
                  <Td>{s.product.name}</Td>
                  <Td>
                    <StatusPill status={s.status} />
                    {s.cancelAtPeriodEnd && <span className="ml-2 text-micro text-muted-foreground">ends at period end</span>}
                  </Td>
                  <Td>{when(s.status === "GRACE_PERIOD" ? s.graceEndsAt : s.currentPeriodEnd)}</Td>
                  <Td>
                    {["ACTIVE", "TRIALING"].includes(s.status) && !s.cancelAtPeriodEnd && (
                      <ActionButton action={cancelSubscriptionAction} fields={{ id: s.id }} confirm="Stop this subscription at the end of the current period?">
                        Cancel at period end
                      </ActionButton>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-[1.2rem]">Orders</h2>
        <div className="mt-3">
          {orders.length === 0 ? (
            <Empty title="No orders yet" />
          ) : (
            <Table head={["Order", "Product", "Amount", "Status", "Date", "Invoice"]}>
              {orders.map((o) => (
                <tr key={o.id}>
                  <Td className="text-data text-[12px]">{o.number}</Td>
                  <Td>{o.product.name}</Td>
                  <Td>{inr(o.amount)}</Td>
                  <Td>
                    <StatusPill status={o.state} />
                    {o.refunds.length > 0 && <span className="ml-2 text-micro text-muted-foreground">{o.refunds.map((r) => `${inr(r.amount)} ${r.status.toLowerCase()}`).join(", ")}</span>}
                  </Td>
                  <Td>{when(o.paidAt ?? o.createdAt)}</Td>
                  <Td>{o.invoice ? <Link href={`/account/invoices/${o.id}`} className="underline underline-offset-4">{o.invoice.number}</Link> : "—"}</Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
