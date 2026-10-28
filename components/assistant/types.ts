import type { Citation, ReplyPayload } from "@/lib/services/assistant/assistant";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Citation[];
  payload: ReplyPayload;
  provider: string | null;
  feedback: "HELPFUL" | "NOT_HELPFUL" | "INCORRECT" | null;
  createdAt: string;
}
