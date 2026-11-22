import { MonitorPlay } from "lucide-react";
import { videoEmbedUrl } from "@/lib/cms/video";
import type { SnapshotBlock } from "@/lib/cms/snapshot";

/**
 * The lesson's videos, framed for the player's theatre: a large 16:9 screen with ambient glow,
 * the title and caption status beneath. Video plays from the allow-listed secure host in a
 * sandboxed frame; no file is ever served from this site, so there is nothing to download.
 */
export function VideoStage({ blocks, watermark }: { blocks: SnapshotBlock[]; watermark?: string }) {
  const videos = blocks.filter((b) => b.kind === "VIDEO");
  return (
    <div className="flex flex-col gap-8">
      {videos.map((b, i) => {
        const d = b.data as { url?: string; title?: string; captions?: boolean };
        const src = videoEmbedUrl(String(d.url ?? ""));
        return (
          <figure key={b.id} className="flex flex-col gap-3">
            <div className="relative">
              <div aria-hidden className="absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgba(91,124,255,0.28),transparent_65%)] blur-2xl" />
              <div className="relative aspect-video overflow-hidden rounded-[18px] bg-black shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-white/10">
                {src ? (
                  <iframe
                    src={src}
                    title={String(d.title ?? "Lesson video")}
                    loading={i === 0 ? "eager" : "lazy"}
                    allow="encrypted-media; picture-in-picture; fullscreen"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <p className="absolute inset-0 grid place-items-center text-[13px] text-white/60">This video cannot be played here.</p>
                )}
                {watermark && (
                  <span aria-hidden className="pointer-events-none absolute right-4 top-3 select-none text-[11px] tracking-wide text-white/25">
                    {watermark}
                  </span>
                )}
              </div>
            </div>
            <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[13px] text-white/65">
              <MonitorPlay className="h-4 w-4 text-[#2dd4bf]" aria-hidden />
              <span className="font-medium text-white/90">{String(d.title ?? "")}</span>
              {d.captions ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10.5px] tracking-[0.08em] text-white/60">CC</span> : null}
              {videos.length > 1 && <span className="ml-auto text-[11.5px] text-white/40">Part {i + 1} of {videos.length}</span>}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
