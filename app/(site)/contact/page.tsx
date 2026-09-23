import { PageHeader, Section } from "@/components/site/PageHeader";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Enrol, book mentoring, or ask about a corporate cohort.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Tell me what you are trying to move."
        lead="Enrolment, mentoring and corporate cohorts all start the same way: what level you are at now, and what you want to be doing in twelve months."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <ContactForm />

          <aside className="flex flex-col gap-4">
            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <h2 className="text-[15px] font-semibold">Faster on WhatsApp</h2>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                For a quick question about fit or level, WhatsApp gets an answer the same day.
                Enrolment and invoices go through email.
              </p>
              <a
                href="https://wa.me/919999999999"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Open WhatsApp
              </a>
            </div>

            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <h2 className="text-[15px] font-semibold">Corporate cohorts</h2>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                Ten or more people, run against your own denial mix and aging report. Scoped per
                engagement. Choose &ldquo;Corporate cohort&rdquo; and include headcount and
                specialty.
              </p>
            </div>

            <div className="rounded-[var(--radius)] border border-border bg-card p-6">
              <h2 className="text-[15px] font-semibold">Response time</h2>
              <p className="mt-2 text-micro leading-relaxed text-muted-foreground">
                Weekdays, within one working day, IST. Mentoring bookings are confirmed on
                WhatsApp once the slot is held.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
