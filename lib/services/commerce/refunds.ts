import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { getSetting } from "@/lib/settings";
import { createRefund, paymentsConfigured } from "@/lib/payments/razorpay";
import { flatLessons, type CourseSnapshot } from "@/lib/cms/snapshot";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";

/**
 * Refunds (blueprint §8.5): requested → eligibility checked → reason recorded → approved by a
 * second person (an Academy Director when exceptional) → submitted to the provider →
 * confirmed (by the provider's webhook or a recorded provider reference) → reconciled →
 * subscriber notified.
 *
 * "Exceptional" means outside the published policy (window and course consumption) or above
 * the routine limit. Requester and approver are always different people.
 */

function log(actor: Actor | null, action: Parameters<typeof audit>[0]["action"], id: string, after?: unknown, before?: unknown) {
  return audit({ actorId: actor?.id ?? null, actorRoles: actor?.staffRoles, action, entity: "Refund", entityId: id, after, before });
}

async function consumption(order: { userId: string; product: { programId: string | null } }) {
  if (!order.product.programId) return 0;
  const v = await prisma.program.findUnique({ where: { id: order.product.programId }, select: { publishedVersion: { select: { snapshot: true } } } });
  const lessons = v?.publishedVersion ? flatLessons(v.publishedVersion.snapshot as unknown as CourseSnapshot) : [];
  if (!lessons.length) return 0;
  const done = await prisma.progress.count({ where: { userId: order.userId, lessonId: { in: lessons.map((l) => l.id) }, completedAt: { not: null } } });
  return Math.round((done / lessons.length) * 100);
}

export async function refundableBalance(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { refunds: { where: { status: { notIn: ["REJECTED", "FAILED"] } } } } });
  return order.amount - order.refunds.reduce((n, r) => n + r.amount, 0);
}

const RequestInput = z.object({ amount: z.coerce.number().int().min(1, "Enter an amount."), reason: z.string().trim().min(5, "Record the reason.").max(1000) });

export async function requestRefund(actor: Actor, orderId: string, input: unknown) {
  await assertCan(actor, "refund.request", { entity: "Order", id: orderId });
  const { amount, reason } = RequestInput.parse(input);
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { product: true } });
  if (!order || !["PAID", "PARTIALLY_REFUNDED"].includes(order.state)) throw new ServiceError("Only a paid order can be refunded.");
  const balance = await refundableBalance(orderId);
  if (amount > balance) throw new ServiceError(`At most ₹${(balance / 100).toLocaleString("en-IN")} can still be refunded on this order.`);
  const [windowDays, maxPct, routineLimit, pct] = await Promise.all([getSetting("refund.windowDays"), getSetting("refund.maxConsumptionPct"), getSetting("refund.routineLimit"), consumption(order)]);
  const withinWindow = !!order.paidAt && order.paidAt.getTime() + Number(windowDays) * 86400_000 >= Date.now();
  const policyEligible = withinWindow && pct < Number(maxPct);
  const exceptional = !policyEligible || amount > Number(routineLimit) * 100;
  const refund = await prisma.refund.create({ data: { orderId, amount, reason, status: "REQUESTED", requestedById: actor.id, consumptionPct: pct, policyEligible, exceptional } });
  await log(actor, "request", refund.id, { orderId, amount, policyEligible, exceptional, consumptionPct: pct });
  await notifyPermission(exceptional ? "refund.approve_exceptional" : "refund.approve", { kind: "refund", title: `${exceptional ? "Exceptional refund" : "Refund"} awaiting approval`, body: `₹${(amount / 100).toLocaleString("en-IN")} on ${order.number}`, href: "/admin/finance/refunds" }, actor.id);
  return refund;
}

export async function decideRefund(actor: Actor, refundId: string, approve: boolean, note?: string) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund) throw new ServiceError("That refund no longer exists.");
  await assertCan(actor, refund.exceptional ? "refund.approve_exceptional" : "refund.approve", { entity: "Refund", id: refundId });
  if (refund.status !== "REQUESTED") throw new ServiceError("That refund has already been decided.");
  if (refund.requestedById === actor.id) throw new ServiceError("You requested this refund. A different person must approve it.");
  if (!approve && !note?.trim()) throw new ServiceError("Say why the refund is rejected.");
  const res = await prisma.refund.updateMany({ where: { id: refundId, status: "REQUESTED" }, data: { status: approve ? "APPROVED" : "REJECTED", approvedBy: actor.id, decidedAt: new Date(), decisionNote: note?.trim() || null } });
  if (!res.count) throw new ServiceError("Someone else decided this refund first.");
  await log(actor, approve ? "approve" : "reject", refundId, { note: note ?? null, exceptional: refund.exceptional });
}

