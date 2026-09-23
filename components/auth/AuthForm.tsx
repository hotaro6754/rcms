"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Sign-up and sign-in share a shape, so they share a component. Motion owns the feedback
 * transitions; there is no GSAP in this subtree.
 *
 * Errors say what went wrong and what to do about it. No apologies, no "something went
 * wrong", and the message never reveals whether an email is registered.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

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

    setBusy(true);
    try {
      if (isSignUp) {
        const { error } = await signUp.email({ name, email, password });
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
        router.push("/account");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete that. Try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {isSignUp && (
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-[13px] font-medium">
            Name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            className="min-h-11"
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="min-h-11"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="password" className="text-[13px] font-medium">
            Password
          </label>
          {!isSignUp && (
            <Link href="/forgot-password" className="text-micro text-primary hover:underline">
              Forgotten it?
            </Link>
          )}
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 10 : undefined}
          aria-describedby={isSignUp ? "pw-hint" : undefined}
          className="min-h-11"
        />
        {isSignUp && (
          <p id="pw-hint" className="text-micro text-muted-foreground">
            At least 10 characters.
          </p>
        )}
      </div>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2.5 text-micro leading-relaxed text-danger"
        >
          {error}
        </motion.p>
      )}

      <Button type="submit" disabled={busy} className="mt-1 min-h-11 rounded-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {isSignUp ? "Create account" : "Sign in"}
      </Button>

      <p className="text-micro text-muted-foreground">
        {isSignUp ? "Already have an account? " : "No account yet? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-primary hover:underline"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
