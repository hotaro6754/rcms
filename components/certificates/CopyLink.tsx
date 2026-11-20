"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/** Copy a certificate's verification link; falls back to selecting the text if the clipboard is refused. */
export function CopyLink({ url, className }: { url: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt("Copy this verification link", url);
        }
      }}
      aria-live="polite"
    >
      {done ? <Check aria-hidden /> : <Link2 aria-hidden />}
      {done ? "Link copied" : "Copy link"}
    </button>
  );
}
