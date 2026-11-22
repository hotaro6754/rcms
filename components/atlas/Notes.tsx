"use client";

import { useActionState } from "react";
import { subscribeNotes, type ContactResult } from "@/lib/actions/leads";
import s from "./atlas.module.css";

/** Floor Notes sign-up, on the closing band. Same server action as the site footer. */
export function Notes({ c }: { c: { eyebrow: string; title: string; emailLabel: string; placeholder: string; button: string; sending: string; success: string } }) {
  const [state, action, pending] = useActionState<ContactResult | null, FormData>((_p, d) => subscribeNotes(d), null);
  return (
    <div className={s.notes} id="floor-notes">
      <p className={s.mono} style={{ opacity: 0.8 }}>
        {c.eyebrow}
      </p>
      <p style={{ marginTop: 8, fontSize: 18, lineHeight: 1.4 }}>{c.title}</p>
      {state?.ok ? (
        <p role="status" style={{ marginTop: 14, fontWeight: 600 }}>
          {c.success}
        </p>
      ) : (
        <form action={action}>
          <label className={s.notesRow}>
            <span className={s.sr}>{c.emailLabel}</span>
            <input type="email" name="email" required autoComplete="email" placeholder={c.placeholder} aria-invalid={state?.ok === false || undefined} />
            <button type="submit" disabled={pending}>
              {pending ? c.sending : c.button.replace(" →", "")}
            </button>
          </label>
          {state?.ok === false && (
            <p role="alert" style={{ marginTop: 8, fontSize: 14 }}>
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
