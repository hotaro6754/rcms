import { notFound } from "next/navigation";
import { requireActor, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { inr, when } from "@/components/admin/kit";
import { PrintButton } from "@/components/certificates/PrintButton";
import { Wordmark } from "@/components/brand/Wordmark";

export const metadata = { title: "Invoice" };

/** A printable invoice/receipt, for the buyer or finance staff only. */
export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { invoice: true, product: true, user: { select: { name: true, email: true } }, payments: true, refunds: { where: { status: "CONFIRMED" } } } });
  if (!order || (order.userId !== actor.id && !can(actor, "finance.view"))) notFound();
  if (order.userId !== actor.id) await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "download", entity: "Invoice", entityId: order.invoice?.id ?? id });
  const paid = (await searchParams).paid;
  return (
    <div className="mx-auto max-w-[760px] px-6 py-12">
      {paid && order.state === "PAID" && <p role="status" className="mb-6 border-l-2 border-success bg-success-bg px-4 py-3 text-[14px] text-success">Payment verified. Your access is ready in My academy.</p>}
      {paid && order.state !== "PAID" && <p role="status" className="mb-6 border-l-2 border-warning bg-warning-bg px-4 py-3 text-[14px] text-warning">We are still confirming this payment with the provider. This page updates once it is confirmed.</p>}
      <article className="rounded-[var(--radius)] border border-border bg-card p-8 print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-[1.4rem]"><Wordmark /></p>
            <p className="mt-1 text-[12px] text-muted-foreground">{process.env.BUSINESS_LEGAL_NAME ?? "Legal name not configured"}{process.env.BUSINESS_GSTIN ? ` · GSTIN ${process.env.BUSINESS_GSTIN}` : ""}</p>
          </div>
          <div className="text-right text-[13px]">
            <p className="text-[1.1rem] font-semibold">{order.invoice ? "Tax invoice / receipt" : "Order"}</p>
            <p>{order.invoice?.number ?? order.number}</p>
            <p className="text-muted-foreground">{when(order.invoice?.issuedAt ?? order.createdAt)}</p>
          </div>
        </header>
        <p className="mt-5 text-[13.5px]">
          Billed to {order.user.name} · {order.user.email}
        </p>
        <table className="mt-5 w-full text-left text-[13.5px]">
          <thead className="border-b border-border">
            <tr>
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2">
                {order.product.name}
                {order.invoice?.hsnSac && <span className="block text-[12px] text-muted-foreground">SAC {order.invoice.hsnSac}</span>}
              </td>
              <td className="py-2 text-right">{inr(order.subtotal || order.amount)}</td>
            </tr>
            {order.discount > 0 && (
              <tr>
                <td className="py-1">Discount</td>
                <td className="py-1 text-right">−{inr(order.discount)}</td>
              </tr>
            )}
            {order.tax > 0 && (
              <tr>
                <td className="py-1 text-muted-foreground">Tax included</td>
                <td className="py-1 text-right text-muted-foreground">{inr(order.tax)}</td>
              </tr>
            )}
            <tr>
              <td className="py-2 font-semibold">Total {order.state === "PAID" ? "paid" : ""}</td>
              <td className="py-2 text-right font-semibold">{inr(order.amount)}</td>
            </tr>
            {order.refunds.map((r) => (
              <tr key={r.id}>
                <td className="py-1 text-muted-foreground">Refunded {when(r.confirmedAt)}</td>
                <td className="py-1 text-right text-muted-foreground">−{inr(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-5 text-[12px] text-muted-foreground">
          Order {order.number} · status {order.state.toLowerCase()} · paid via {order.provider} {order.payments[0] ? `(${order.payments[0].gatewayRef})` : ""}
        </p>
      </article>
      <div className="mt-5 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
