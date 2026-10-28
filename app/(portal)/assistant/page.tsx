import { requireActor } from "@/lib/actor";
import { AssistantPage } from "@/components/assistant/AssistantPage";

export const metadata = { title: "Assistant" };

export default async function LearnerAssistant({ searchParams }: { searchParams: Promise<{ c?: string; context?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const context = sp.context && /^[a-z0-9-]+\/[a-z0-9]+$/i.test(sp.context) ? sp.context : null;
  return <AssistantPage actor={actor} mode="learner" base="/assistant" c={sp.c} context={context} />;
}
