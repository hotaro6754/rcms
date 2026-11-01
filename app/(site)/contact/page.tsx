import { PageHeader, Section } from "@/components/site/PageHeader";
import { ContactForm } from "@/components/site/ContactForm";
import { whatsappUrl } from "@/lib/contact";
import { publicPricing } from "@/lib/services/learning/public-catalog";
import { getPageContent } from "@/lib/site/content";
import { contactPage } from "@/lib/site/pages/contact";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  const c = await getPageContent(contactPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/contact" });
}

export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const [{ interest }, pricing, c] = await Promise.all([searchParams, publicPricing().catch(() => null), getPageContent(contactPage)]);
  const options = {
    courses: (pricing?.courses ?? []).map((c) => ({ name: c.name, amount: c.amount })),
    mentoring: (pricing?.mentoring ?? []).map((m) => ({ name: m.name, amount: m.amount })),
  };
  const wa = whatsappUrl();
  return (
    <>
      <PageHeader
        eyebrow={c.header.eyebrow}
        title={c.header.title}
        lead={c.header.lead}
      />

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <ContactForm options={options} defaultInterest={interest?.slice(0, 120) ?? ""} copy={c.form} />

          <aside className="flex flex-col gap-4">
            {c.whatsapp.show && wa && (
              <div className="site-card p-6">
                <h2 className="text-[15px] font-semibold">{c.whatsapp.title}</h2>
                <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                  {c.whatsapp.body}
                </p>
                <a href={wa} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary">
                  {c.whatsapp.button}
                </a>
              </div>
            )}

            {c.corporate.show && (
              <div className="site-card p-6">
                <h2 className="text-[15px] font-semibold">{c.corporate.title}</h2>
                <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                  {c.corporate.body}
                </p>
              </div>
            )}

            {c.response.show && (
              <div className="site-card p-6">
                <h2 className="text-[15px] font-semibold">{c.response.title}</h2>
                <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                  {c.response.body}
                </p>
              </div>
            )}
          </aside>
        </div>
      </Section>
    </>
  );
}
