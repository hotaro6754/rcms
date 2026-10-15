import type { Order, Prisma, Product } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { sendMail } from "@/lib/email";
import * as rzp from "@/lib/payments/razorpay";
import { notifyUsers } from "@/lib/services/people/staff-lookup";

/**
 * Orders, checkout and fulfilment.
 *
 * An order is marked paid in exactly one place, `fulfil`, and only after the server has
 * verified the payment: either the Checkout signature (HMAC of order and payment ids with
 * the key secret) or a signed webhook. A browser landing on a "success" URL proves nothing
 * and changes nothing. `fulfil` is idempotent: the payment id is unique and the order moves
 * to PAID by a conditional update, so a replayed webhook or a double callback grants access
 * once.
 */

type Tx = Prisma.TransactionClient;

export async function nextNumber(tx: Tx, key: string, prefix: string) {
  const year = new Date().getFullYear();
  const row = await tx.counter.upsert({ where: { key: `${key}-${year}` }, create: { key: `${key}-${year}`, value: 1 }, update: { value: { increment: 1 } } });
  return `${prefix}-${year}-${String(row.value).padStart(5, "0")}`;
}

export function price(product: Pick<Product, "amount" | "taxPercent">, coupon?: { percentOff: number | null; amountOff: number | null } | null) {
  const subtotal = product.amount;
  let discount = 0;
  if (coupon?.percentOff) discount = Math.round((subtotal * coupon.percentOff) / 100);
  else if (coupon?.amountOff) discount = coupon.amountOff;
  discount = Math.max(0, Math.min(subtotal, discount));
  const amount = subtotal - discount;
  // Prices are tax-inclusive; the tax portion is shown on the invoice.
  const tax = product.taxPercent ? Math.round((amount * product.taxPercent) / (100 + product.taxPercent)) : 0;
  return { subtotal, discount, amount, tax };
}

async function validCoupon(code: string | null | undefined) {
  if (!code?.trim()) return null;
  const c = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!c || !c.active || (c.expiresAt && c.expiresAt < new Date()) || (c.maxRedemptions !== null && c.redeemed >= c.maxRedemptions)) {
    throw new ServiceError("That coupon is not valid.", "coupon");
  }
  return c;
}

async function assertPurchasable(actor: Actor, product: Product) {
  if (!product.active) throw new ServiceError("This product is not on sale.");
  if (product.kind === "PROGRAM") {
    const course = await prisma.program.findUnique({ where: { id: product.programId ?? "" }, select: { state: true, publishedVersionId: true } });
    if (!course || course.state !== "PUBLISHED" || !course.publishedVersionId) throw new ServiceError("This course is not available yet.");
    const e = await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId: product.programId! } } });
    if (e && (e.state === "ACTIVE" || e.state === "COMPLETED") && (!e.expiresAt || e.expiresAt > new Date())) throw new ServiceError("You already have access to this course.");
  }
  if (product.kind === "MENTORING" || product.kind === "CORPORATE") throw new ServiceError("This is arranged with the team directly. Use the contact form.");
}

export async function quote(actor: Actor, sku: string, couponCode?: string | null) {
  const product = await prisma.product.findUnique({ where: { sku } });
  if (!product) throw new ServiceError("That product does not exist.");
  await assertPurchasable(actor, product);
  const coupon = await validCoupon(couponCode);
  return { product, coupon, ...price(product, coupon) };
}

