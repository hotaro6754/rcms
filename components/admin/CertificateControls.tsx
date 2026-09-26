"use client";

import { useState, useTransition } from "react";
import { issueCertificate, revokeCertificate } from "@/lib/actions/certificates";

const SELECT = "min-h-10 w-full border-b border-input bg-transparent text-[14px] outline-none focus:border-foreground";
const BTN =
  "inline-flex min-h-10 items-center rounded-[3px] bg-primary px-4 text-[13.5px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50";

/** Issue a certificate by hand: pick a person and a program. */
export function IssueForm({ people, programs }: { people: { id: string; label: string }[]; programs: { id: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await issueCertificate(fd);
          setMsg(res.ok ? { ok: true, text: `Issued ${res.serial}.` } : { ok: false, text: res.error });
        })
      }
      className="grid gap-5 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-data text-[10.5px] tracking-[0.12em] text-subtle">PERSON</span>
        <select name="userId" required className={SELECT} defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-data text-[10.5px] tracking-[0.12em] text-subtle">PROGRAM</span>
        <select name="programId" required className={SELECT} defaultValue="">
          <option value="" disabled>
            Choose
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? "Issuing…" : "Issue"}
      </button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-[13px] sm:col-span-3 ${msg.ok ? "text-brand" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

/** One-click issue for someone who has met every requirement. */
export function IssueNow({ userId, programId }: { userId: string; programId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  if (done) return <span className="text-data text-[11px] text-brand">{done}</span>;
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("userId", userId);
          fd.set("programId", programId);
          const res = await issueCertificate(fd);
          setDone(res.ok ? res.serial : res.error);
        })
      }
      className="text-data text-[11px] tracking-[0.1em] underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? "ISSUING…" : "ISSUE"}
    </button>
  );
}

/** Revoke with a reason. The reason is shown on the public verification page. */
export function RevokeControl({ certificateId }: { certificateId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-data text-[11px] tracking-[0.1em] text-danger hover:underline">
        REVOKE
      </button>
    );
  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await revokeCertificate(certificateId, fd);
          if (!res.ok) setError(res.error);
        })
      }
      className="flex flex-col gap-2"
    >
      <input
        name="reason"
        required
        minLength={5}
        autoFocus
        placeholder="Reason, shown publicly"
        className="min-h-9 w-56 border-b border-input bg-transparent text-[13px] outline-none focus:border-foreground"
      />
      <span className="flex gap-4">
        <button type="submit" disabled={pending} className="text-data text-[11px] tracking-[0.1em] text-danger underline underline-offset-4">
          {pending ? "REVOKING…" : "CONFIRM"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-data text-[11px] tracking-[0.1em] text-subtle">
          CANCEL
        </button>
      </span>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </form>
  );
}
