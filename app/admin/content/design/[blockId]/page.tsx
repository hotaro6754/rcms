import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { Designer } from "@/components/design/Designer";
import { EMPTY_DESIGN, validateDesign } from "@/lib/design/schema";
import { saveDesignAction } from "@/lib/actions/cms";

export const metadata = { title: "Visual designer" };

/** The full-screen designer for one lesson design block. */
export default async function DesignBlockPage({ params }: { params: Promise<{ blockId: string }> }) {
  await requirePagePermission("content.edit");
  const { blockId } = await params;
  const block = await prisma.contentBlock.findUnique({
    where: { id: blockId },
    select: { id: true, kind: true, data: true, lesson: { select: { id: true, title: true, module: { select: { programId: true, program: { select: { name: true } } } } } } },
  });
  if (!block || block.kind !== "DESIGN") notFound();
  const data = (block.data ?? {}) as { title?: string; design?: unknown };
  const checked = validateDesign(data.design ?? EMPTY_DESIGN);
  const courseId = block.lesson.module.programId;
  const images = await prisma.mediaAsset.findMany({ where: { kind: "IMAGE", archivedAt: null }, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, title: true } });
  const back = `/admin/content/courses/${courseId}?item=lesson:${block.lesson.id}`;
  return (
    <Designer
      title={`${data.title || "Design"} · ${block.lesson.title}`}
      initial={checked.ok ? checked.design : EMPTY_DESIGN}
      media={images.map((m) => ({ id: m.id, title: m.title, url: `/api/media/${m.id}?c=${courseId}` }))}
      mediaQuery={`?c=${courseId}`}
      backHref={back}
      backLabel="Back to the lesson"
      save={saveDesignAction.bind(null, block.id)}
    />
  );
}
