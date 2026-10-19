import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { Designer } from "@/components/design/Designer";
import { EMPTY_DESIGN, type Design } from "@/lib/design/schema";
import { pageForEditor } from "@/lib/services/site/pages";
import { saveSiteDesignAction } from "@/lib/actions/site";

export const metadata = { title: "Visual designer" };

/** The full-screen designer for a design field on a website page (saved into its draft). */
export default async function SiteDesignPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ field?: string }> }) {
  const actor = await requirePagePermission("site.edit");
  const { key } = await params;
  const field = (await searchParams).field ?? "body";
  if (!/^[\w.]{1,80}$/.test(field)) notFound();
  const page = await pageForEditor(actor, key).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });
  let value: unknown = page.draft ?? page.published;
  for (const seg of field.split(".")) value = (value as Record<string, unknown> | undefined)?.[seg];
  // Website pages are public, so only public images can be placed on them.
  const images = await prisma.mediaAsset.findMany({ where: { kind: "IMAGE", isPublic: true, archivedAt: null }, orderBy: { createdAt: "desc" }, take: 300, select: { id: true, title: true } });
  return (
    <Designer
      title={`${page.def.label} · draft`}
      initial={(value as Design | undefined) ?? EMPTY_DESIGN}
      media={images.map((m) => ({ id: m.id, title: m.title, url: `/api/media/${m.id}` }))}
      mediaQuery=""
      backHref={`/admin/site/${key}`}
      backLabel="Back to the page"
      save={saveSiteDesignAction.bind(null, key, field)}
    />
  );
}
