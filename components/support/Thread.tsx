import { when } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

/** A conversation, oldest first. Internal notes are marked and only ever passed in for staff. */
export function Thread({ messages, names, selfId }: { messages: { id: string; authorId: string; body: string; internal: boolean; masked: boolean; createdAt: Date }[]; names: Record<string, string>; selfId: string }) {
  return (
    <ol className="flex flex-col gap-3" aria-live="polite">
      {messages.length === 0 && <li className="text-[13px] text-muted-foreground">No messages kept (removed under the retention policy).</li>}
      {messages.map((m) => (
        <li key={m.id} className={cn("max-w-[85%] rounded-[var(--radius)] border px-4 py-3", m.internal ? "self-stretch border-warning/40 bg-warning-bg" : m.authorId === selfId ? "self-end border-border bg-secondary" : "self-start border-border bg-card")}>
          <p className="text-data text-[10.5px] tracking-[0.08em] text-subtle">
            {m.internal ? "INTERNAL NOTE · " : ""}
            {(m.authorId === selfId ? "You" : (names[m.authorId] ?? "Support")).toUpperCase()} · {when(m.createdAt, true)}
          </p>
          <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed">{m.body}</p>
          {m.masked && <p className="mt-1 text-[11.5px] text-muted-foreground">Part of this message was removed because it looked like sensitive data.</p>}
        </li>
      ))}
    </ol>
  );
}

export const PHI_WARNING =
  "Please do not enter patient information, medical records, account or member numbers, passwords or payment-card details. Anything that looks like them is removed automatically.";
