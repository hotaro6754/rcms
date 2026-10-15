import { NextResponse } from "next/server";
import { handleRazorpayWebhook } from "@/lib/services/commerce/webhooks";

/**
 * Razorpay webhook endpoint. Configure it in the Razorpay dashboard with the events
 * payment.captured, payment.failed, order.paid, refund.processed, refund.failed and
 * payment.dispute.created, and the same secret as RAZORPAY_WEBHOOK_SECRET.
 *
 * The body is read raw: the signature is over the exact bytes Razorpay sent.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const res = await handleRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"), req.headers.get("x-razorpay-event-id"));
  return new NextResponse(res.body, { status: res.status });
}
