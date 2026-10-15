import { PageHeader, Section } from "@/components/site/PageHeader";
import { ContactForm } from "@/components/site/ContactForm";
import { whatsappUrl } from "@/lib/contact";
import { publicPricing } from "@/lib/services/learning/public-catalog";

export const metadata = {
  title: "Contact",
  description: "Enrol, request mentoring, or ask about a corporate account.",
};

export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ interest?: string }> }) {
  const [{ interest }, pricing] = await Promise.all([searchParams, publicPricing().catch(() => null)]);
  const options = {
    courses: (pricing?.courses ?? []).map((c) => ({ name: c.name, amount: c.amount })),
    mentoring: (pricing?.mentoring ?? []).map((m) => ({ name: m.name, amount: m.amount })),
  };
  const wa = whatsappUrl();
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Tell me what you are trying to move."
        lead="Enrolment, mentoring and corporate accounts all start the same way: what level you are at now, and what you want to be doing in twelve months."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <ContactForm options={options} defaultInterest={interest?.slice(0, 120) ?? ""} />

          <aside className="flex flex-col gap-4">
            {wa && (
              <div className="rounded-[var(--radius)] border border-border bg-card p-6">
                <h2 className="text-[15px] font-semibold">Faster on WhatsApp</h2>
                <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                  For a quick question about fit or level. Enrolment and invoices go through email. Never send patient information.
                </p>
                <a href={wa} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary">
                  Open WhatsApp
                </a>
              </div>
            )}

            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <h2 className="text-[15px] font-semibold">Corporate accounts</h2>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                Ten or more people get a corporate account with seats, groups and a manager view.
                Choose &ldquo;Corporate account&rdquo; and include headcount and specialty.
              </p>
            </div>

            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <h2 className="text-[15px] font-semibold">Response time</h2>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                Weekdays, within one working day, IST. Mentoring requests are confirmed by email
                with an agreed time.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
