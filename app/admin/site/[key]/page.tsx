import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { ServiceError } from "@/lib/errors";
import { PageHead } from "@/components/platform/PlatformShell";
import { when } from "@/components/admin/kit";
import { SiteEditor } from "@/components/site-editor/SiteEditor";
import { pageForEditor } from "@/lib/services/site/pages";

export const metadata = { title: "Edit page" };

export default async function EditSitePage({ params }: { params: Promise<{ key: string }> }) {
  const actor = await requirePagePermission("site.edit");
  const { key } = await params;
  const page = await pageForEditor(actor, key).catch((e) => {
    if (e instanceof ServiceError) notFound();
    throw e;
  });
  const media = await prisma.mediaAsset.findMany({ where: { kind: "IMAGE", isPublic: true, archivedAt: null }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true, altText: true } });

  const status = [
    page.version ? `Live: version ${page.version}, published ${when(page.publishedAt, true)}${page.publishedBy ? ` by ${page.publishedBy}` : ""}.` : page.custom ? "Not published yet: visitors cannot see this page." : "Live: the original copy.",
    page.draftUpdatedAt ? `Draft saved ${when(page.draftUpdatedAt, true)}${page.draftBy ? ` by ${page.draftBy}` : ""}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <Link href="/admin/site" className="text-[13px] underline underline-offset-4">
        ← Website pages
      </Link>
      <PageHead kicker={page.def.group} title={page.def.label} lede={page.def.description ?? `The copy on ${page.def.path}. Edit, save a draft, preview it on the real page, then publish.`} />
      <SiteEditor
        // A new key remounts the editor rather than mixing two pages' state.
        key={key}
        pageKey={key}
        def={page.def}
        custom={page.custom}
        title={page.def.label}
        initial={(page.draft ?? page.published) as Record<string, unknown>}
        hasDraft={page.draft != null}
        published={page.custom ? page.version > 0 : true}
        lockVersion={page.lockVersion}
        version={page.version}
        status={status}
        versions={page.versions.map((v) => ({ ...v, createdAt: when(v.createdAt, true) }))}
        media={media.map((m) => ({ src: `/api/media/${m.id}`, title: m.title, alt: m.altText ?? "" }))}
      />
    </div>
  );
}