/** Creates the order here and at Razorpay, and returns what Checkout needs to open. */
export async function startCheckout(actor: Actor, sku: string, couponCode?: string | null) {
  const q = await quote(actor, sku, couponCode);
  if (q.amount > 0 && !rzp.paymentsConfigured()) throw new ServiceError("Online payment is not set up yet. Contact us to enrol.");
  // Reuse a recent unpaid order for the same thing rather than piling up duplicates.
  const recent = await prisma.order.findFirst({
    where: { userId: actor.id, productId: q.product.id, state: "PENDING", amount: q.amount, couponId: q.coupon?.id ?? null, createdAt: { gte: new Date(Date.now() - 30 * 60_000) }, gatewayRef: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { orderId: recent.id, gatewayOrderId: recent.gatewayRef!, amount: recent.amount, currency: recent.currency, keyId: rzp.publicKeyId(), product: q.product.name, free: false };

  const order = await prisma.$transaction(async (tx) =>
    tx.order.create({
      data: { number: await nextNumber(tx, "order", "ORD"), userId: actor.id, productId: q.product.id, amount: q.amount, subtotal: q.subtotal, discount: q.discount, tax: q.tax, currency: q.product.currency, couponId: q.coupon?.id ?? null, state: "CREATED" },
    }),
  );
  await audit({ actorId: actor.id, action: "purchase", entity: "Order", entityId: order.id, after: { sku, amount: q.amount, coupon: q.coupon?.code ?? null } });

  if (q.amount === 0) {
    // A 100% coupon: nothing to collect, so there is no provider payment to verify.
    await fulfil(order.id, { gatewayRef: `free-${order.id}`, amount: 0, method: "coupon", status: "successful", provider: "none" });
    return { orderId: order.id, gatewayOrderId: null, amount: 0, currency: order.currency, keyId: "", product: q.product.name, free: true };
  }

  let gateway: rzp.RzpOrder;
  try {
    gateway = await rzp.createOrder({ amount: q.amount, currency: q.product.currency, receipt: order.number!, notes: { orderId: order.id, sku } });
  } catch (error) {
    await prisma.order.update({ where: { id: order.id }, data: { state: "FAILED", failureReason: "Could not create the provider order" } });
    await audit({ actorId: actor.id, action: "payment", entity: "Order", entityId: order.id, outcome: "failure", after: { stage: "create_provider_order", error: error instanceof Error ? error.message : String(error) } });
    throw new ServiceError("The payment provider could not be reached. Try again in a minute.");
  }
  if (gateway.amount !== q.amount) throw new ServiceError("The payment provider returned a different amount. Nothing was charged.");
  await prisma.order.update({ where: { id: order.id }, data: { gatewayRef: gateway.id, state: "PENDING" } });
  return { orderId: order.id, gatewayOrderId: gateway.id, amount: q.amount, currency: order.currency, keyId: rzp.publicKeyId(), product: q.product.name, free: false };
}

/** Checkout's success callback. Trusts nothing but the signature, made with our key secret. */
export async function confirmCheckout(actor: Actor, orderId: string, paymentId: string, signature: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== actor.id) throw new ServiceError("That order was not found.");
  if (order.state === "PAID") return order;
  if (!order.gatewayRef || !rzp.verifyCheckoutSignature(order.gatewayRef, paymentId, signature)) {
    await audit({ actorId: actor.id, action: "payment", entity: "Order", entityId: orderId, outcome: "denied", after: { reason: "bad_signature" } });
    throw new ServiceError("The payment could not be verified. If you were charged, it will be confirmed automatically or refunded; contact support with your order number.");
  }
  // Belt and braces: ask Razorpay what it actually holds for this payment.
  let payment: { amount: number; method?: string; status: string } = { amount: order.amount, status: "captured" };
  try {
    const p = await rzp.fetchPayment(paymentId);
    if (p.order_id !== order.gatewayRef) throw new ServiceError("That payment belongs to a different order.");
    payment = p;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    // The signature already proves Razorpay issued this payment for this order; the webhook
    // will reconcile amount and status if the API is unreachable right now.
  }
  if (payment.status === "failed") throw new ServiceError("The payment failed. Nothing was charged.");
  await fulfil(orderId, { gatewayRef: paymentId, amount: payment.amount, method: payment.method ?? null, status: payment.status === "authorized" ? "authorized" : "successful", provider: "razorpay" });
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}

export interface VerifiedPayment {
  gatewayRef: string;
  amount: number;
  method: string | null;
  status: string;
  provider: string;
  raw?: unknown;
}

/**
 * The one place an order becomes paid and access is granted. Safe to call any number of
 * times with the same payment.
 */
export async function fulfil(orderId: string, payment: VerifiedPayment): Promise<{ granted: boolean; order: Order }> {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { product: true } });
    const existingPayment = await tx.payment.findUnique({ where: { gatewayRef: payment.gatewayRef } });
    if (!existingPayment) {
      await tx.payment.create({
        data: {
          orderId,
          gatewayRef: payment.gatewayRef,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          rawPayload: (payment.raw ?? undefined) as never,
          reconciliation: payment.amount === order.amount ? "UNRECONCILED" : "EXCEPTION",
          reconciliationNote: payment.amount === order.amount ? null : `Paid ${payment.amount}, expected ${order.amount}`,
        },
      });
    }
    if (payment.amount !== order.amount) return { granted: false, order, mismatch: true };
    const moved = await tx.order.updateMany({ where: { id: orderId, state: { in: ["CREATED", "PENDING", "FAILED"] } }, data: { state: "PAID", paidAt: new Date(), failureReason: null } });
    if (moved.count === 0) return { granted: false, order, mismatch: false };

    await grant(tx, order);
    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { redeemed: { increment: 1 } } });
    await tx.invoice.create({
      data: { orderId, number: await nextNumber(tx, "invoice", "INV"), gstin: process.env.BUSINESS_GSTIN ?? null, hsnSac: process.env.BUSINESS_SAC ?? null, taxAmount: order.tax, totalAmount: order.amount },
    });
    // A learner whose payment problem is now resolved becomes active again.
    await tx.user.updateMany({ where: { id: order.userId, status: { in: ["PAYMENT_PENDING", "PAYMENT_FAILED", "GRACE_PERIOD"] } }, data: { status: "ACTIVE" } });
    return { granted: true, order, mismatch: false };
  });

  if (result.mismatch) {
    await audit({ action: "payment", entity: "Order", entityId: orderId, outcome: "failure", after: { reason: "amount_mismatch", paid: payment.amount, expected: result.order.amount } });
  }
  if (result.granted) {
    await audit({ action: "payment", entity: "Order", entityId: orderId, after: { state: "PAID", gatewayRef: payment.gatewayRef, amount: payment.amount, provider: payment.provider } });
    const user = await prisma.user.findUnique({ where: { id: result.order.userId }, select: { email: true, name: true } });
    const full = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { product: true, invoice: true } });
    await notifyUsers([result.order.userId], { kind: "payment", title: `Payment received: ${full.product.name}`, body: `Invoice ${full.invoice?.number}.`, href: `/account/invoices/${orderId}` });
    if (user) {
      await sendMail({
        to: user.email,
        subject: `Receipt ${full.invoice?.number} — RCMS Operations Academy`,
        text: [`Hello ${user.name},`, "", `We received ₹${(full.amount / 100).toLocaleString("en-IN")} for ${full.product.name}.`, `Order ${full.number}, invoice ${full.invoice?.number}.`, "", `Your invoice: ${process.env.BETTER_AUTH_URL ?? ""}/account/invoices/${orderId}`].join("\n"),
      }).catch((e) => console.error("[checkout] receipt email failed", e));
    }
  }
  return { granted: result.granted, order: await prisma.order.findUniqueOrThrow({ where: { id: orderId } }) };
}

