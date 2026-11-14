"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

/**
 * Reads a view-only document page by page (or a slide deck slide by slide). Each page is an
 * image rendered on the server; the file itself is never sent to the browser, and there is no
 * download button. Arrow keys turn pages; full screen keeps every protection on.
 *
 * `watermark` tiles the learner's identity faintly across the page: no website can stop a
 * camera or a screen recorder, but a recording then names whose account it came from.
 */
export function DocumentReader({
  mediaId,
  pages,
  title,
  context,
  base,
  variant = "pages",
  watermark,
}: {
  mediaId: string;
  pages: number;
  title: string;
  context?: string;
  base?: string;
  variant?: "pages" | "slides";
  watermark?: string;
}) {
  const [page, setPage] = useState(1);
  const [full, setFull] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const root = useRef<HTMLElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const total = Math.max(1, pages || 1);
  const slides = variant === "slides";
  // `base` serves pages of a lesson material instead of a document block.
  const src = (n: number) => `${base ?? `/api/doc-pages/${mediaId}`}/${n}${!base && context ? `?c=${encodeURIComponent(context)}` : ""}`;
  const go = useCallback((n: number) => setPage((p) => {
    const next = Math.min(total, Math.max(1, n));
    if (next !== p) setLoaded(false);
    return next;
  }), [total]);

  // A page already in the browser's cache can finish loading before React attaches onLoad.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth > 0) setLoaded(true);
  }, [page]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else root.current?.requestFullscreen?.().catch(() => {});
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "PageDown" || (slides && e.key === " ")) {
      e.preventDefault();
      go(page + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      go(page - 1);
    } else if (e.key === "Home") go(1);
    else if (e.key === "End") go(total);
  };

  return (
    <figure
      ref={root}
      tabIndex={0}
      onKeyDown={onKey}
      onContextMenu={(e) => e.preventDefault()}
      className={`group/reader flex flex-col overflow-hidden rounded-[calc(var(--radius)+4px)] border border-border outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        slides ? "bg-[#0b1230]" : "bg-[#eceae4] dark:bg-[#1a1d24]"
      } ${full ? "h-dvh w-dvw rounded-none border-0" : ""}`}
      aria-label={`${title}, view-only ${slides ? "slides" : "document"}. Use the arrow keys to turn pages.`}
    >
      <figcaption className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 ${slides ? "text-white" : "border-b border-border bg-card"}`}>
        <span className="min-w-0 truncate text-[13.5px] font-semibold">{title}</span>
        <span className="flex items-center gap-1.5 text-[12.5px]">
          <button type="button" aria-label={slides ? "Previous slide" : "Previous page"} disabled={page <= 1} onClick={() => go(page - 1)} className={btn(slides)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <label className="flex items-center gap-1 tabular-nums">
            <span className="sr-only">{slides ? "Slide" : "Page"}</span>
            <input
              type="number"
              min={1}
              max={total}
              value={page}
              onChange={(e) => go(Number(e.target.value))}
              className={`h-8 w-12 rounded-md border bg-transparent px-1 text-center ${slides ? "border-white/20" : "border-input"}`}
            />
            <span className={slides ? "text-white/60" : "text-muted-foreground"}>/ {total}</span>
          </label>
          <button type="button" aria-label={slides ? "Next slide" : "Next page"} disabled={page >= total} onClick={() => go(page + 1)} className={btn(slides)}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" aria-label={full ? "Exit full screen" : "Full screen"} onClick={toggleFull} className={`${btn(slides)} ml-1`}>
            {full ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
          </button>
        </span>
      </figcaption>

      <div className={`relative flex flex-1 items-center justify-center ${slides ? "px-3 pb-3 sm:px-6 sm:pb-6" : "p-3 sm:p-6"} ${full ? "min-h-0" : ""}`}>
        <div className={`relative ${full ? "h-full" : "w-full"} ${slides ? "" : "max-w-[880px]"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- pages are served by an access-checked route */}
          <img
            key={page}
            ref={img}
            src={src(page)}
            alt={`${title}, ${slides ? "slide" : "page"} ${page} of ${total}`}
            draggable={false}
            onLoad={() => setLoaded(true)}
            className={`pointer-events-none mx-auto select-none bg-white transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-40"} ${
              slides ? "rounded-md shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]" : "rounded-sm shadow-[0_18px_50px_-25px_rgba(0,0,0,0.45)]"
            } ${full ? "h-full w-auto max-w-full object-contain" : "w-full"}`}
          />
          {watermark && <Watermark text={watermark} />}
          {/* Clicking either half turns the page, like a deck. */}
          <button type="button" tabIndex={-1} aria-hidden onClick={() => go(page - 1)} className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize" />
          <button type="button" tabIndex={-1} aria-hidden onClick={() => go(page + 1)} className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize" />
        </div>
      </div>

      <div className={`h-1 ${slides ? "bg-white/10" : "bg-border"}`} aria-hidden>
        <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${(page / total) * 100}%` }} />
      </div>

      {page < total && (
        // Warm the next page so turning it feels instant.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src(page + 1)} alt="" aria-hidden className="hidden" />
      )}
    </figure>
  );
}

const btn = (dark: boolean) =>
  `grid h-8 w-8 place-items-center rounded-md border transition-colors disabled:opacity-30 ${dark ? "border-white/20 hover:bg-white/10" : "border-input hover:bg-secondary"}`;

/** The learner's identity, tiled faintly across the content. */
export function Watermark({ text }: { text: string }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='200'><text x='0' y='120' transform='rotate(-24 180 100)' font-family='sans-serif' font-size='15' fill='rgba(20,32,74,0.13)'>${escapeXml(text)}</text></svg>`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 select-none mix-blend-multiply dark:mix-blend-normal"
      style={{ backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`, backgroundRepeat: "repeat" }}
    />
  );
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}
