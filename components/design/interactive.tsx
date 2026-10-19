"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Markdown } from "@/lib/cms/markdown";
import { cn } from "@/lib/utils";

/** The interactive parts of a design: they work the same in the designer and for learners. */

export function AccordionView({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
      {items.map((it, i) => (
        <details key={i} className="group px-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[15px] font-medium">
            {it.title || "Untitled"}
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="pb-4">
            <Markdown text={it.body} className="flex flex-col gap-3" />
          </div>
        </details>
      ))}
    </div>
  );
}

export function TabsView({ items }: { items: { title: string; body: string }[] }) {
  const [on, setOn] = useState(0);
  const base = useId();
  if (!items.length) return null;
  const cur = Math.min(on, items.length - 1);
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-border">
        {items.map((it, i) => (
          <button
            key={i}
            id={`${base}-t${i}`}
            role="tab"
            type="button"
            aria-selected={i === cur}
            aria-controls={`${base}-p${i}`}
            tabIndex={i === cur ? 0 : -1}
            onClick={() => setOn(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setOn((cur + 1) % items.length);
              if (e.key === "ArrowLeft") setOn((cur - 1 + items.length) % items.length);
            }}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[14px]", i === cur ? "border-foreground font-semibold" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {it.title || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      <div id={`${base}-p${cur}`} role="tabpanel" aria-labelledby={`${base}-t${cur}`} className="pt-5">
        <Markdown text={items[cur].body} />
      </div>
    </div>
  );
}

export function FlipCardsView({ items, columns }: { items: { front: string; back: string }[]; columns: string }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  return (
    <div className={cn("grid gap-4", columns === "2" ? "sm:grid-cols-2" : columns === "4" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3")}>
      {items.map((it, i) => {
        const on = flipped.has(i);
        return (
          <button
            key={i}
            type="button"
            aria-pressed={on}
            onClick={() => setFlipped((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set(s).add(i)))}
            className={cn("min-h-36 rounded-[var(--radius)] border p-5 text-left transition-colors", on ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/50")}
          >
            <span className="block text-[11px] uppercase tracking-[0.08em] opacity-70">{on ? "Answer" : "Tap to reveal"}</span>
            {on ? <Markdown text={it.back} className="mt-2 flex flex-col gap-2 [&_p]:text-inherit" /> : <span className="mt-2 block text-[1.1rem] font-semibold leading-snug">{it.front}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function RevealView({ prompt, answer, button }: { prompt: string; answer: string; button: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-5">
      <Markdown text={prompt} />
      {open ? (
        <div className="mt-4 border-t border-border pt-4" aria-live="polite">
          <Markdown text={answer} />
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex min-h-10 items-center rounded-md border border-input px-4 text-[14px] font-medium hover:bg-secondary">
          {button || "Show the answer"}
        </button>
      )}
    </div>
  );
}

/** A self-check question. It is not graded or recorded; assessments do that. */
export function KnowledgeCheckView({ question, options, correct, explanation }: { question: string; options: { text: string }[]; correct: number; explanation: string }) {
  const [pick, setPick] = useState<number | null>(null);
  const name = useId();
  return (
    <fieldset className="rounded-[var(--radius)] border border-border bg-card p-5">
      <legend className="sr-only">Check your understanding</legend>
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Check your understanding</p>
      <div className="mt-2">
        <Markdown text={question} />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {options.map((o, i) => (
          <label key={i} className={cn("flex cursor-pointer items-start gap-3 rounded-[3px] border px-3 py-2.5 text-[14px]", pick === null ? "border-border hover:bg-secondary" : i === correct ? "border-success bg-success-bg" : i === pick ? "border-danger bg-danger-bg" : "border-border opacity-70")}>
            <input type="radio" name={name} className="mt-1" checked={pick === i} disabled={pick !== null} onChange={() => setPick(i)} />
            {o.text}
          </label>
        ))}
      </div>
      {pick !== null && (
        <div className="mt-4" aria-live="polite">
          <p className={cn("text-[14px] font-semibold", pick === correct ? "text-success" : "text-danger")}>{pick === correct ? "Correct." : "Not quite."}</p>
          {explanation && <Markdown text={explanation} className="mt-2 flex flex-col gap-2" />}
          <button type="button" className="mt-3 text-[13px] underline underline-offset-4" onClick={() => setPick(null)}>
            Try again
          </button>
        </div>
      )}
    </fieldset>
  );
}
