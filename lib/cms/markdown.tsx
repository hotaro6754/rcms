import { Fragment, type ReactNode } from "react";

/**
 * A deliberately small Markdown subset, rendered straight to React elements.
 *
 * Authors get paragraphs, `## headings`, `- bullets`, `1. numbered lists`, `**bold**`,
 * `*italic*`, `` `code` `` and `[links](https://…)`. There is no HTML pass-through and no
 * dangerouslySetInnerHTML anywhere, so stored cross-site scripting is impossible by
 * construction: whatever an author types is rendered as text. Links are limited to https,
 * mailto and same-site paths.
 */

const SAFE_HREF = /^(https:\/\/|mailto:|\/(?!\/))/i;

export function safeHref(href: string): string | null {
  const h = href.trim();
  return SAFE_HREF.test(h) ? h : null;
}

const INLINE = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\))/g;

export function renderInline(text: string, keyBase = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const key = `${keyBase}-${n++}`;
    if (m[2] !== undefined) out.push(<strong key={key}>{m[2]}</strong>);
    else if (m[3] !== undefined) out.push(<em key={key}>{m[3]}</em>);
    else if (m[4] !== undefined)
      out.push(
        <code key={key} className="rounded-[2px] bg-secondary px-1 py-0.5 font-mono text-[0.92em]">
          {m[4]}
        </code>,
      );
    else if (m[5] !== undefined) {
      const href = safeHref(m[6]);
      out.push(
        href ? (
          <a
            key={key}
            href={href}
            className="underline decoration-input underline-offset-4 hover:decoration-foreground"
            {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
          >
            {m[5]}
          </a>
        ) : (
          <Fragment key={key}>{m[5]}</Fragment>
        ),
      );
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Chunk =
  | { t: "p"; lines: string[] }
  | { t: "h"; level: 2 | 3; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] };

export function parseBlocks(src: string): Chunk[] {
  const chunks: Chunk[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let cur: Chunk | null = null;
  const flush = () => {
    if (cur) chunks.push(cur);
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = /^(#{2,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      chunks.push({ t: "h", level: h[1].length as 2 | 3, text: h[2] });
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (cur?.t !== "ul") {
        flush();
        cur = { t: "ul", items: [] };
      }
      (cur as { items: string[] }).items.push(ul[1]);
      continue;
    }
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      if (cur?.t !== "ol") {
        flush();
        cur = { t: "ol", items: [] };
      }
      (cur as { items: string[] }).items.push(ol[1]);
      continue;
    }
    if (cur?.t !== "p") {
      flush();
      cur = { t: "p", lines: [] };
    }
    (cur as { lines: string[] }).lines.push(line.trim());
  }
  flush();
  return chunks;
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const chunks = parseBlocks(text ?? "");
  return (
    <div className={className ?? "flex flex-col gap-5"}>
      {chunks.map((c, i) => {
        const k = `b${i}`;
        switch (c.t) {
          case "h":
            return c.level === 2 ? (
              <h2 key={k} className="mt-2 text-[1.35rem] leading-snug">
                {renderInline(c.text, k)}
              </h2>
            ) : (
              <h3 key={k} className="mt-1 text-[1.1rem] font-semibold leading-snug">
                {renderInline(c.text, k)}
              </h3>
            );
          case "ul":
            return (
              <ul key={k} className="ml-5 list-disc space-y-1.5 text-[15px] leading-[1.7] text-secondary-foreground">
                {c.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={k} className="ml-5 list-decimal space-y-1.5 text-[15px] leading-[1.7] text-secondary-foreground">
                {c.items.map((it, j) => (
                  <li key={j}>{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ol>
            );
          default:
            return (
              <p key={k} className="text-[15px] leading-[1.72] text-secondary-foreground">
                {renderInline(c.lines.join(" "), k)}
              </p>
            );
        }
      })}
    </div>
  );
}
