"use client";

import { signOut } from "@/lib/auth-client";

/** Signs out and returns to sign-in, coming back to this page afterwards. */
export function ReauthLink() {
  return (
    <button
      type="button"
      onClick={async () => {
        const next = window.location.pathname + window.location.search;
        await signOut();
        window.location.href = `/sign-in?next=${encodeURIComponent(next)}`;
      }}
      className="ml-1 underline underline-offset-4"
    >
      Sign in again
    </button>
  );
}
