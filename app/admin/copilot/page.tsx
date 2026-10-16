import { redirect } from "next/navigation";
import { isStaff, requireActor } from "@/lib/actor";
import { AssistantPage } from "@/components/assistant/AssistantPage";

export const metadata = { title: "Copilot" };

export default async function StaffCopilot({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const actor = await requireActor();
  if (!isStaff(actor)) redirect("/assistant");
  const sp = await searchParams;
  return <AssistantPage actor={actor} mode="staff" base="/admin/copilot" c={sp.c} />;
}
