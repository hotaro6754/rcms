import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay, the payment provider chosen for launch (UPI, cards, netbanking, INR).
 *
 * The Academy never sees a card: Razorpay's hosted Checkout collects payment details, and
 * this module only creates orders, verifies the signatures Razorpay returns, and requests
 * refunds. Everything is server-side with the key secret, which never reaches a browser.
 *
 * Without RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET the platform says payments are not
 * configured and offers no checkout; it never pretends a payment happened.
 *
 * API reference: https://razorpay.com/docs/api/ (orders, payments, refunds, webhooks).
 */

const API = "https://api.razorpay.com/v1";

export function paymentsConfigured() {
  return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
}

export function webhooksConfigured() {
  return !!process.env.RAZORPAY_WEBHOOK_SECRET;
}

export function publicKeyId() {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

function authHeader() {
  return "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; idempotencyKey?: string }): Promise<T> {
  if (!paymentsConfigured()) throw new Error("Payments are not configured.");
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      message = JSON.parse(text)?.error?.description ?? text;
    } catch {}
    throw new Error(`Razorpay ${init.method} ${path} failed (${res.status}): ${message}`);
  }
  return JSON.parse(text) as T;
}

export interface RzpOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export function createOrder(input: { amount: number; currency: string; receipt: string; notes?: Record<string, string> }) {
  return call<RzpOrder>("/orders", { method: "POST", body: { ...input, payment_capture: 1 } });
}

export interface RzpPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_description?: string | null;
}

export function fetchPayment(paymentId: string) {
  return call<RzpPayment>(`/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
}

export interface RzpRefund {
  id: string;
  payment_id: string;
  amount: number;
  status: "pending" | "processed" | "failed";
}

export function createRefund(paymentId: string, amount: number, refundRef: string) {
  return call<RzpRefund>(`/payments/${encodeURIComponent(paymentId)}/refund`, { method: "POST", body: { amount, receipt: refundRef, notes: { refund: refundRef } }, idempotencyKey: refundRef });
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hmac(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Checkout success: Razorpay signs `order_id|payment_id` with the key secret. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(hmac(secret, `${orderId}|${paymentId}`), signature);
}

/** Webhooks: Razorpay signs the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return safeEqualHex(hmac(secret, rawBody), signature);
}
