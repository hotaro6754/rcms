import type { ReactNode } from "react";
import { AlertTriangle, Check, Info, Lightbulb, ShieldCheck } from "lucide-react";
import { Markdown, renderInline } from "@/lib/cms/markdown";
import { videoEmbedUrl } from "@/lib/cms/video";
import type { CanvasItemValue, ComponentType, StyleValue } from "@/lib/design/schema";
import { cn } from "@/lib/utils";
import { css } from "./style";
import { AccordionView, FlipCardsView, KnowledgeCheckView, RevealView, TabsView } from "./interactive";

/**
 * How each design component looks. The designer (Puck) and the learner and website renderers
 * all draw components through this one function, so what an author arranges is exactly what
 * people see. Props arrive already checked by lib/design/schema.ts.
 */

export type DesignContext = { mediaUrl: (id: string) => string };

type P = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
const st = (v: unknown) => (v ?? {}) as Partial<StyleValue>;

const COLS: Record<string, string> = { "2": "sm:grid-cols-2", "3": "sm:grid-cols-2 lg:grid-cols-3", "4": "sm:grid-cols-2 lg:grid-cols-4" };
const WIDTH: Record<string, string> = { narrow: "max-w-[44rem]", normal: "max-w-[72rem]", wide: "max-w-[90rem]", full: "max-w-none" };
const TONE = {
  info: { icon: Info, cls: "border-border bg-secondary/60" },
  tip: { icon: Lightbulb, cls: "border-brand/40 bg-brand/5" },
  warning: { icon: AlertTriangle, cls: "border-warning/40 bg-warning-bg" },
  compliance: { icon: ShieldCheck, cls: "border-foreground/30 bg-card" },
} as const;