/** Sends an approved refund to Razorpay. Confirmation arrives by webhook. */
export async function submitRefund(actor: Actor, refundId: string) {
  await assertCan(actor, "refund.approve", { entity: "Refund", id: refundId });
  const refund = await prisma.refund.findUnique({ where: { id: refundId }, include: { order: { include: { payments: { where: { status: { in: ["successful", "captured", "authorized"] } } } } } } });
  if (!refund || refund.status !== "APPROVED") throw new ServiceError("Only an approved refund can be submitted.");
  if (!paymentsConfigured()) throw new ServiceError("The payment provider is not configured. Process the refund in the provider's dashboard and record its reference here.");
  const payment = refund.order.payments.find((p) => !p.gatewayRef.startsWith("free-"));
  if (!payment) throw new ServiceError("This order has no provider payment to refund.");
  try {
    const r = await createRefund(payment.gatewayRef, refund.amount, refund.id);
    await prisma.refund.update({ where: { id: refundId }, data: { status: r.status === "processed" ? "CONFIRMED" : "SUBMITTED", gatewayRef: r.id, confirmedAt: r.status === "processed" ? new Date() : null } });
    await log(actor, "refund", refundId, { submitted: true, providerRef: r.id, providerStatus: r.status });
    if (r.status === "processed") await afterConfirmed(refundId);
  } catch (error) {
    await prisma.refund.update({ where: { id: refundId }, data: { status: "FAILED", decisionNote: error instanceof Error ? error.message.slice(0, 300) : "Provider error" } });
    await log(actor, "refund", refundId, { submitted: false }, undefined);
    throw new ServiceError("The provider refused the refund. Its message is recorded on the refund.");
  }
}

/** When the refund was made in the provider's dashboard, record its reference. */
export async function recordProviderRefund(actor: Actor, refundId: string, providerRef: string) {
  await assertCan(actor, "payment.reconcile", { entity: "Refund", id: refundId });
  if (!/^[A-Za-z0-9_\-]{6,60}$/.test(providerRef ?? "")) throw new ServiceError("Enter the refund reference exactly as the provider shows it.");
  const refund = await prisma.refund.findUnique({ where: { id: refundId } });
  if (!refund || !["APPROVED", "SUBMITTED"].includes(refund.status)) throw new ServiceError("Only an approved or submitted refund can be confirmed.");
  await prisma.refund.update({ where: { id: refundId }, data: { status: "CONFIRMED", gatewayRef: providerRef, confirmedAt: new Date() } });
  await log(actor, "refund", refundId, { confirmed: true, providerRef, via: "manual_record" });
  await afterConfirmed(refundId);
}

export async function confirmRefundFromProvider(providerRefundId: string, processed: boolean) {
  const refund = await prisma.refund.findUnique({ where: { gatewayRef: providerRefundId } });
  if (!refund || refund.status === "CONFIRMED") return;
  await prisma.refund.update({ where: { id: refund.id }, data: processed ? { status: "CONFIRMED", confirmedAt: new Date() } : { status: "FAILED" } });
  await log(null, "refund", refund.id, { confirmed: processed, via: "webhook" });
  if (processed) await afterConfirmed(refund.id);
}

async function afterConfirmed(refundId: string) {
  const refund = await prisma.refund.findUniqueOrThrow({ where: { id: refundId }, include: { order: { include: { product: true } } } });
  const confirmed = await prisma.refund.aggregate({ where: { orderId: refund.orderId, status: "CONFIRMED" }, _sum: { amount: true } });
  const full = (confirmed._sum.amount ?? 0) >= refund.order.amount;
  await prisma.order.update({ where: { id: refund.orderId }, data: { state: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
  if (full) {
    // Access bought with this order ends; progress, attempts and history are kept.
    await prisma.enrolment.updateMany({ where: { orderId: refund.orderId, state: "ACTIVE" }, data: { state: "REFUNDED" } });
    await prisma.subscription.updateMany({ where: { orderId: refund.orderId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  }
  await prisma.refund.update({ where: { id: refundId }, data: { notifiedAt: new Date() } });
  await notifyUsers([refund.order.userId], { kind: "refund", title: `Refund of ₹${(refund.amount / 100).toLocaleString("en-IN")} processed`, body: "It reaches your account on the provider's usual timeline.", href: "/account/billing" });
}

export async function reconcilePayment(actor: Actor, paymentId: string, status: "RECONCILED" | "EXCEPTION" | "UNRECONCILED", note?: string) {
  await assertCan(actor, "payment.reconcile", { entity: "Payment", id: paymentId });
  if (status === "EXCEPTION" && !note?.trim()) throw new ServiceError("Describe the exception.");
  const before = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!before) throw new ServiceError("That payment no longer exists.");
  await prisma.payment.update({ where: { id: paymentId }, data: { reconciliation: status, reconciledById: actor.id, reconciledAt: new Date(), reconciliationNote: note?.trim() || null } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "reconcile", entity: "Payment", entityId: paymentId, before: { reconciliation: before.reconciliation }, after: { reconciliation: status, note: note ?? null } });
}
