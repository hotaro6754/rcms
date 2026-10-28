import Link from "next/link";
import type { Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { when } from "@/components/admin/kit";
import { AssistantChat } from "./AssistantChat";
import { toChatMessage } from "./serialize";
import { conversationView, listConversations, RETENTION_DAYS } from "@/lib/services/assistant/assistant";
import { categoryOptions } from "@/lib/services/support/tickets";
import { providerStatus } from "@/lib/assistant/provider";
import { deleteConversationAction } from "@/lib/actions/assistant";

const LEARNER_SUGGESTIONS = ["What do I need to complete before my certificate?", "What does the CO group code mean on a remittance?", "Where can I download my certificate?", "How is case practice scored?", "Can I talk to a human?"];
const STAFF_SUGGESTIONS = ["help", "Show open high-priority tickets for my team", "Show courses awaiting review", "Find courses missing outcomes or assessments", "Show recurring competency gaps"];

/** Shared page for the learner assistant (/assistant) and the staff copilot (/admin/copilot). */
export async function AssistantPage({ actor, mode, base, c, context }: { actor: Actor; mode: "learner" | "staff"; base: string; c?: string; context?: string | null }) {
  const [list, categories] = await Promise.all([listConversations(actor, mode), categoryOptions()]);
  let current = null;
  if (c) {
    try {
      current = await conversationView(actor, c);
    } catch (e) {
      if (!(e instanceof ServiceError)) throw e;
    }
  }
  const status = providerStatus();
  const staff = mode === "staff";
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <PageHead
        kicker={staff ? "Staff copilot" : "Learning assistant"}
        title={staff ? "Ask about your work" : "Ask the assistant"}
        lede={
          staff
            ? "Answers come from the platform's records within your permissions. Nothing changes unless you confirm it, and every change goes through the normal checks."
            : "Answers come from approved lessons you can open, the library and these help pages, with sources. Questions about your progress, certificates and support cases are answered from your records. If it cannot help, it hands you to a person."
        }
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <Link href={base} className="text-[13.5px] font-medium underline underline-offset-4">
            New conversation
          </Link>
          {list.length > 0 && (
            <nav aria-label="Conversations">
              <ul className="flex flex-col gap-1">
                {list.map((x) => (
                  <li key={x.id}>
                    <Link href={`${base}?c=${x.id}`} aria-current={x.id === current?.conversation.id ? "page" : undefined} className="block rounded-[3px] px-2 py-1.5 text-[13px] hover:bg-secondary aria-[current=page]:bg-secondary">
                      <span className="line-clamp-2">{x.title ?? "Conversation"}</span>
                      <span className="text-[11.5px] text-muted-foreground">{when(x.updatedAt, true)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {current && (
            <ActionForm action={deleteConversationAction} confirm="Delete this conversation? This cannot be undone.">
              <input type="hidden" name="id" value={current.conversation.id} />
              <input type="hidden" name="back" value={base} />
              <button className="text-[12.5px] text-danger underline underline-offset-4">Delete this conversation</button>
            </ActionForm>
          )}
          <p className="text-[12px] text-muted-foreground">Conversations are kept for {RETENTION_DAYS} days after your last message, then deleted.</p>
        </aside>
        <AssistantChat
          mode={mode}
          conversationId={current?.conversation.id ?? null}
          initial={current?.messages.map(toChatMessage) ?? []}
          context={current?.conversation.context ?? context ?? null}
          suggestions={staff ? STAFF_SUGGESTIONS : LEARNER_SUGGESTIONS}
          categories={categories.map((x) => ({ value: x.value, label: x.label }))}
          providerLabel={status.active ? "AI answers are generated from cited, approved material." : "Answers are quoted from approved material (no AI provider configured)."}
        />
      </div>
    </div>
  );
}
