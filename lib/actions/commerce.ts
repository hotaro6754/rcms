"use server";

import { revalidatePath } from "next/cache";
import { requireActor, requireFreshSignIn } from "@/lib/actor";
import { attempt, ServiceError } from "@/lib/errors";
import * as checkout from "@/lib/services/commerce/checkout";
import * as refunds from "@/lib/services/commerce/refunds";
import * as products from "@/lib/services/commerce/products";
import { requestApproval } from "@/lib/services/approvals";
import { bool, opt, str } from "./_form";

const refreshFinance = () => revalidatePath("/admin/finance", "layout");

export async function quoteAction(sku: string, coupon: string | null) {
  return attempt(async () => {
    const q = await checkout.quote(await requireActor(), sku, coupon);
    return { subtotal: q.subtotal, discount: q.discount, amount: q.amount, tax: q.tax };
  });
}

export async function startCheckoutAction(sku: string, coupon: string | null) {
  return attempt(async () => checkout.startCheckout(await requireActor(), sku, coupon));
}

export async function confirmCheckoutAction(orderId: string, paymentId: string, signature: string) {
  return attempt(async () => {
    const order = await checkout.confirmCheckout(await requireActor(), orderId, paymentId, signature);
    revalidatePath("/academy", "layout");
    return { state: order.state };
  });
}

export async function cancelSubscriptionAction(fd: FormData) {
  return attempt(async () => {
    await checkout.cancelSubscription(await requireActor(), str(fd, "id"));
    revalidatePath("/account/billing");
  });
}

export async function requestRefundAction(fd: FormData) {
  return attempt(async () => {
    const rupees = Number(str(fd, "amount"));
    if (!Number.isFinite(rupees) || rupees <= 0) throw new ServiceError("Enter an amount in rupees.");
    await refunds.requestRefund(await requireActor(), str(fd, "orderId"), { amount: Math.round(rupees * 100), reason: str(fd, "reason") });
    refreshFinance();
  });
}

export async function decideRefundAction(fd: FormData) {
  return attempt(async () => {
    await requireFreshSignIn();
    await refunds.decideRefund(await requireActor(), str(fd, "id"), str(fd, "decision") === "approve", opt(fd, "note") ?? undefined);
    refreshFinance();
  });
}

export async function submitRefundAction(fd: FormData) {
  return attempt(async () => {
    await refunds.submitRefund(await requireActor(), str(fd, "id"));
    refreshFinance();
  });
}

export async function recordProviderRefundAction(fd: FormData) {
  return attempt(async () => {
    await refunds.recordProviderRefund(await requireActor(), str(fd, "id"), str(fd, "providerRef"));
    refreshFinance();
  });
}

export async function reconcileAction(fd: FormData) {
  return attempt(async () => {
    await refunds.reconcilePayment(await requireActor(), str(fd, "id"), str(fd, "status") as "RECONCILED" | "EXCEPTION" | "UNRECONCILED", opt(fd, "note") ?? undefined);
    refreshFinance();
  });
}

export async function createProductAction(fd: FormData) {
  return attempt(async () => {
    await products.createProduct(
      await requireActor(),
      {
        name: str(fd, "name"),
        description: opt(fd, "description"),
        kind: str(fd, "kind"),
        programId: opt(fd, "programId"),
        levelId: opt(fd, "levelId"),
        interval: opt(fd, "interval"),
        trialDays: str(fd, "trialDays") || 0,
        graceDays: str(fd, "graceDays") || 0,
        taxPercent: str(fd, "taxPercent") || 0,
      },
      Number(str(fd, "price")),
    );
    refreshFinance();
  });
}

export async function productActiveAction(fd: FormData) {
  return attempt(async () => {
    await products.setProductActive(await requireActor(), str(fd, "id"), bool(fd, "active"));
    refreshFinance();
  });
}

export async function requestPriceChangeAction(fd: FormData) {
  return attempt(async () => {
    await requireFreshSignIn();
    const rupees = Number(str(fd, "price"));
    if (!Number.isFinite(rupees) || rupees < 0) throw new ServiceError("Enter the new price in rupees.");
    await requestApproval(await requireActor(), "PRICE_CHANGE", { productId: str(fd, "id"), amount: Math.round(rupees * 100), effectiveFrom: str(fd, "effectiveFrom") }, str(fd, "reason"));
    refreshFinance();
  });
}

export async function createCouponAction(fd: FormData) {
  return attempt(async () => {
    await products.createCoupon(await requireActor(), { code: str(fd, "code"), percentOff: opt(fd, "percentOff"), amountOff: opt(fd, "amountOff"), maxRedemptions: opt(fd, "maxRedemptions"), expiresAt: opt(fd, "expiresAt") });
    refreshFinance();
  });
}

export async function couponActiveAction(fd: FormData) {
  return attempt(async () => {
    await products.setCouponActive(await requireActor(), str(fd, "id"), bool(fd, "active"));
    refreshFinance();
  });
}
