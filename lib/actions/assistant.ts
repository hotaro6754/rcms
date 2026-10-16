"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { attempt } from "@/lib/errors";
import * as assistant from "@/lib/services/assistant/assistant";
import { str } from "./_form";
import { toChatMessage } from "@/components/assistant/serialize";

const view = toChatMessage;

export async function askAction(input: { conversationId: string | null; text: string; mode: "learner" | "staff"; context: string | null }) {
  return attempt(async () => {
    const r = await assistant.ask(await requireActor(), input);
    return { conversationId: r.conversationId, messages: [view(r.user), view(r.reply)] };
  });
}

export async function assistantTicketAction(conversationId: string, offer: { category: string; subject: string; body: string }) {
  return attempt(async () => {
    const m = await assistant.createTicketFromAssistant(await requireActor(), conversationId, offer);
    revalidatePath("/support");
    return view(m);
  });
}

export async function assistantFeedbackAction(messageId: string, feedback: "HELPFUL" | "NOT_HELPFUL" | "INCORRECT") {
  return attempt(async () => {
    await assistant.setFeedback(await requireActor(), messageId, feedback);
  });
}

export async function assistantConfirmAction(messageId: string) {
  return attempt(async () => view(await assistant.confirmAction(await requireActor(), messageId)));
}

export async function deleteConversationAction(fd: FormData) {
  return attempt(async () => {
    await assistant.deleteConversation(await requireActor(), str(fd, "id"));
    revalidatePath("/assistant");
    revalidatePath("/admin/copilot");
    return { href: str(fd, "back") || "/assistant" };
  });
}

