import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { hmac } from "@/lib/payments/razorpay";
import { handleRazorpayWebhook } from "@/lib/services/commerce/webhooks";
import { confirmCheckout, fulfil, runSubscriptionLifecycle, startCheckout } from "@/lib/services/commerce/checkout";
import { decideRefund, recordProviderRefund, requestRefund } from "@/lib/services/commerce/refunds";
import { AuthorisationError } from "@/lib/errors";
import { makeCourseDraft, makeUser, releaseCourse, resetDb, staff } from "../helpers";

beforeEach(resetDb);

// The provider's HTTP API is the one thing replaced in these tests; signatures, webhooks
// and fulfilment run for real against the database.
let gatewaySeq = 0;
vi.mock("@/lib/payments/razorpay", async (orig) => {
  const real = await orig<typeof import("@/lib/payments/razorpay")>();
  return {
    ...real,
    createOrder: vi.fn(async (i: { amount: number; currency: string; receipt: string }) => ({ id: `order_T${++gatewaySeq}`, amount: i.amount, currency: i.currency, receipt: i.receipt, status: "created" })),
    fetchPayment: vi.fn(async (id: string) => ({ id, order_id: currentGatewayOrder, amount: currentAmount, currency: "INR", status: "captured", method: "upi" })),
    createRefund: vi.fn(async (paymentId: string, amount: number) => ({ id: `rfnd_T${++gatewaySeq}`, payment_id: paymentId, amount, status: "pending" })),
  };
});
let currentGatewayOrder = "";
let currentAmount = 0;

async function paidCourse() {
  const author = await staff("CONTENT_ADMIN");
  const { course } = await makeCourseDraft(author, { modules: 1, lessons: 2 });
  await releaseCourse(course.id, author);
  const product = await prisma.product.create({ data: { sku: `program-${course.id}`, kind: "PROGRAM", name: "Test course", amount: 299900, programId: course.id, active: true } });
  return { course, product };
}

function webhook(event: string, payload: unknown, eventId: string, secret = "test_webhook_secret") {
  const body = JSON.stringify({ event, payload });
  return handleRazorpayWebhook(body, hmac(secret, body), eventId);
}

describe("checkout", () => {
  it("never marks an order paid on a forged or missing signature", async () => {
    const { product } = await paidCourse();
    const learner = await makeUser();
    const s = await startCheckout(learner, product.sku);
    expect(s.amount).toBe(299900);
    await expect(confirmCheckout(learner, s.orderId, "pay_X", "forged")).rejects.toThrow(/could not be verified/);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: s.orderId } })).state).toBe("PENDING");
    expect(await prisma.enrolment.count({ where: { userId: learner.id } })).toBe(0);
  });

  it("grants access once on a valid checkout signature, with an invoice", async () => {
    const { product, course } = await paidCourse();
    const learner = await makeUser();
    const s = await startCheckout(learner, product.sku);
    currentGatewayOrder = s.gatewayOrderId!;
    currentAmount = s.amount;
    const sig = hmac("test_key_secret", `${s.gatewayOrderId}|pay_OK1`);
    await confirmCheckout(learner, s.orderId, "pay_OK1", sig);
    await confirmCheckout(learner, s.orderId, "pay_OK1", sig);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: s.orderId }, include: { invoice: true, payments: true } });
    expect(order.state).toBe("PAID");
    expect(order.invoice?.number).toMatch(/^INV-\d{4}-\d{5}$/);
    expect(order.payments).toHaveLength(1);
    const e = await prisma.enrolment.findUniqueOrThrow({ where: { userId_programId: { userId: learner.id, programId: course.id } } });
    expect(e.source).toBe("PURCHASE");
    // Someone else cannot confirm (or even see) this order.
    await expect(confirmCheckout(await makeUser(), s.orderId, "pay_OK1", sig)).rejects.toThrow(/not found/);
  });
});

