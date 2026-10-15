"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReauthLink } from "./ReauthLink";

export type FormResult = { ok: true; data?: unknown; message?: string } | { ok: false; error: string; field?: string } | null;

/**
 * Every write in the admin and portals goes through this: a plain form posting to a server
 * action, with a pending state, the server's own error sentence, an optional confirmation
 * for destructive actions, and a refresh on success so server components re-read.
 *
 * It works without JavaScript too (the form still posts); the enhancements are on top.
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  success,
  resetOnSuccess = false,
  onSuccess,
  redirectTo,
}: {
  action: (formData: FormData) => Promise<FormResult>;
  children: ReactNode;
  className?: string;
  /** Asked with window.confirm before submitting. */
  confirm?: string;
  /** Shown after a successful submit. */
  success?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (result: FormResult) => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (_prev: FormResult, fd: FormData) => action(fd), null);

  useEffect(() => {
    if (!state?.ok) return;
    if (resetOnSuccess) ref.current?.reset();
    onSuccess?.(state);
    // A result can name where to go next (a new course, a new support case).
    const next = redirectTo ?? ((state as { data?: { href?: unknown } }).data?.href as string | undefined);
    if (typeof next === "string" && next.startsWith("/")) router.push(next);
    else router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={ref}
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn("relative", className)}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      <FormStatus state={state} pending={pending} success={success} />
    </form>
  );
}

export function FormStatus({ state, pending, success }: { state: FormResult; pending: boolean; success?: string }) {
  if (pending) {
    return (
      <span className="mt-2 inline-flex items-center gap-1.5 text-micro text-muted-foreground" aria-live="polite">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…
      </span>
    );
  }
  if (state && !state.ok) {
    return (
      <p role="alert" className="mt-2 border-l-2 border-danger pl-2.5 text-micro leading-relaxed text-danger">
        {state.error}
        {state.field === "reauth" && <ReauthLink />}
      </p>
    );
  }
  if (state?.ok && (success || (state as { message?: string }).message)) {
    return (
      <p role="status" className="mt-2 text-micro text-success">
        {(state as { message?: string }).message ?? success}
      </p>
    );
  }
  return null;
}

/** A one-button form: a hidden payload and a submit. For move, archive, approve and the like. */
export function ActionButton({
  action,
  fields,
  children,
  confirm,
  variant = "outline",
  size = "sm",
  className,
  title,
  success,
}: {
  action: (formData: FormData) => Promise<FormResult>;
  fields?: Record<string, string | number | boolean | null | undefined>;
  children: ReactNode;
  confirm?: string;
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "sm" | "icon";
  className?: string;
  title?: string;
  success?: string;
}) {
  const styles = {
    default: "bg-primary text-primary-foreground hover:bg-primary-hover",
    outline: "border border-input bg-card hover:bg-secondary",
    ghost: "hover:bg-secondary",
    danger: "border border-danger/30 text-danger hover:bg-danger-bg",
  }[variant];
  return (
    <ActionForm action={action} confirm={confirm} className="inline-block" success={success}>
      {fields &&
        Object.entries(fields).map(([k, v]) => (v === undefined || v === null ? null : <input key={k} type="hidden" name={k} value={String(v)} />))}
      <button
        type="submit"
        title={title}
        aria-label={title}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-[3px] text-[13px] font-medium transition-colors disabled:opacity-50",
          size === "icon" ? "h-8 w-8" : "min-h-8 px-3",
          styles,
          className,
        )}
      >
        {children}
      </button>
    </ActionForm>
  );
}
