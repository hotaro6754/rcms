import type { BlockKind } from "@prisma/client";
import { AlertTriangle, Info, Lightbulb, ShieldCheck } from "lucide-react";
import { Markdown, renderInline, safeHref } from "@/lib/cms/markdown";
import { videoEmbedUrl } from "@/lib/cms/blocks";
import { cn } from "@/lib/utils";

/**
 * Renders lesson content blocks. Used by the learner's lesson page (from the released
 * snapshot) and by the staff preview (from the draft), so both show exactly the same thing.
 *
 * Everything is rendered as React text; no block can inject HTML. Video is embedded only from
 * allowlisted hosts in a sandboxed iframe. Images load through /api/media, which checks
 * access, with the alternative text the author was required to write.
 */

export interface ViewBlock {
  id: string;
  kind: BlockKind;
  data: Record<string, unknown>;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

const TONE = {
  info: { icon: Info, cls: "border-border bg-secondary/60" },
  tip: { icon: Lightbulb, cls: "border-brand/40 bg-brand/5" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning-bg" },
  compliance: { icon: ShieldCheck, cls: "border-foreground/30 bg-card" },
} as const;

export function BlockView({ block, mediaContext }: { block: ViewBlock; mediaContext?: string }) {
  const d = block.data ?? {};
  switch (block.kind) {
    case "TEXT":
      return <Markdown text={s(d.text)} />;
    case "HEADING":
      return Number(d.level) === 3 ? <h3 className="mt-2 text-[1.15rem] font-semibold leading-snug">{s(d.text)}</h3> : <h2 className="mt-4 text-[1.45rem] leading-snug">{s(d.text)}</h2>;
    case "CALLOUT": {
      const t = TONE[(s(d.tone) as keyof typeof TONE) || "info"] ?? TONE.info;
      const Icon = t.icon;
      return (
        <aside className={cn("flex gap-3 rounded-[var(--radius)] border px-4 py-3.5", t.cls)}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            {s(d.title) && <p className="text-[14px] font-semibold">{s(d.title)}</p>}
            <Markdown text={s(d.text)} className="flex flex-col gap-2 [&_p]:text-[14px]" />
          </div>
        </aside>
      );
    }
    case "IMAGE":
      return (
        <figure className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- private media is served through an access-checked route */}
          <img src={`/api/media/${s(d.mediaId)}${mediaContext ? `?c=${encodeURIComponent(mediaContext)}` : ""}`} alt={s(d.alt)} loading="lazy" className="max-h-[32rem] w-full rounded-[var(--radius)] border border-border bg-card object-contain" />
          {s(d.caption) && <figcaption className="text-micro text-muted-foreground">{s(d.caption)}</figcaption>}
        </figure>
      );
    case "VIDEO": {
      const src = videoEmbedUrl(s(d.url));
      return (
        <figure className="flex flex-col gap-2">
          {src ? (
            <div className="relative aspect-video overflow-hidden rounded-[var(--radius)] border border-border bg-black">
              <iframe
                src={src}
                title={s(d.title)}
                loading="lazy"
                allow="encrypted-media; picture-in-picture; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full"
              />
            </div>
          ) : (
            <p className="text-micro text-danger">This video cannot be embedded.</p>
          )}
          <figcaption className="text-micro text-muted-foreground">
            {s(d.title)}
            {d.captions ? " · captions available" : ""}
          </figcaption>
          {s(d.transcript) && (
            <details className="rounded-[3px] border border-border bg-card px-3 py-2">
              <summary className="cursor-pointer text-micro font-medium">Transcript</summary>
              <Markdown text={s(d.transcript)} className="mt-2 flex flex-col gap-2 [&_p]:text-[13.5px]" />
            </details>
          )}
        </figure>
      );
    }
    case "LINK": {
      const href = safeHref(s(d.url));
      return (
        <p className="rounded-[3px] border border-border bg-card px-4 py-3 text-[14px]">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium underline underline-offset-4">
              {s(d.label)}
            </a>
          ) : (
            s(d.label)
          )}
          {s(d.description) && <span className="mt-1 block text-micro text-muted-foreground">{s(d.description)}</span>}
        </p>
      );
    }
    case "TABLE": {
      const header = (d.header as string[]) ?? [];
      const rows = (d.rows as string[][]) ?? [];
      return (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
          <table className="w-full text-left text-[13.5px]">
            {s(d.caption) && <caption className="caption-top px-3 py-2 text-left text-micro text-muted-foreground">{s(d.caption)}</caption>}
            <thead className="bg-secondary/60">
              <tr>
                {header.map((h, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-2 align-top">
                      {renderInline(c, `t${i}-${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "STEPS": {
      const steps = (d.steps as string[]) ?? [];
      return (
        <section>
          {s(d.title) && <p className="mb-2 text-[14px] font-semibold">{s(d.title)}</p>}
          <ol className="flex flex-col gap-2">
            {steps.map((st, i) => (
              <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed">
                <span className="text-data mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-[11px]">{i + 1}</span>
                <span>{renderInline(st, `s${i}`)}</span>
              </li>
            ))}
          </ol>
        </section>
      );
    }
    case "SCENARIO":
      return (
        <section className="rounded-[var(--radius)] border border-border bg-card">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
            <p className="text-[14px] font-semibold">{s(d.title)}</p>
            <span className="text-data text-[10px] tracking-[0.1em] text-subtle">SYNTHETIC CASE · NO PATIENT DATA</span>
          </header>
          <div className="flex flex-col gap-3 px-4 py-3.5">
            <Markdown text={s(d.context)} className="flex flex-col gap-3 [&_p]:text-[14px]" />
            {s(d.question) && (
              <p className="border-l-2 border-foreground pl-3 text-[14px] font-medium">{s(d.question)}</p>
            )}
            {s(d.discussion) && (
              <details>
                <summary className="cursor-pointer text-micro font-medium">Discussion</summary>
                <Markdown text={s(d.discussion)} className="mt-2 flex flex-col gap-2 [&_p]:text-[13.5px]" />
              </details>
            )}
          </div>
        </section>
      );
    case "CODE":
      return (
        <figure>
          {s(d.language) && <figcaption className="text-data mb-1 text-[10.5px] tracking-[0.1em] text-subtle">{s(d.language).toUpperCase()}</figcaption>}
          <pre className="overflow-x-auto rounded-[var(--radius)] border border-border bg-secondary/60 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
            <code>{s(d.code)}</code>
          </pre>
        </figure>
      );
    default:
      return null;
  }
}

export function Blocks({ blocks, mediaContext }: { blocks: ViewBlock[]; mediaContext?: string }) {
  return (
    <div className="flex max-w-[70ch] flex-col gap-6">
      {blocks.map((b) => (
        <BlockView key={b.id} block={b} mediaContext={mediaContext} />
      ))}
    </div>
  );
}