export function ComponentView({ type, props: p, ctx, slots = {} }: { type: ComponentType; props: P; ctx: DesignContext; slots?: Record<string, ReactNode> }) {
  switch (type) {
    case "Section":
      return (
        <section style={css(st(p.style))} className={cn("w-full", !st(p.style).padding && "py-8")}>
          <div className={cn("mx-auto flex w-full flex-col gap-5 px-1", WIDTH[s(p.width)] ?? WIDTH.normal)}>{slots.content}</div>
        </section>
      );
    case "Columns": {
      const n = Number(p.columns) || 2;
      const ratio = s(p.ratio);
      const template = n === 2 && ratio === "wide-left" ? "md:grid-cols-[2fr_1fr]" : n === 2 && ratio === "wide-right" ? "md:grid-cols-[1fr_2fr]" : n === 2 ? "md:grid-cols-2" : n === 3 ? "md:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-4";
      const align = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }[s(p.align)] ?? "items-start";
      return (
        <div style={{ ...css(st(p.style)), gap: `${Number(p.gap) || 0}px` }} className={cn("grid grid-cols-1", template, align)}>
          {["col1", "col2", "col3", "col4"].slice(0, n).map((k) => (
            <div key={k} className="flex min-w-0 flex-col gap-4">
              {slots[k]}
            </div>
          ))}
        </div>
      );
    }
    case "Canvas": {
      const c = (p.canvas ?? {}) as P;
      return <CanvasView height={Number(c.height) || 480} background={s(c.background)} mobile={s(c.mobile)} items={arr<CanvasItemValue>(c.items)} ctx={ctx} />;
    }
    case "Heading": {
      const level = s(p.level) || "2";
      const cls = { "1": "text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.05]", "2": "text-[clamp(1.5rem,3vw,2.2rem)] leading-[1.1]", "3": "text-[1.35rem] leading-snug", "4": "text-[1.1rem] font-semibold leading-snug" }[level];
      const Tag = `h${level}` as "h1";
      return (
        <Tag style={css(st(p.style))} className={cls}>
          {s(p.text)}
        </Tag>
      );
    }
    case "Text":
      return (
        <div style={css(st(p.style))} className="[&_p]:text-inherit [&_li]:text-inherit">
          <Markdown text={s(p.text)} />
        </div>
      );
    case "Image": {
      const id = s(p.mediaId);
      const justify = { left: "mr-auto", center: "mx-auto", right: "ml-auto" }[s(p.align)] ?? "mx-auto";
      return (
        <figure className={cn("flex flex-col gap-2", justify)} style={{ width: `${Number(p.width) || 100}%` }}>
          {id ? (
            // eslint-disable-next-line @next/next/no-img-element -- media is served through an access-checked route
            <img src={ctx.mediaUrl(id)} alt={s(p.alt)} loading="lazy" draggable={false} className={cn("w-full border border-border bg-card object-contain", p.rounded ? "rounded-xl" : "rounded-[var(--radius)]")} />
          ) : (
            <div className="grid aspect-video place-items-center rounded-[var(--radius)] border border-dashed border-border text-[13px] text-muted-foreground">Choose an image</div>
          )}
          {s(p.caption) && <figcaption className="text-micro text-muted-foreground">{s(p.caption)}</figcaption>}
        </figure>
      );
    }
    case "Video": {
      const src = videoEmbedUrl(s(p.url));
      return src ? (
        <div className="aspect-video w-full overflow-hidden rounded-[var(--radius)] border border-border bg-black">
          <iframe src={src} title={s(p.title) || "Video"} className="h-full w-full" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" loading="lazy" />
        </div>
      ) : (
        <div className="grid aspect-video place-items-center rounded-[var(--radius)] border border-dashed border-border text-[13px] text-muted-foreground">Paste a YouTube, Vimeo, Bunny, Mux or Cloudflare Stream link</div>
      );
    }
    case "Button": {
      const variant = s(p.variant);
      const cls =
        variant === "outline"
          ? "inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium hover:bg-secondary"
          : variant === "link"
            ? "inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4"
            : "inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover";
      const justify = { left: "justify-start", center: "justify-center", right: "justify-end" }[s(p.align)] ?? "justify-start";
      const href = s(p.href);
      return (
        <div className={cn("flex", justify)}>
          {href ? (
            <a href={href} style={css(st(p.style))} className={cls} {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {s(p.label) || "Button"}
            </a>
          ) : (
            <span style={css(st(p.style))} className={cls}>
              {s(p.label) || "Button"}
            </span>
          )}
        </div>
      );
    }
    case "Callout": {
      const t = TONE[s(p.tone) as keyof typeof TONE] ?? TONE.info;
      const Icon = t.icon;
      return (
        <aside className={cn("flex gap-3 rounded-[var(--radius)] border px-4 py-3.5", t.cls)}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            {s(p.title) && <p className="text-[14px] font-semibold">{s(p.title)}</p>}
            <Markdown text={s(p.text)} className="flex flex-col gap-2 [&_p]:text-[14px]" />
          </div>
        </aside>
      );
    }
    case "Quote":
      return (
        <blockquote style={css(st(p.style))} className="border-l-2 border-brand pl-5">
          <Markdown text={s(p.text)} className="flex flex-col gap-2 [&_p]:text-[1.15rem] [&_p]:leading-relaxed [&_p]:text-foreground" />
          {s(p.cite) && <footer className="mt-2 text-[13px] text-muted-foreground">{s(p.cite)}</footer>}
        </blockquote>
      );
    case "List": {
      const items = arr<{ text: string }>(p.items);
      const marker = s(p.marker);
      if (marker === "check")
        return (
          <ul style={css(st(p.style))} className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
                <Check className="mt-1 h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span>{renderInline(it.text, `l${i}`)}</span>
              </li>
            ))}
          </ul>
        );
      const Tag = marker === "number" ? "ol" : "ul";
      return (
        <Tag style={css(st(p.style))} className={cn("ml-5 space-y-1.5 text-[15px] leading-relaxed", marker === "number" ? "list-decimal" : "list-disc")}>
          {items.map((it, i) => (
            <li key={i}>{renderInline(it.text, `l${i}`)}</li>
          ))}
        </Tag>
      );
    }
    case "Table": {
      const header = s(p.header)
        .split("|")
        .map((c) => c.trim());
      const rows = arr<{ cells: string }>(p.rows).map((r) => r.cells.split("|").map((c) => c.trim()));
      return (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border" style={css(st(p.style))}>
          <table className="w-full min-w-[32rem] border-collapse text-left text-[14px]">
            {s(p.caption) && <caption className="caption-top px-3 py-2 text-left text-micro text-muted-foreground">{s(p.caption)}</caption>}
            {header.some(Boolean) && (
              <thead className="bg-secondary/70">
                <tr>
                  {header.map((h, i) => (
                    <th key={i} scope="col" className="border-b border-border px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
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
    case "Stats":
      return (
        <dl className={cn("grid grid-cols-1 gap-4", COLS[s(p.columns)] ?? COLS["3"])}>
          {arr<{ value: string; label: string; note: string }>(p.items).map((it, i) => (
            <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-5" style={s(p.accent) ? { borderTop: `3px solid ${s(p.accent)}` } : undefined}>
              <dt className="text-[13px] text-muted-foreground">{it.label}</dt>
              <dd className="text-data mt-2 text-[2rem] font-semibold leading-none" style={s(p.accent) ? { color: s(p.accent) } : undefined}>
                {it.value}
              </dd>
              {it.note && <dd className="mt-2 text-[13px] text-muted-foreground">{it.note}</dd>}
            </div>
          ))}
        </dl>
      );
    case "Process": {
      const accent = s(p.accent) || "var(--brand)";
      const steps = arr<{ title: string; body: string }>(p.steps);
      return (
        <div>
          {s(p.title) && <p className="mb-4 text-[15px] font-semibold">{s(p.title)}</p>}
          <ol className={cn("grid grid-cols-1 gap-4", steps.length >= 4 ? "md:grid-cols-4" : steps.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
            {steps.map((st2, i) => (
              <li key={i} className="relative rounded-[var(--radius)] border border-border bg-card p-4">
                <span className="text-data grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold text-white" style={{ background: accent }}>
                  {i + 1}
                </span>
                <p className="mt-3 text-[15px] font-semibold">{st2.title}</p>
                <Markdown text={st2.body} className="mt-1.5 flex flex-col gap-2 [&_p]:text-[14px]" />
              </li>
            ))}
          </ol>
        </div>
      );
    }
    case "Timeline": {
      const accent = s(p.accent) || "var(--brand)";
      return (
        <ol className="relative ml-2 border-l-2 pl-6" style={{ borderColor: accent }}>
          {arr<{ when: string; title: string; body: string }>(p.items).map((it, i) => (
            <li key={i} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-background" style={{ background: accent }} aria-hidden />
              {it.when && <p className="text-data text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{it.when}</p>}
              <p className="text-[15px] font-semibold">{it.title}</p>
              <Markdown text={it.body} className="mt-1 flex flex-col gap-2 [&_p]:text-[14px]" />
            </li>
          ))}
        </ol>
      );
    }
    case "Cards":
      return (
        <div className={cn("grid grid-cols-1 gap-4", COLS[s(p.columns)] ?? COLS["3"])}>
          {arr<{ title: string; body: string; mediaId: string }>(p.items).map((it, i) => (
            <article key={i} style={css(st(p.style))} className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {it.mediaId && <img src={ctx.mediaUrl(it.mediaId)} alt="" draggable={false} className="aspect-[16/9] w-full object-cover" />}
              <div className="p-5">
                <h3 className="text-[1.05rem] font-semibold leading-snug">{it.title}</h3>
                <Markdown text={it.body} className="mt-2 flex flex-col gap-2 [&_p]:text-[14px]" />
              </div>
            </article>
          ))}
        </div>
      );
    case "BarChart": {
      const items = arr<{ label: string; value: number }>(p.items);
      const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
      const color = s(p.color) || "var(--chart-1)";
      return (
        <figure>
          {s(p.title) && <figcaption className="mb-3 text-[15px] font-semibold">{s(p.title)}</figcaption>}
          <div className="flex flex-col gap-2.5" role="list">
            {items.map((it, i) => (
              <div key={i} role="listitem" className="grid grid-cols-[minmax(6rem,12rem)_1fr_auto] items-center gap-3 text-[13.5px]">
                <span className="truncate">{it.label}</span>
                <span className="h-3 rounded-sm bg-secondary">
                  <span className="block h-3 rounded-sm" style={{ width: `${(Math.abs(it.value) / max) * 100}%`, background: color }} />
                </span>
                <span className="text-data tabular-nums">
                  {it.value.toLocaleString("en-IN")}
                  {s(p.unit)}
                </span>
              </div>
            ))}
          </div>
        </figure>
      );
    }
    case "Accordion":
      return <AccordionView items={arr(p.items)} />;
    case "Tabs":
      return <TabsView items={arr(p.items)} />;
    case "FlipCards":
      return <FlipCardsView items={arr(p.items)} columns={s(p.columns)} />;
    case "Reveal":
      return <RevealView prompt={s(p.prompt)} answer={s(p.answer)} button={s(p.button)} />;
    case "KnowledgeCheck":
      return <KnowledgeCheckView question={s(p.question)} options={arr(p.options)} correct={Number(p.correct) || 0} explanation={s(p.explanation)} />;
    case "Divider":
      return <hr style={{ borderColor: s(p.color) || undefined, marginBlock: `${Number(p.spacing) || 0}px` }} className="border-border" />;
    case "Spacer":
      return <div aria-hidden style={{ height: `${Number(p.height) || 0}px` }} />;
    default:
      return null;
  }
}

/**
 * Free-placed items. Positions are percentages, so the canvas scales with its container; on
 * phones it either stacks the items in reading order or keeps the layout scaled down.
 */
export function CanvasView({ height, background, mobile, items, ctx }: { height: number; background: string; mobile: string; items: CanvasItemValue[]; ctx: DesignContext }) {
  const ordered = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const stack = mobile !== "scale";
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-[var(--radius)] [container-type:inline-size]", stack && "max-sm:flex max-sm:flex-col max-sm:gap-3 max-sm:!aspect-auto max-sm:p-3")}
      style={{ aspectRatio: `1000 / ${height}`, background: background || undefined }}
    >
      {ordered.map((it) => (
        <div
          key={it.id || `${it.x}-${it.y}`}
          className={cn("absolute overflow-hidden", stack && "max-sm:static max-sm:!h-auto max-sm:!w-full")}
          style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.w}%`, height: `${it.h}%`, zIndex: it.z, ...css(it.style, { canvas: !stack }) }}
        >
          <CanvasItemView item={it} ctx={ctx} />
        </div>
      ))}
    </div>
  );
}

export function CanvasItemView({ item: it, ctx }: { item: CanvasItemValue; ctx: DesignContext }) {
  switch (it.kind) {
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return it.mediaId ? <img src={ctx.mediaUrl(it.mediaId)} alt={it.alt} draggable={false} className="h-full w-full object-cover" /> : <div className="h-full w-full border border-dashed border-border" />;
    case "shape":
      return <div className="h-full w-full" aria-hidden />;
    case "heading":
      return <p className="font-semibold leading-tight [font-family:var(--font-display)]">{it.text}</p>;
    case "badge":
      return <span className="inline-block rounded-full px-3 py-1 text-[0.85em] font-semibold">{it.text}</span>;
    default:
      return <Markdown text={it.text} className="flex flex-col gap-2 [&_p]:text-inherit" />;
  }
}