async function grant(tx: Tx, order: Order & { product: Product }) {
  const p = order.product;
  if (p.kind === "PROGRAM" && p.programId) {
    await tx.enrolment.upsert({
      where: { userId_programId: { userId: order.userId, programId: p.programId } },
      create: { userId: order.userId, programId: p.programId, source: "PURCHASE", orderId: order.id, orgId: order.orgId },
      update: { state: "ACTIVE", source: "PURCHASE", orderId: order.id, expiresAt: null },
    });
  }
  if (p.kind === "TRACK") {
    const courses = await tx.program.findMany({ where: p.includes.length ? { slug: { in: p.includes } } : { levelId: p.levelId ?? "__none__", state: "PUBLISHED" }, select: { id: true } });
    for (const c of courses) {
      await tx.enrolment.upsert({
        where: { userId_programId: { userId: order.userId, programId: c.id } },
        create: { userId: order.userId, programId: c.id, source: "PURCHASE", orderId: order.id },
        update: { state: "ACTIVE", source: "PURCHASE", orderId: order.id, expiresAt: null },
      });
    }
  }
  if (p.kind === "SUBSCRIPTION" && p.interval) {
    const now = new Date();
    const current = await tx.subscription.findFirst({ where: { userId: order.userId, productId: p.id, status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } }, orderBy: { currentPeriodEnd: "desc" } });
    const from = current && current.currentPeriodEnd > now ? current.currentPeriodEnd : now;
    const end = new Date(from);
    if (p.interval === "MONTH") end.setMonth(end.getMonth() + 1);
    else end.setFullYear(end.getFullYear() + 1);
    if (current) await tx.subscription.update({ where: { id: current.id }, data: { status: "ACTIVE", currentPeriodEnd: end, graceEndsAt: null } });
    else await tx.subscription.create({ data: { userId: order.userId, productId: p.id, orderId: order.id, status: "ACTIVE", currentPeriodEnd: end } });
  }
}

