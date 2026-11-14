"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { signIn, signUp } from "@/lib/auth-client";

/**
 * Sign-up and sign-in share a shape, so they share a component. Motion owns the feedback
 * transitions; there is no GSAP in this subtree.
 *
 * Errors say what went wrong and what to do about it. No apologies, no "something went
 * wrong", and the message never reveals whether an email is registered.
 */
const FIELD =
  "h-12 w-full rounded-2xl border-0 bg-secondary px-4 text-[15px] text-foreground outline-none transition-shadow placeholder:text-subtle focus:shadow-[0_0_0_2px_var(--x-mint-ink)]";

const COUNTRIES = ["India", "United States", "Philippines", "United Kingdom", "United Arab Emirates", "Canada", "Other"];

/** Only same-site paths are followed after sign-in, never an absolute URL. */
function safeNext(raw: string | null, fallback: string) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : fallback;
}

export function AuthForm({ mode, allowSignUp = true, home = "/academy" }: { mode: "sign-in" | "sign-up"; allowSignUp?: boolean; home?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), home);
  const isSignUp = mode === "sign-up";
  const [country, setCountry] = useState("India");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSignUp && password.length < 10) {
      setError("Use at least 10 characters. Length beats complexity.");
      return;
    }
    if (isSignUp && !acceptTerms) {
      setError("Accept the terms of use and privacy policy to create an account.");
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        // acceptTerms is checked again on the server; the extra fields are plain profile data.
        const { error } = await signUp.email({ name, email, password, country, timezone, marketingOptIn, acceptTerms: true, callbackURL: next } as Parameters<typeof signUp.email>[0]);
        if (error) throw new Error(error.message ?? "Could not create the account.");
        router.push("/verify?email=" + encodeURIComponent(email));
      } else {
        const { error } = await signIn.email({ email, password });
        if (error) {
          throw new Error(
            error.status === 403
              ? "That address is not verified yet. Check your inbox for the link."
              : "That email and password do not match an account.",
          );
        }
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete that. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {isSignUp && (
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-[13px] font-semibold text-foreground">
            Full name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className={FIELD}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-semibold text-foreground">
            Email
          </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="password" className="text-[13px] font-semibold text-foreground">
            Password
          </label>
          {!isSignUp && (
            <Link href="/forgot-password" className="text-[12.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Forgotten it?
            </Link>
          )}
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 10 : undefined}
          aria-describedby={isSignUp ? "pw-hint" : undefined}
          className={FIELD}
        />
        {isSignUp && (
          <p id="pw-hint" className="text-micro text-muted-foreground">
            At least 10 characters.
          </p>
        )}
      </div>

      {isSignUp && (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="country" className="text-[13px] font-semibold text-foreground">
              Country
            </label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className={FIELD}>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-2.5 text-[13.5px] leading-snug">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required className="mt-0.5 h-4 w-4" />
            <span>
              I accept the{" "}
              <Link href="/legal/terms" className="underline underline-offset-4" target="_blank">
                terms of use
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="underline underline-offset-4" target="_blank">
                privacy policy
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-[13.5px] leading-snug text-muted-foreground">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>Send me occasional emails about new courses. Optional; change it any time in your account.</span>
          </label>
        </>
      )}

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="border-l-2 border-danger pl-3 text-[13.5px] leading-relaxed text-danger"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition-transform hover:-translate-y-px disabled:opacity-50"
      >
        {busy ? (isSignUp ? "Creating…" : "Signing in…") : isSignUp ? "Create account" : "Sign in"}
      </button>

      {allowSignUp && (
      <p className="text-[13.5px] text-muted-foreground">
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <Link
          href={(isSignUp ? "/sign-in" : "/sign-up") + (next !== "/academy" ? `?next=${encodeURIComponent(next)}` : "")}
          className="text-foreground underline underline-offset-4"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
      )}
    </form>
  );
}
