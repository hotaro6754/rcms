"use client";

import { useActionState } from "react";
import { subscribeNotes, type ContactResult } from "@/lib/actions/leads";
import type { SiteContent } from "@/lib/site/pages/site";

/**
 * Floor Notes, the monthly letter. One labelled field and one button; the result replaces the
 * form in place. Anchored as #floor-notes so the top bar's Resources menu can link to it.
 */
export function FooterNotes({ content: c }: { content: SiteContent["notes"] }) {
  const [state, action, pending] = useActionState<ContactResult | null, FormData>(
    (_prev, data) => subscribeNotes(data),
    null,
  );

  return (
    <div id="floor-notes">
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand">{c.eyebrow}</p>
      <p className="mt-3 max-w-[36ch] text-[1.25rem] font-semibold leading-snug">{c.title}</p>
      {state?.ok ? (
        <p role="status" className="mt-6 rounded-md border border-border px-4 py-3 text-[15px]">
          {c.success}
        </p>
      ) : (
        <form action={action} className="mt-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{c.emailLabel}</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder={c.placeholder}
                aria-invalid={state?.ok === false || undefined}
                aria-describedby={state?.ok === false ? "notes-error" : undefined}
                className="h-12 w-full rounded-md border border-input bg-background/5 px-4 text-[16px] outline-none placeholder:text-foreground/45 focus:border-foreground"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="h-12 shrink-0 rounded-md bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {pending ? c.sending : c.button}
            </button>
          </div>
          {state?.ok === false && (
            <p id="notes-error" role="alert" className="mt-2 text-[13px] text-danger">
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