export async function markFailed(orderId: string, reason: string) {
  const res = await prisma.order.updateMany({ where: { id: orderId, state: { in: ["CREATED", "PENDING"] } }, data: { state: "FAILED", failureReason: reason.slice(0, 300) } });
  if (res.count) {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    await audit({ action: "payment", entity: "Order", entityId: orderId, outcome: "failure", after: { reason } });
    await notifyUsers([order.userId], { kind: "payment", title: "Your payment did not go through", body: "Nothing was charged. You can try again from the course page.", href: "/account/billing" });
  }
}

/**
 * Subscriptions are prepaid terms (monthly or annual). When a term ends the subscription
 * enters its grace period, then expires. Run daily by the cron route; safe to run any time.
 */
export async function runSubscriptionLifecycle(now = new Date()) {
  const ending = await prisma.subscription.findMany({ where: { status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { lte: now } }, include: { product: true } });
  for (const s of ending) {
    const graceEndsAt = new Date(s.currentPeriodEnd.getTime() + s.product.graceDays * 86400_000);
    if (s.product.graceDays > 0 && graceEndsAt > now && !s.cancelAtPeriodEnd) {
      await prisma.subscription.update({ where: { id: s.id }, data: { status: "GRACE_PERIOD", graceEndsAt } });
      await prisma.user.updateMany({ where: { id: s.userId, status: "ACTIVE" }, data: { status: "GRACE_PERIOD" } });
      await notifyUsers([s.userId], { kind: "subscription", title: `${s.product.name} has ended — renew within ${s.product.graceDays} days`, href: "/account/billing" });
    } else {
      await prisma.subscription.update({ where: { id: s.id }, data: { status: s.cancelAtPeriodEnd ? "CANCELLED" : "EXPIRED" } });
    }
    await audit({ action: "update", entity: "Subscription", entityId: s.id, after: { lifecycle: "period_end" } });
  }
  const lapsed = await prisma.subscription.findMany({ where: { status: "GRACE_PERIOD", graceEndsAt: { lte: now } } });
  for (const s of lapsed) {
    await prisma.subscription.update({ where: { id: s.id }, data: { status: "EXPIRED" } });
    await prisma.user.updateMany({ where: { id: s.userId, status: "GRACE_PERIOD" }, data: { status: "ACTIVE" } });
    await audit({ action: "update", entity: "Subscription", entityId: s.id, after: { lifecycle: "grace_ended" } });
  }
  return { ended: ending.length, lapsed: lapsed.length };
}

export async function cancelSubscription(actor: Actor, subscriptionId: string) {
  const s = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!s || s.userId !== actor.id) throw new ServiceError("That subscription was not found.");
  await prisma.subscription.update({ where: { id: subscriptionId }, data: { cancelAtPeriodEnd: true, cancelledAt: new Date() } });
  await audit({ actorId: actor.id, action: "update", entity: "Subscription", entityId: subscriptionId, after: { cancelAtPeriodEnd: true } });
}
