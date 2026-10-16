import type { AssistantMessage } from "@prisma/client";
import type { ChatMessage } from "./types";

/** A stored message as the chat component receives it. */
export function toChatMessage(m: AssistantMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citations: (m.citations as unknown as ChatMessage["citations"]) ?? [],
    payload: (m.payload as unknown as ChatMessage["payload"]) ?? {},
    provider: m.provider,
    feedback: m.feedback,
    createdAt: m.createdAt.toISOString(),
  };
}
