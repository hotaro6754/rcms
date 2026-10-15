"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface MentoringOptionView {
  sku: string;
  name: string;
  amount: number;
  minutes: number | null;
  who: string | null;
}

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

/**
 * Choose a session and send a request. There is no live calendar behind this, so it does not
 * pretend to show free slots: the request reaches us as an enquiry and a time is confirmed by
 * email. Motion-free on purpose.
 */
export function BookingPanel({ options }: { options: MentoringOptionView[] }) {
  const [sku, setSku] = useState(options[0]?.sku ?? "");
  const chosen = options.find((o) => o.sku === sku);
  if (!options.length) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-card p-5 text-[14px] text-muted-foreground">
        Mentoring is not open for requests right now. <Link href="/contact" className="underline underline-offset-4">Contact us</Link> instead.
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card">
      <fieldset className="border-b border-border p-5">
        <legend className="label-caps">Choose a session</legend>
        <div className="mt-4 flex flex-col gap-2">
          {options.map((o) => (
            <label
              key={o.sku}
              className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-md border px-4 py-3 transition-colors", sku === o.sku ? "border-primary bg-accent" : "border-border hover:border-primary")}
            >
              <span className="flex items-start gap-3">
                <input type="radio" name="session" value={o.sku} checked={sku === o.sku} onChange={() => setSku(o.sku)} className="mt-1" />
                <span>
                  <span className="block text-[14px] font-medium">{o.name}</span>
                  {o.who && <span className="mt-0.5 block text-micro leading-relaxed text-muted-foreground">{o.who}</span>}
                </span>
              </span>
              <span className="text-data shrink-0 text-[14px] font-medium">{inr(o.amount)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="max-w-[36ch] text-micro text-muted-foreground">
          Send the request with the times that suit you (IST). We reply by email to confirm a slot. Nothing is charged until a time is agreed.
        </p>
        <Link
          href={`/contact?interest=${encodeURIComponent(chosen?.name ?? "Mentoring")}`}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Request this session
        </Link>
      </div>
    </div>
  );
}
