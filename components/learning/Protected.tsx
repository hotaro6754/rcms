"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Course content protection for learners.
 *
 * What it does: no text selection, copying, right-click or dragging inside the lesson; the
 * copy, save, print and view-source shortcuts do nothing; printing shows a notice instead of
 * the lesson; content is hidden while the window is in the background (when screenshot tools
 * usually take focus); and the learner's name, email and the date are watermarked across the
 * content, so any photo or screenshot that does get taken can be traced.
 *
 * What it cannot do: stop a phone camera or an operating-system screenshot. No website can.
 * Files are protected on the server as well (watermarked images, documents served only as
 * page images), so this is one layer of several.
 */
export function Protected({ watermark, children }: { watermark: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const block = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) e.preventDefault();
    };
    const keys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "s", "p", "u", "a"].includes(k)) {
        // Typing in a form field (quiz answers, notes) keeps normal copy and paste.
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
      }
      if (k === "printscreen") {
        setHidden(true);
        navigator.clipboard?.writeText("").catch(() => {});
        setTimeout(() => setHidden(false), 1500);
      }
    };
    const away = () => {
      // Clicking into an embedded video moves focus to its frame; that is not leaving the page.
      setTimeout(() => setHidden(!document.hasFocus() && !(document.activeElement instanceof HTMLIFrameElement)), 0);
    };
    const back = () => setHidden(false);
    for (const t of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.addEventListener(t, block);
    document.addEventListener("keydown", keys);
    document.addEventListener("keyup", keys);
    window.addEventListener("blur", away);
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", away);
    return () => {
      for (const t of ["copy", "cut", "contextmenu", "dragstart", "selectstart"]) document.removeEventListener(t, block);
      document.removeEventListener("keydown", keys);
      document.removeEventListener("keyup", keys);
      window.removeEventListener("blur", away);
      window.removeEventListener("focus", back);
      document.removeEventListener("visibilitychange", away);
    };
  }, []);

  const tile = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='180'><text x='0' y='110' transform='rotate(-22 210 90)' font-family='Arial' font-size='13' fill='#1a1a1a' fill-opacity='0.09'>${watermark.replace(/[<>&'"]/g, "")}</text></svg>`,
  )}")`;

  return (
    <div ref={ref} className="protected-content relative select-none [-webkit-touch-callout:none]">
      <div className={hidden ? "invisible" : undefined}>{children}</div>
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ backgroundImage: tile }} />
      {hidden && (
        <div className="absolute inset-0 z-20 grid place-items-start justify-center bg-background/95 pt-24 text-center">
          <p className="max-w-sm text-[14px] text-muted-foreground">The lesson is hidden while this window is in the background. Click here to carry on reading.</p>
        </div>
      )}
      <p className="protected-print-note hidden">Course content cannot be printed. It is licensed to your account for reading on this site.</p>
    </div>
  );
}
