import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { CaseWorkbench } from "@/components/sim/CaseWorkbench";
import { previewCaseScoreAction } from "@/lib/actions/sims";
import { CaseDefinition, learnerView } from "@/lib/sim/definition";

export const metadata = { title: "Case preview" };

/** The draft exactly as a learner would see it, with scoring that saves nothing. */
export default async function CasePreview({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("content.view");
  const { id } = await params;
  const c = await prisma.simCase.findUnique({ where: { id } });
  if (!c) notFound();
  const parsed = CaseDefinition.safeParse(c.draft);
  if (!parsed.success) notFound();
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href={`/admin/cases/${id}`} className="text-micro text-muted-foreground hover:text-foreground">
        ← Back to the editor
      </Link>
      <PageHead kicker="Preview of the current draft" title={parsed.data.title} lede="This is the learner's view. Scoring here uses the draft's answer key and saves nothing." />
      <div className="mt-8">
        <CaseWorkbench view={learnerView(parsed.data)} initial={{}} submit={previewCaseScoreAction.bind(null, id)} preview />
      </div>
    </div>
  );
}
