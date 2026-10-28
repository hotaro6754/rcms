import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { quote } from "@/lib/services/commerce/checkout";
import { paymentsConfigured } from "@/lib/payments/razorpay";
import { PageHead } from "@/components/platform/PlatformShell";
import { Checkout } from "@/components/portal/Checkout";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ sku: string }> }) {
  const actor = await requireActor();
  const { sku } = await params;
  let q;
  try {
    q = await quote(actor, sku, null);
  } catch (e) {
    if (e instanceof ServiceError) {
      return (
        <div className="mx-auto max-w-[640px] px-6 py-16">
          <PageHead kicker="Checkout" title="This can't be bought right now" lede={e.message} />
          <Link href="/catalog" className="mt-6 inline-block underline underline-offset-4">
            Back to the catalogue
          </Link>
        </div>
      );
    }
    throw e;
  }
  if (!q) notFound();
  return (
    <div className="mx-auto max-w-[640px] px-6 py-16">
      <PageHead kicker="Checkout" title={q.product.name} lede={q.product.description ?? undefined} />
      <div className="mt-8 rounded-[var(--radius)] border border-border bg-card p-6">
        {paymentsConfigured() || q.amount === 0 ? (
          <Checkout sku={sku} name={actor.name} email={actor.email} initial={{ subtotal: q.subtotal, discount: q.discount, amount: q.amount, tax: q.tax }} />
        ) : (
          <p className="text-[14px]">
            Online payment is not set up yet. <Link href={`/contact?interest=${encodeURIComponent(q.product.name)}`} className="underline underline-offset-4">Contact us</Link> and we will enrol you directly.
          </p>
        )}
      </div>
    </div>
  );
}
