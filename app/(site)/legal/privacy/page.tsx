import { LegalPage } from "@/components/site/LegalPage";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      lead="What is collected, why, how long it is kept, and what you can ask to have removed."
      updated="6 September 2026"
      clauses={[
        { h: "What is collected", p: [
          "Account details you provide: name, email address, phone number where you supply one, and the role and experience level you enter when enrolling or booking mentoring.",
          "Payment records held by the payment processor. Card and bank details are never stored on this site and never pass through it in a readable form.",
          "Usage data: which pages and programs were opened, and for how long. This is used to see which material is working and which is not.",
        ]},
        { h: "What is never collected", p: [
          "Protected health information. Do not send patient names, member identifiers, dates of birth, account numbers or claim numbers from live systems, in a form, an email, a mentoring attachment or a community post.",
          "Client documents you are not authorised to share. Anonymise anything operational before it leaves your employer's building.",
          "Anything submitted in breach of the above is deleted on discovery and the sender is told.",
        ]},
        { h: "Why it is collected", p: [
          "To give you access to what you purchased, to raise an invoice, to run a mentoring session usefully, and to answer questions you send.",
          "Aggregate usage informs curriculum changes. It is never sold, rented or shared with advertisers.",
        ]},
        { h: "Payments", p: [
          "Payments are processed by a third-party gateway. That processor receives the payment details directly and is responsible for their handling under its own terms. This site receives only the confirmation, the amount and the last four digits of the instrument.",
        ]},
        { h: "Cookies", p: [
          "A session cookie keeps you signed in. Analytics cookies, where enabled, record page views and are set only after consent.",
          "Declining non-essential cookies does not restrict access to anything you have paid for.",
        ]},
        { h: "How long data is kept", p: [
          "Account and purchase records are retained for as long as the account exists and for the period required by Indian tax and accounting rules after it closes.",
          "Mentoring notes and any artefact you send are deleted within 90 days of the session unless you ask for them to be retained.",
        ]},
        { h: "Your rights", p: [
          "You can ask for a copy of what is held about you, ask for corrections, or ask for deletion. Deletion removes account access; purchase records required for tax compliance are retained.",
          "Requests go to the contact address on the contact page and are answered within 30 days.",
        ]},
        { h: "Changes", p: [
          "Material changes to this policy are notified by email to registered accounts before they take effect.",
        ]},
      ]}
    />
  );
}
