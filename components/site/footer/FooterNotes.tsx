"use client";

import { useActionState } from "react";
import { subscribeNotes, type ContactResult } from "@/lib/actions/leads";
import type { SiteContent } from "@/lib/site/pages/site";

/**
 * The monthly letter. One field, one button, a ruled line under the input rather than a
 * box. The result replaces the form in place.
 */
export function FooterNotes({ content: c }: { content: SiteContent["notes"] }) {
  const [state, action, pending] = useActionState<ContactResult | null, FormData>(
    (_prev, data) => subscribeNotes(data),
    null,
  );

  return (
    <div>
      <p className="text-data text-[10.5px] tracking-[0.12em] text-subtle">{c.eyebrow}</p>
      <p className="font-serif-display mt-3 max-w-[30ch] text-[1.5rem] leading-snug">{c.title}</p>
      {state?.ok ? (
        <p role="status" className="mt-6 border-b border-foreground pb-3 text-[15px]">
          {c.success}
        </p>
      ) : (
        <form action={action} className="mt-6">
          <div className="flex items-end gap-4 border-b border-foreground/60 focus-within:border-foreground">
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
                className="w-full bg-transparent pb-3 text-[16px] outline-none placeholder:text-foreground/35"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="text-data mb-2 shrink-0 text-[12px] tracking-[0.12em] transition-opacity hover:opacity-70 disabled:opacity-40"
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
