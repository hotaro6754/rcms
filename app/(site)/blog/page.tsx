import { PageHeader, Section } from "@/components/site/PageHeader";
import { getPageContent } from "@/lib/site/content";
import { blogPage } from "@/lib/site/pages/blog";
import { pageMeta } from "@/lib/seo";
import pageArt from "@/public/images/art3d/phases-stack.png";

export async function generateMetadata() {
  const c = await getPageContent(blogPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/blog" });
}

export default async function BlogPage() {
  const c = await getPageContent(blogPage);
  return (
    <>
      <PageHeader art={pageArt} artAlt="Three stacked platforms for the front end, middle and back end of the revenue cycle." eyebrow={c.header.eyebrow} title={c.header.title} lead={c.header.lead} />
      <Section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {c.posts.items.map((p, i) => (
            <article key={i} className="site-card flex flex-col p-6">
              <p className="text-data text-micro font-medium uppercase tracking-[0.06em] text-primary">{p.kind}</p>
              <h2 className="mt-3 text-[1.35rem] leading-tight">{p.title}</h2>
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">{p.lead}</p>
              <p className="text-data mt-5 border-t border-border pt-4 text-micro text-muted-foreground">
                {p.read} {c.posts.readLabel} · {p.date}
              </p>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
