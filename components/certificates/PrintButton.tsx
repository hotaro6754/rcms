"use client";

/** Opens the browser's print dialog; the print rules leave only the certificate on the page. */
export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      Print or save as PDF
    </button>
  );
}
