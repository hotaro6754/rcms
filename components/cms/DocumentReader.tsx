"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reads a view-only document page by page. Each page is an image rendered on the server; the PDF itself is never sent to the browser, and there is no download button.
 */
export function DocumentReader({ mediaId, pages, title, context, base }: { mediaId: string; pages: number; title: string; context?: string; base?: string }) {
  const [page, setPage] = useState(1);
  const total = Math.max(1, pages || 1);
  // `base` serves pages of a lesson material instead of a document block.
  const src = (n: number) => `${base ?? `/api/doc-pages/${mediaId}`}/${n}${!base && context ? `?c=${encodeURIComponent(context)}` : ""}`;
  const go = (n: number) => setPage(Math.min(total, Math.max(1, n)));
  return (
    <figure className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3" aria-label={`${title}, view-only document`}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-[14px] font-semibold">{title}</span>
        <span className="flex items-center gap-2 text-[13px]">
          <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)} className="grid h-8 w-8 place-items-center rounded border border-input disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <label className="flex items-center gap-1">
            <span className="sr-only">Page</span>
            <input type="number" min={1} max={total} value={page} onChange={(e) => go(Number(e.target.value))} className="h-8 w-14 rounded border border-input bg-card px-1 text-center" />
            <span className="text-muted-foreground">of {total}</span>
          </label>
          <button type="button" aria-label="Next page" disabled={page >= total} onClick={() => go(page + 1)} className="grid h-8 w-8 place-items-center rounded border border-input disabled:opacity-40">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </span>
      </figcaption>
      {/* eslint-disable-next-line @next/next/no-img-element -- pages are served by an access-checked route */}
      <img key={page} src={src(page)} alt={`${title}, page ${page} of ${total}`} draggable={false} className="w-full select-none rounded border border-border bg-white" />
      {page < total && (
        // Warm the next page so turning it feels instant.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src(page + 1)} alt="" aria-hidden className="hidden" />
      )}
    </figure>
  );
}
