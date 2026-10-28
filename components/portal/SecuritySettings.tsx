"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, twoFactor } from "@/lib/auth-client";
import { BTN, BTN_OUTLINE, FIELD } from "@/components/admin/kit";

function Message({ error, ok }: { error: string | null; ok: string | null }) {
  if (error) return <p role="alert" className="mt-2 border-l-2 border-danger pl-2.5 text-micro text-danger">{error}</p>;
  if (ok) return <p role="status" className="mt-2 text-micro text-success">{ok}</p>;
  return null;
}

/**
 * Two-step verification set-up and password change. Enabling is two steps: the password
 * produces a secret, and the feature turns on only after a valid code proves the app has it.
 */
export function SecuritySettings({ enabled, mustKeep }: { enabled: boolean; mustKeep: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ uri: string; secret: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ error: string | null; ok: string | null }>({ error: null, ok: null });

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pw, setPw] = useState<{ error: string | null; ok: string | null }>({ error: null, ok: null });

  async function begin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await twoFactor.enable({ password });
    setBusy(false);
    setPassword("");
    if (res.error || !res.data || !("totpURI" in res.data)) return setMfa({ error: res.error?.message ?? "That password is not right.", ok: null });
    const secret = new URL(res.data.totpURI).searchParams.get("secret") ?? "";
    setSetup({ uri: res.data.totpURI, secret, backupCodes: res.data.backupCodes });
    setMfa({ error: null, ok: null });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await twoFactor.verifyTotp({ code: code.replace(/\s/g, "") });
    setBusy(false);
    if (res.error) return setMfa({ error: "That code did not match. Check the time on your phone and try again.", ok: null });
    setSetup(null);
    setMfa({ error: null, ok: "Two-step verification is on." });
    router.refresh();
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await twoFactor.disable({ password });
    setBusy(false);
    setPassword("");
    if (res.error) return setMfa({ error: res.error.message ?? "Could not turn it off.", ok: null });
    setMfa({ error: null, ok: "Two-step verification is off." });
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 10) return setPw({ error: "Use at least 10 characters.", ok: null });
    setBusy(true);
    const res = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
    setBusy(false);
    setCurrent("");
    setNext("");
    if (res.error) return setPw({ error: res.error.status === 400 ? "The current password is not right." : (res.error.message ?? "Could not change it."), ok: null });
    setPw({ error: null, ok: "Password changed. Other devices have been signed out." });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-[var(--radius)] border border-border bg-card px-5 py-5">
        <h2 className="text-[15px] font-semibold">Two-step verification</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {enabled ? "On. Signing in asks for a code from your authenticator app." : "Off. Turn it on to protect your account with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password and others)."}
        </p>
        {!enabled && !setup && (
          <form onSubmit={begin} className="mt-4 flex flex-col gap-2">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Your password" aria-label="Your password" className={FIELD} />
            <button disabled={busy} className={`${BTN} w-fit`}>Set up</button>
          </form>
        )}
        {setup && (
          <form onSubmit={confirm} className="mt-4 flex flex-col gap-3">
            <p className="text-[13px]">
              1. In your authenticator app, add an account using this key (or open the link on your phone):
            </p>
            <code className="text-data block break-all rounded-[3px] bg-secondary px-3 py-2 text-[13px]">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
            <a href={setup.uri} className="text-micro underline">
              Open in authenticator app
            </a>
            <p className="text-[13px]">2. Save these backup codes somewhere safe. Each works once if you lose your phone. They are shown only now.</p>
            <ul className="text-data grid grid-cols-2 gap-1 rounded-[3px] bg-secondary px-3 py-2 text-[13px]">
              {setup.backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="text-[13px]">3. Enter the code the app shows now:</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required placeholder="123456" aria-label="Code from the app" className={FIELD} />
            <button disabled={busy} className={`${BTN} w-fit`}>Turn on</button>
          </form>
        )}
        {enabled && !mustKeep && (
          <form onSubmit={disable} className="mt-4 flex flex-col gap-2">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Your password" aria-label="Your password" className={FIELD} />
            <button disabled={busy} className={`${BTN_OUTLINE} w-fit`}>Turn off</button>
          </form>
        )}
        {enabled && mustKeep && <p className="mt-3 text-[12.5px] text-muted-foreground">Required for administrator accounts; it cannot be turned off.</p>}
        <Message {...mfa} />
      </section>

      <section className="rounded-[var(--radius)] border border-border bg-card px-5 py-5">
        <h2 className="text-[15px] font-semibold">Password</h2>
        <form onSubmit={changePassword} className="mt-4 flex flex-col gap-2">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" placeholder="Current password" aria-label="Current password" className={FIELD} />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={10} autoComplete="new-password" placeholder="New password (10+ characters)" aria-label="New password" className={FIELD} />
          <button disabled={busy} className={`${BTN} w-fit`}>Change password</button>
        </form>
        <Message {...pw} />
      </section>
    </div>
  );
}
