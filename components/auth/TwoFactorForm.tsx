"use client";

import { useState } from "react";
import { twoFactor } from "@/lib/auth-client";

const FIELD = "min-h-11 w-full border-b border-input bg-transparent text-[16px] outline-none transition-colors focus:border-foreground";

/** Second step of sign-in: a code from the authenticator app, or a one-time backup code. */
export function TwoFactorForm() {
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [trust, setTrust] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = mode === "totp" ? await twoFactor.verifyTotp({ code: code.replace(/\s/g, ""), trustDevice: trust }) : await twoFactor.verifyBackupCode({ code: code.trim(), trustDevice: trust });
    if (res.error) {
      setError(res.error.status === 429 ? "Too many attempts. Wait a minute and try again." : "That code did not work. Check the time on your phone and try again.");
      setBusy(false);
      return;
    }
    window.location.href = "/academy";
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="code" className="text-data text-[10.5px] tracking-[0.12em] text-subtle">
          {mode === "totp" ? "6-DIGIT CODE FROM YOUR AUTHENTICATOR APP" : "BACKUP CODE"}
        </label>
        <input id="code" value={code} onChange={(e) => setCode(e.target.value)} inputMode={mode === "totp" ? "numeric" : "text"} autoComplete="one-time-code" required autoFocus className={FIELD} />
      </div>
      <label className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
        <input type="checkbox" checked={trust} onChange={(e) => setTrust(e.target.checked)} className="h-4 w-4" />
        Trust this device for 30 days (not on shared computers)
      </label>
      {error && (
        <p role="alert" className="border-l-2 border-danger pl-3 text-[13.5px] text-danger">
          {error}
        </p>
      )}
      <button disabled={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
        {busy ? "Checking…" : "Verify and continue"}
      </button>
      <button type="button" onClick={() => { setMode(mode === "totp" ? "backup" : "totp"); setCode(""); setError(null); }} className="text-left text-[13.5px] text-muted-foreground underline underline-offset-4">
        {mode === "totp" ? "Use a backup code instead" : "Use the authenticator app instead"}
      </button>
    </form>
  );
}
