import { LegalPage } from "@/components/site/LegalPage";

export const metadata = { title: "Refund policy" };

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund policy"
      lead="Short version: seven days on programs if you have barely started, 24 hours on mentoring, and no argument about it."
      updated="6 September 2026"
      clauses={[
        { h: "Programs", p: [
          "Full refund within seven days of purchase, provided less than 20 percent of the program has been accessed. Access is measured by modules opened, not time elapsed.",
          "Past seven days, or past 20 percent, no refund. The material is available immediately on purchase, which is why the window is short and the threshold is low.",
        ]},
        { h: "Tracks and bundles", p: [
          "A track refunds under the same seven-day and 20-percent test, measured across the track as a whole.",
          "If you keep one program from a track and refund the rest, the retained program is charged at its individual price and the difference is returned.",
        ]},
        { h: "Mentoring", p: [
          "Full refund if cancelled more than 24 hours before the session.",
          "Inside 24 hours, the session can be rescheduled once at no cost. A second late cancellation forfeits the fee, because the slot cannot be resold at that notice.",
          "If a session is cancelled from this side for any reason, it is refunded in full or rescheduled at your choice.",
        ]},
        { h: "Corporate engagements", p: [
          "Governed by the signed scope, not by this page. Cancellation terms, milestones and any deposit treatment are set out there.",
        ]},
        { h: "How to request one", p: [
          "Email from the address on the account, naming the program or session. No form, no retention call, no explanation required.",
          "Approved refunds are returned to the original payment method within seven to ten working days, depending on the processor and your bank.",
        ]},
        { h: "Exceptions", p: [
          "Refunds are not issued where access has been shared, material has been redistributed, or the community code of conduct has been breached.",
        ]},
      ]}
    />
  );
}
