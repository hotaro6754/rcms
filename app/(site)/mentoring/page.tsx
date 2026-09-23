import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { BookingPanel } from "@/components/site/BookingPanel";

export const metadata = {
  title: "Mentoring",
  description:
    "Working sessions on a real problem from your floor. You leave with a decision and a document, not advice.",
};

const FLOW = [
  ["01", "Choose the problem", "Career move, KPI defence, team escalation, client governance, or interview preparation for a specific role."],
  ["02", "Send the artefact", "Aging summary, denial trend, QA scorecard or the job description you are targeting. Reviewed before the call so no time goes on context."],
  ["03", "Pick a slot", "45 or 90 minutes, IST evenings and Saturday mornings to fit US-shift schedules."],
  ["04", "Leave with the document", "A root cause sheet, a capacity model, a governance deck outline or a rewritten CV, whichever the problem called for."],
];

const NOT_FOR = [
  "Generic career advice you could get from a search",
  "Reviewing your CV without a role you are targeting",
  "Anything requiring real patient data on the screen",
  "Coding certification preparation",
];

export default function MentoringPage() {
  return (
    <>
      <PageHeader
        eyebrow="Mentoring"
        title="Bring a real problem from your floor."
        lead="Sessions are working sessions. Bring your aging report, your QA dispute, your appraisal case or your client escalation. You leave with a decision and a document."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
          <div>
            <ol className="border-t border-border">
              {FLOW.map(([n, title, body]) => (
                <li key={n} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-border py-5">
                  <span className="text-data text-[13px] font-semibold text-primary">{n}</span>
                  <div>
                    <h2 className="text-[16px] font-semibold">{title}</h2>
                    <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 rounded-[var(--radius)] border border-border bg-card p-5">
              <h2 className="text-[14px] font-semibold">What this is not for</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {NOT_FOR.map((n) => (
                  <li key={n} className="text-micro leading-relaxed text-muted-foreground">
                    {n}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-border pt-3 text-micro leading-relaxed text-muted-foreground">
                Anonymise anything you send. No PHI, no real patient identifiers, no client
                documents you are not authorised to share.
              </p>
            </div>
          </div>

          <BookingPanel />
        </div>
      </Section>

      <Section tint>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.08]">
              Not sure a session is the right spend?
            </h2>
            <p className="mt-4 max-w-[56ch] text-[14px] leading-relaxed text-muted-foreground">
              Ask on WhatsApp first. If the answer takes two minutes, you will get it in two
              minutes and no session gets booked.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://wa.me/919999999999"
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Ask on WhatsApp
            </a>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              See all pricing
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
