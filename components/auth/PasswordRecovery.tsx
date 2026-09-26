"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const FIELD =
  "min-h-11 w-full border-b border-input bg-transparent text-[16px] outline-none transition-colors focus:border-foreground";
const BTN =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50";

/**
 * Step one: ask for a reset link. The reply is the same whether or not the address has an
 * account, so the form never confirms who is registered.
 */
export function RequestReset() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p role="status" className="border-t-2 border-foreground pt-4 text-[15px] leading-relaxed">
        If <span className="font-medium">{email}</span> has an account, a reset link is on its way. It expires in one
        hour.
      </p>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        setSent(true);
      }}
      className="flex flex-col gap-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-data text-[10.5px] tracking-[0.12em] text-subtle">EMAIL</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD} />
      </label>
      <button type="submit" disabled={busy} className={BTN}>
        {busy ? "Sending…" : "Send the reset link"}
      </button>
      <Link href="/sign-in" className="text-[13.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
        Back to sign in
      </Link>
    </form>
  );
}

/** Step two: set a new password with the token from the emailed link. */
export function ResetPassword({ token, invalid }: { token: string | null; invalid: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || invalid) {
    return (
      <div className="flex flex-col gap-5">
        <p role="alert" className="border-t-2 border-danger pt-4 text-[15px] leading-relaxed">
          This reset link has expired or has already been used.
        </p>
        <Link href="/forgot-password" className={BTN}>
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (password.length < 10) {
          setError("Use at least 10 characters. Length beats complexity.");
          return;
        }
        setBusy(true);
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        if (error) {
          setError("This reset link has expired or has already been used. Ask for a new one.");
          setBusy(false);
          return;
        }
        router.push("/sign-in?reset=1");
      }}
      className="flex flex-col gap-6"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-data text-[10.5px] tracking-[0.12em] text-subtle">NEW PASSWORD</span>
        <input
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby="pw-hint"
          className={FIELD}
        />
        <span id="pw-hint" className="text-[12.5px] text-subtle">
          At least 10 characters.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-[13.5px] text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={BTN}>
        {busy ? "Saving…" : "Set the new password"}
      </button>
    </form>
  );
}
