"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimCertificateAction } from "@/lib/actions/learning";

/** Claim an earned certificate, then open it. The server re-checks eligibility. */
export function ClaimButton({ programId, className }: { programId: string; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await claimCertificateAction(programId);
            if (res.ok) router.push(res.data.href);
            else setError(res.error);
          })
        }
        className={className}
      >
        {pending ? "Issuing…" : "Claim your certificate"}
      </button>
      {error && (
        <span role="alert" className="text-[12.5px] text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