describe("webhooks", () => {
  it("rejects bad signatures and applies a replayed event once", async () => {
    const { product } = await paidCourse();
    const learner = await makeUser();
    const s = await startCheckout(learner, product.sku);
    const payload = { payment: { entity: { id: "pay_W1", order_id: s.gatewayOrderId, amount: s.amount, method: "card", status: "captured" } } };
    expect((await webhook("payment.captured", payload, "evt_1", "wrong-secret")).status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: s.orderId } })).state).toBe("PENDING");

    expect((await webhook("payment.captured", payload, "evt_1")).status).toBe(200);
    expect((await webhook("payment.captured", payload, "evt_1")).body).toBe("duplicate");
    expect((await webhook("order.paid", payload, "evt_2")).status).toBe(200);
    expect(await prisma.payment.count()).toBe(1);
    expect(await prisma.invoice.count()).toBe(1);
    expect(await prisma.enrolment.count({ where: { userId: learner.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entity: "WebhookEvent", outcome: "denied" } })).toBe(1);
  });

  it("does not grant access when the paid amount differs, and flags it for reconciliation", async () => {
    const { product } = await paidCourse();
    const learner = await makeUser();
    const s = await startCheckout(learner, product.sku);
    await webhook("payment.captured", { payment: { entity: { id: "pay_W2", order_id: s.gatewayOrderId, amount: 100, status: "captured" } } }, "evt_3");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: s.orderId } })).state).toBe("PENDING");
    expect((await prisma.payment.findUniqueOrThrow({ where: { gatewayRef: "pay_W2" } })).reconciliation).toBe("EXCEPTION");
  });

  it("records failed payments without granting anything", async () => {
    const { product } = await paidCourse();
    const learner = await makeUser();
    const s = await startCheckout(learner, product.sku);
    await webhook("payment.failed", { payment: { entity: { id: "pay_F", order_id: s.gatewayOrderId, amount: s.amount, status: "failed", error_description: "Card declined" } } }, "evt_4");
    const o = await prisma.order.findUniqueOrThrow({ where: { id: s.orderId } });
    expect(o.state).toBe("FAILED");
    expect(o.failureReason).toBe("Card declined");
  });
});

describe("refunds", () => {
  async function paidOrder() {
    const { product, course } = await paidCourse();
    const learner = await makeUser();
    const s = await startCheckout(learner, product.sku);
    await fulfil(s.orderId, { gatewayRef: "pay_R1", amount: s.amount, method: "upi", status: "successful", provider: "razorpay" });
    return { orderId: s.orderId, learner, course };
  }

  it("needs a second person, and an Academy Director for an exceptional refund", async () => {
    const { orderId, learner, course } = await paidOrder();
    const finance = await staff("FINANCE_ADMIN");
    const finance2 = await staff("FINANCE_ADMIN");
    await expect(requestRefund(learner, orderId, { amount: 1000, reason: "I want my money" })).rejects.toBeInstanceOf(AuthorisationError);
    await expect(requestRefund(finance, orderId, { amount: 9_999_999, reason: "Too much" })).rejects.toThrow(/At most/);

    const routine = await requestRefund(finance, orderId, { amount: 299900, reason: "Within the 7-day policy" });
    expect(routine.policyEligible).toBe(true);
    expect(routine.exceptional).toBe(false);
    await expect(decideRefund(finance, routine.id, true)).rejects.toThrow(/different person/);
    await decideRefund(finance2, routine.id, true);
    await recordProviderRefund(finance2, routine.id, "rfnd_MANUAL01");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).state).toBe("REFUNDED");
    expect((await prisma.enrolment.findUniqueOrThrow({ where: { userId_programId: { userId: learner.id, programId: course.id } } })).state).toBe("REFUNDED");

    // Outside the window: exceptional, so a second finance admin cannot approve it.
    const { orderId: o2 } = await paidOrder();
    await prisma.order.update({ where: { id: o2 }, data: { paidAt: new Date(Date.now() - 40 * 86400_000) } });
    const late = await requestRefund(finance, o2, { amount: 100000, reason: "Goodwill after the window" });
    expect(late.exceptional).toBe(true);
    await expect(decideRefund(finance2, late.id, true)).rejects.toBeInstanceOf(AuthorisationError);
    await decideRefund(await staff("ACADEMY_DIRECTOR"), late.id, true);
    expect((await prisma.refund.findUniqueOrThrow({ where: { id: late.id } })).status).toBe("APPROVED");
  });
});

describe("subscriptions", () => {
  it("covers included courses, then moves to grace and expiry", async () => {
    const { course } = await paidCourse();
    const learner = await makeUser();
    const plan = await prisma.product.create({ data: { sku: "sub-test", kind: "SUBSCRIPTION", name: "All-access", amount: 149900, interval: "MONTH", graceDays: 7, active: true } });
    const s = await startCheckout(learner, plan.sku);
    await fulfil(s.orderId, { gatewayRef: "pay_S1", amount: s.amount, method: "upi", status: "successful", provider: "razorpay" });
    const sub = await prisma.subscription.findFirstOrThrow({ where: { userId: learner.id } });
    expect(sub.status).toBe("ACTIVE");

    const { enrolFree } = await import("@/lib/services/learning/progress");
    const e = await enrolFree(learner, course.id);
    expect(e.source).toBe("SUBSCRIPTION");

    await runSubscriptionLifecycle(new Date(sub.currentPeriodEnd.getTime() + 1000));
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe("GRACE_PERIOD");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.id } })).status).toBe("GRACE_PERIOD");
    await runSubscriptionLifecycle(new Date(sub.currentPeriodEnd.getTime() + 8 * 86400_000));
    expect((await prisma.subscription.findUniqueOrThrow({ where: { id: sub.id } })).status).toBe("EXPIRED");
  });
});
