"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { confirmCheckoutAction, quoteAction, startCheckoutAction } from "@/lib/actions/commerce";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

const inr = (p: number) => "₹" + (p / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/**
 * Razorpay's hosted Checkout collects the payment; this page never sees card or bank details.
 * On success Razorpay returns a signed reference, which the server verifies before anything
 * is granted. Closing the window or a failed payment changes nothing.
 */
export function Checkout({ sku, name, email, initial }: { sku: string; name: string; email: string; initial: { subtotal: number; discount: number; amount: number; tax: number } }) {
  const router = useRouter();
  const [coupon, setCoupon] = useState("");
  const [q, setQ] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const apply = () =>
    start(async () => {
      setError(null);
      const res = await quoteAction(sku, coupon || null);
      if (res.ok) setQ(res.data);
      else setError(res.error);
    });

  const pay = () =>
    start(async () => {
      setError(null);
      const res = await startCheckoutAction(sku, coupon || null);
      if (!res.ok) return setError(res.error);
      const s = res.data;
      if (s.free) {
        router.push("/academy");
        return;
      }
      if (!window.Razorpay) return setError("The payment window could not load. Check your connection and try again.");
      const rzp = new window.Razorpay({
        key: s.keyId,
        amount: s.amount,
        currency: s.currency,
        order_id: s.gatewayOrderId,
        name: "RCMS Operations Academy",
        description: s.product,
        prefill: { name, email },
        theme: { color: "#1c1b19" },
        handler: async (resp: { razorpay_payment_id: string; razorpay_signature: string }) => {
          setStatus("Verifying your payment…");
          const done = await confirmCheckoutAction(s.orderId, resp.razorpay_payment_id, resp.razorpay_signature);
          if (done.ok) router.push(`/account/invoices/${s.orderId}?paid=1`);
          else {
            setStatus(null);
            setError(done.error);
          }
        },
        modal: { ondismiss: () => setStatus(null) },
      });
      rzp.on("payment.failed", () => setError("The payment did not go through. Nothing was charged; you can try again."));
      rzp.open();
    });

  return (
    <div className="flex flex-col gap-5">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-[14px]">
        <dt>Price</dt>
        <dd>{inr(q.subtotal)}</dd>
        {q.discount > 0 && (
          <>
            <dt>Discount</dt>
            <dd className="text-success">−{inr(q.discount)}</dd>
          </>
        )}
        {q.tax > 0 && (
          <>
            <dt className="text-muted-foreground">Includes GST</dt>
            <dd className="text-muted-foreground">{inr(q.tax)}</dd>
          </>
        )}
        <dt className="border-t border-border pt-2 font-semibold">To pay</dt>
        <dd className="border-t border-border pt-2 font-semibold">{inr(q.amount)}</dd>
      </dl>
      <div className="flex gap-2">
        <label htmlFor="coupon" className="sr-only">
          Coupon code
        </label>
        <input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" className="min-h-10 flex-1 rounded-[3px] border border-input bg-card px-3 text-[14px]" />
        <button type="button" onClick={apply} disabled={pending || !coupon} className="min-h-10 rounded-[3px] border border-input px-3 text-[13.5px] hover:bg-secondary disabled:opacity-50">
          Apply
        </button>
      </div>
      <button type="button" onClick={pay} disabled={pending || !!status} className="inline-flex min-h-12 items-center justify-center rounded-[3px] bg-primary px-6 text-[15px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
        {status ?? (pending ? "Preparing…" : q.amount === 0 ? "Enrol" : `Pay ${inr(q.amount)}`)}
      </button>
      {error && (
        <p role="alert" className="border-l-2 border-danger pl-3 text-[13.5px] text-danger">
          {error}
        </p>
      )}
      <p className="text-[12px] leading-relaxed text-muted-foreground">Payments are processed by Razorpay. The Academy never receives or stores your card or bank details. By paying you accept the <a href="/legal/terms" className="underline">terms</a> and <a href="/legal/refund" className="underline">refund policy</a>.</p>
    </div>
  );
}
