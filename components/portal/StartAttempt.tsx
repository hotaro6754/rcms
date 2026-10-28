"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startAttemptAction } from "@/lib/actions/learning";

/** Starts (or resumes) an attempt on the server, then opens it. Limits and waits are enforced there. */
export function StartAttempt({ quizId, label }: { quizId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const fd = new FormData();
            fd.set("quizId", quizId);
            const res = await startAttemptAction(fd);
            if (res.ok) router.push(res.data.href);
            else setError(res.error);
          })
        }
        className="inline-flex min-h-11 w-fit items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {pending ? "Preparing…" : label}
      </button>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
