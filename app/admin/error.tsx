"use client";

import Link from "next/link";

/** Shown when an admin page fails. Production hides the server's message; the digest ties it to the server log. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16">
      <p className="label-caps">Admin Control Center</p>
      <h1 className="mt-2 text-[1.8rem] leading-tight">This page could not be shown.</h1>
      <p className="mt-3 text-[14.5px] text-muted-foreground">
        Something failed while loading it. Nothing was changed. Try again; if it keeps happening, send the reference below to the platform owner.
      </p>
      {error.digest && <p className="text-data mt-3 text-[12px] text-subtle">Reference {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <button onClick={reset} className="rounded-[3px] bg-primary px-4 py-2 text-[13.5px] text-primary-foreground">
          Try again
        </button>
        <Link href="/admin" className="rounded-[3px] border border-input px-4 py-2 text-[13.5px]">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
