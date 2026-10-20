import { notFound } from "next/navigation";
import { PageHeader } from "@/components/site/PageHeader";
import { DesignView } from "@/components/design/DesignView";
import { getCustomPage } from "@/lib/site/content";
import { pageMeta } from "@/lib/seo";

/** Pages made from scratch in the website editor (/admin/site). */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getCustomPage((await params).slug).catch(() => null);
  if (!page) return { title: "Page not found" };
  return pageMeta({ title: page.content.title, description: page.content.seoDescription, path: page.def.path });
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getCustomPage((await params).slug).catch(() => null);
  if (!page) notFound();
  const c = page.content;
  return (
    <>
      <PageHeader eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
      <section>
        <div className="mx-auto max-w-[1320px] px-6 py-12">
          <DesignView design={c.body} ctx={{ mediaUrl: (id) => `/api/media/${id}` }} />
        </div>
      </section>
    </>
  );
}
