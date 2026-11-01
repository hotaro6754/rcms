"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SiteLink } from "@/components/site/SiteLink";
import type { PageContent } from "@/lib/site/fields";
import type { mentoringPage } from "@/lib/site/pages/mentoring";

export type BookingPanelCopy = PageContent<typeof mentoringPage>["booking"];

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
export function BookingPanel({ options, copy }: { options: MentoringOptionView[]; copy: BookingPanelCopy }) {
  const [sku, setSku] = useState(options[0]?.sku ?? "");

  // Links such as /mentoring#leadership (the homepage and the top bar) arrive with that session chosen.
  useEffect(() => {
    const pick = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (id && options.some((o) => o.sku === `mentoring-${id}`)) setSku(`mentoring-${id}`);
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [options]);
  const chosen = options.find((o) => o.sku === sku);
  if (!options.length) {
    return (
      <div className="site-card p-5 text-[14px] text-muted-foreground">
        {copy.closed} <SiteLink link={copy.closedLink} className="underline underline-offset-4" /> {copy.closedAfter}
      </div>
    );
  }
  return (
    <div className="site-card">
      <fieldset className="border-b border-border p-5">
        <legend className="label-caps">{copy.legend}</legend>
        <div className="mt-4 flex flex-col gap-2">
          {options.map((o) => (
            <label
              key={o.sku}
              id={o.sku.replace(/^mentoring-/, "")}
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
          {copy.note}
        </p>
        <Link
          href={`/contact?interest=${encodeURIComponent(chosen?.name ?? "Mentoring")}`}
          className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {copy.button}
        </Link>
      </div>
    </div>
  );
}
