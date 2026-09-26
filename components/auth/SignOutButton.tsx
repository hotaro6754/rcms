"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      className="text-data min-h-10 text-[11px] tracking-[0.1em] text-foreground underline-offset-4 hover:underline disabled:opacity-50"
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.push("/");
        router.refresh();
      }}
    >
      {busy ? "SIGNING OUT…" : "SIGN OUT"}
    </button>
  );
}
