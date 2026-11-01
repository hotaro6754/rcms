import { PageHeader, Section } from "@/components/site/PageHeader";
import { getPageContent } from "@/lib/site/content";
import { communityPage } from "@/lib/site/pages/community";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  const c = await getPageContent(communityPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/community" });
}

export default async function CommunityPage() {
  const c = await getPageContent(communityPage);
  return (
    <>
      <PageHeader eyebrow={c.header.eyebrow} title={c.header.title} lead={c.header.lead} />

      {c.channels.show && (
        <Section title={c.channels.title}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {c.channels.items.map((ch, i) => (
              <article key={i} className="flex flex-col site-card p-5">
                <h2 className="text-data text-[15px] font-semibold text-primary">{ch.name}</h2>
                <p className="mt-1 text-micro text-muted-foreground">{ch.who}</p>
                <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-secondary-foreground">{ch.about}</p>
                <p className="mt-4 border-t border-border pt-3 text-micro leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{`${c.channels.ruleLabel} `}</span>
                  {ch.rule}
                </p>
              </article>
            ))}
          </div>
        </Section>
      )}

      {c.threads.show && (
        <Section tint title={c.threads.title} lead={c.threads.lead}>
          <ul className="divide-y divide-border overflow-hidden site-card">
            {c.threads.items.map((t, i) => (
              <li key={i} className="flex items-center gap-5 p-4">
                <span className="text-data hidden w-28 shrink-0 text-micro text-primary sm:block">{t.channel}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium leading-snug">{t.title}</span>
                  <span className="text-data mt-1 block text-micro text-muted-foreground">{t.author}</span>
                </span>
                <span className="text-data shrink-0 text-micro text-muted-foreground">{t.replies}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
