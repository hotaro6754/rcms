import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { fulfil, markFailed } from "./checkout";
import { confirmRefundFromProvider } from "./refunds";

/**
 * Razorpay webhooks. Order of operations:
 *
 *   1. Verify the HMAC signature over the raw body. Unsigned or mis-signed requests are
 *      rejected and audited; nothing in their body is read.
 *   2. Record the event id (unique). A replay is acknowledged and ignored.
 *   3. Apply it through the same idempotent functions the checkout uses.
 *
 * Returns the HTTP status to send. Razorpay retries on non-2xx, so a processing error
 * returns 500 and the event row is marked failed for the integration-failure dashboard.
 */

interface RzpEvent {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; amount: number; method?: string; status: string; error_description?: string | null } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status: string } };
    dispute?: { entity: { id: string; payment_id: string } };
  };
}

export async function handleRazorpayWebhook(rawBody: string, signature: string | null, eventIdHeader: string | null): Promise<{ status: number; body: string }> {
  if (!verifyWebhookSignature(rawBody, signature)) {
    await audit({ action: "webhook", entity: "WebhookEvent", outcome: "denied", after: { provider: "razorpay", reason: "bad_signature" } });
    return { status: 400, body: "invalid signature" };
  }
  let evt: RzpEvent;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: "invalid json" };
  }
  const eventId = eventIdHeader ?? `${evt.event}:${evt.payload.payment?.entity.id ?? evt.payload.refund?.entity.id ?? ""}`;
  let record;
  try {
    record = await prisma.webhookEvent.create({ data: { provider: "razorpay", eventId, type: evt.event } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const prior = await prisma.webhookEvent.findUnique({ where: { provider_eventId: { provider: "razorpay", eventId } } });
      // Processed before: acknowledge. Failed before: process again (Razorpay is retrying).
      if (prior?.status !== "failed") return { status: 200, body: "duplicate" };
      record = prior;
    } else throw error;
  }

  try {
    const p = evt.payload.payment?.entity;
    switch (evt.event) {
      case "payment.captured":
      case "order.paid": {
        if (!p) break;
        const order = await prisma.order.findUnique({ where: { gatewayRef: p.order_id } });
        if (order) await fulfil(order.id, { gatewayRef: p.id, amount: p.amount, method: p.method ?? null, status: "successful", provider: "razorpay", raw: { event: evt.event, status: p.status } });
        break;
      }
      case "payment.failed": {
        if (!p) break;
        const order = await prisma.order.findUnique({ where: { gatewayRef: p.order_id } });
        if (order) await markFailed(order.id, p.error_description ?? "Payment failed at the provider");
        break;
      }
      case "refund.processed":
      case "refund.failed": {
        const r = evt.payload.refund?.entity;
        if (r) await confirmRefundFromProvider(r.id, evt.event === "refund.processed");
        break;
      }
      case "payment.dispute.created": {
        const d = evt.payload.dispute?.entity;
        const payment = d ? await prisma.payment.findUnique({ where: { gatewayRef: d.payment_id } }) : null;
        if (payment) {
          await prisma.order.update({ where: { id: payment.orderId }, data: { state: "DISPUTED" } });
          await prisma.payment.update({ where: { id: payment.id }, data: { reconciliation: "EXCEPTION", reconciliationNote: "Dispute opened at the provider" } });
        }
        break;
      }
      default:
        break;
    }
    await prisma.webhookEvent.update({ where: { id: record.id }, data: { status: "processed", processedAt: new Date(), error: null } });
    await audit({ action: "webhook", entity: "WebhookEvent", entityId: record.id, after: { provider: "razorpay", type: evt.event } });
    return { status: 200, body: "ok" };
  } catch (error) {
    await prisma.webhookEvent.update({ where: { id: record.id }, data: { status: "failed", error: error instanceof Error ? error.message.slice(0, 500) : String(error) } });
    await audit({ action: "webhook", entity: "WebhookEvent", entityId: record.id, outcome: "failure", after: { provider: "razorpay", type: evt.event } });
    return { status: 500, body: "processing failed" };
  }
}
