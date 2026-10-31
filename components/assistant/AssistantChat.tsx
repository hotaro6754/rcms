"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BTN, BTN_OUTLINE, FIELD, Pill, TEXTAREA } from "@/components/admin/kit";
import { askAction, assistantConfirmAction, assistantFeedbackAction, assistantTicketAction } from "@/lib/actions/assistant";
import type { ChatMessage } from "./types";

const KIND_LABEL: Record<string, string> = { lesson: "Lesson", library: "Library", help: "Help", course: "Course" };

/**
 * The assistant conversation. Answers render as plain text; the only links shown are the cited
 * sources and items the server returned, never links written by a model.
 */
export function AssistantChat({
  mode,
  conversationId: initialId,
  initial,
  context,
  suggestions,
  categories,
  providerLabel,
}: {
  mode: "learner" | "staff";
  conversationId: string | null;
  initial: ChatMessage[];
  context: string | null;
  suggestions: string[];
  categories: { value: string; label: string }[];
  providerLabel: string;
}) {
  const [conversationId, setConversationId] = useState(initialId);
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Switch only when the page now shows a different conversation (sidebar link, "New
  // conversation"); the address change after the first answer names the one already here.
  const shown = useRef(initialId);
  useEffect(() => {
    if (initialId === shown.current || initialId === conversationId) return;
    shown.current = initialId;
    setConversationId(initialId);
    setMessages(initial);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  const send = (q: string) => {
    const question = q.trim();
    if (!question || pending) return;
    setError(null);
    start(async () => {
      const r = await askAction({ conversationId, text: question, mode, context });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setText("");
      setMessages((m) => [...m, ...r.data.messages]);
      if (!conversationId) {
        setConversationId(r.data.conversationId);
        shown.current = r.data.conversationId;
        // Update the address without re-rendering the page, so anything already typed is kept.
        window.history.replaceState(null, "", `?c=${r.data.conversationId}`);
      }
    });
  };

  const replace = (id: string, patch: Partial<ChatMessage>) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol aria-label="Conversation" className="flex flex-col gap-4">
        {messages.length === 0 && (
          <li className="rounded-[var(--radius)] border border-dashed border-border px-5 py-6 text-[14px] text-muted-foreground">
            <p>{mode === "staff" ? "Ask about tickets, content or learners, or type “help”." : "Ask about a revenue-cycle topic, your progress, or how something works here."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-input bg-card px-3 py-1.5 text-[12.5px] text-foreground hover:bg-secondary">
                  {s}
                </button>
              ))}
            </div>
          </li>
        )}
        {messages.map((m) =>
          m.role === "USER" ? (
            <li key={m.id} className="ml-auto max-w-[85%] rounded-[var(--radius)] bg-secondary px-4 py-2.5 text-[14px]">
              <span className="sr-only">You: </span>
              {m.content}
            </li>
          ) : (
            <li key={m.id} className="max-w-[95%] rounded-[var(--radius)] border border-border bg-card px-4 py-3">
              <span className="sr-only">Assistant: </span>
              <Answer m={m} conversationId={conversationId} categories={categories} onUpdate={replace} onAppend={(x) => setMessages((ms) => [...ms, x])} />
            </li>
          ),
        )}
      </ol>
      <div ref={end} />
      <p aria-live="polite" className="sr-only">
        {pending ? "Thinking" : messages.at(-1)?.role === "ASSISTANT" ? `Assistant: ${messages.at(-1)!.content.slice(0, 200)}` : ""}
      </p>
      {error && (
        <p role="alert" className="border-l-2 border-danger pl-3 text-[13.5px] text-danger">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background pt-3"
      >
        <label htmlFor="assistant-q" className="sr-only">
          Your question
        </label>
        <textarea
          id="assistant-q"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(text);
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder={mode === "staff" ? "e.g. Show open high-priority tickets for my team" : "e.g. What does the CO group code mean?"}
          className={TEXTAREA}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-muted-foreground">{providerLabel} Do not enter patient information.</p>
          <button className={BTN} disabled={pending || !text.trim()}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function Answer({
  m,
  conversationId,
  categories,
  onUpdate,
  onAppend,
}: {
  m: ChatMessage;
  conversationId: string | null;
  categories: { value: string; label: string }[];
  onUpdate: (id: string, patch: Partial<ChatMessage>) => void;
  onAppend: (m: ChatMessage) => void;
}) {
  const p = m.payload;
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(true);
  return (
    <div className="flex flex-col gap-3 text-[14px] leading-relaxed">
      {p.mode === "grounded" && <Pill tone="amber" className="w-fit">AI-written from cited sources</Pill>}
      {p.mode === "extractive" && <Pill className="w-fit">Quoted from approved material</Pill>}
      {p.mode === "facts" && <Pill tone="green" className="w-fit">From your records</Pill>}
      <p className="whitespace-pre-line">{m.content}</p>
      {p.notice && <p className="text-[12.5px] text-muted-foreground">{p.notice}</p>}

      {p.items && p.items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {p.items.map((it, i) => (
            <li key={i} className="text-[13.5px]">
              {it.href ? (
                <Link href={it.href} className="font-medium underline underline-offset-4">
                  {it.label}
                </Link>
              ) : (
                <span className="font-medium">{it.label}</span>
              )}
              {it.meta && <span className="block text-[12.5px] text-muted-foreground">{it.meta}</span>}
            </li>
          ))}
        </ul>
      )}

      {m.citations.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Sources</p>
          <ol className="mt-1.5 flex flex-col gap-2">
            {m.citations.map((c, i) => (
              <li key={i} className="text-[13px]">
                <span className="text-data text-muted-foreground">[{i + 1}]</span>{" "}
                <Link href={c.href} className="underline underline-offset-4">
                  {c.title}
                </Link>{" "}
                <span className="text-muted-foreground">
                  {KIND_LABEL[c.kind] ?? c.kind}
                  {c.context ? ` · ${c.context}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {p.offerTicket && conversationId && offerOpen && !p.ticket && (
        <form
          className="flex flex-col gap-2 rounded-[3px] border border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setErr(null);
            start(async () => {
              const r = await assistantTicketAction(conversationId, { category: String(fd.get("category")), subject: String(fd.get("subject")), body: String(fd.get("body")) });
              if (!r.ok) return setErr(r.error);
              setOfferOpen(false);
              onAppend(r.data);
            });
          }}
        >
          <p className="text-[13px] font-semibold">Send to the support team</p>
          <label className="flex flex-col gap-1 text-micro font-medium">
            Topic
            <select name="category" defaultValue={p.offerTicket.category} className={FIELD}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-micro font-medium">
            Subject
            <input name="subject" defaultValue={p.offerTicket.subject} required minLength={4} maxLength={160} className={FIELD} />
          </label>
          <label className="flex flex-col gap-1 text-micro font-medium">
            Message
            <textarea name="body" defaultValue={p.offerTicket.body} required minLength={10} rows={3} className={TEXTAREA} />
          </label>
          {err && (
            <p role="alert" className="text-[12.5px] text-danger">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <button className={BTN} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Send to support
            </button>
            <button type="button" className={BTN_OUTLINE} onClick={() => setOfferOpen(false)}>
              Not now
            </button>
          </div>
        </form>
      )}

      {p.ticket && (
        <Link href={`/support/${p.ticket.id}`} className={`${BTN_OUTLINE} w-fit`}>
          Open {p.ticket.reference}
        </Link>
      )}

      {p.action && (
        <div className="flex flex-wrap items-center gap-2">
          {p.action.done ? (
            <Pill tone="green">Done</Pill>
          ) : (
            <button
              type="button"
              className={BTN}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setErr(null);
                  const r = await assistantConfirmAction(m.id);
                  if (!r.ok) return setErr(r.error);
                  onUpdate(m.id, { payload: { ...p, action: { ...p.action!, done: true } } });
                  onAppend(r.data);
                })
              }
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Confirm: {p.action.label}
            </button>
          )}
          {err && (
            <p role="alert" className="text-[12.5px] text-danger">
              {err}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-[12px] text-muted-foreground">
        <span>Was this useful?</span>
        {(
          [
            ["HELPFUL", "Yes"],
            ["NOT_HELPFUL", "No"],
            ["INCORRECT", "It is wrong"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={m.feedback === v}
            onClick={() =>
              start(async () => {
                const r = await assistantFeedbackAction(m.id, v);
                if (r.ok) onUpdate(m.id, { feedback: v });
              })
            }
            className="rounded-[3px] border border-input px-2 py-0.5 aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
