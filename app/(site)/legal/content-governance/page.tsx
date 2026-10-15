import { LegalPage } from "@/components/site/LegalPage";

export const metadata = { title: "Content review and governance" };

export default function ContentGovernancePage() {
  return (
    <LegalPage
      eyebrow="Policy"
      title="Content review and governance"
      lead="How course and library content is written, checked, released and kept current."
      updated="15 October 2026"
      clauses={[
        { h: "Synthetic data only", p: [
          "Every example, scenario, case study and assessment uses synthetic or de-identified data. No real patient, provider, payer, claim or client record is used.",
          "Authoring tools refuse text that looks like a card number, a US Social Security number, a Medicare Beneficiary Identifier, a date of birth or a long account number. That check is automatic and pattern-based, so authors and reviewers remain responsible for keeping real data out.",
        ]},
        { h: "Who reviews what", p: [
          "Courses pass an academic review (is it accurate and well taught?) and, where marked compliance-sensitive, a separate compliance review (does it describe regulation and payer rules correctly and carry the right disclaimers?).",
          "The academic reviewer cannot be the person who submitted the course, and the compliance reviewer cannot be the academic approver. Library entries (glossary, processes, case studies, toolkit) are approved by a reviewer other than the person who submitted them.",
        ]},
        { h: "What learners see", p: [
          "Learners and visitors only ever see an approved, released version. Edits made afterwards stay private until they pass review again, and every release is kept so a learner's assessment and certificate record the version they completed.",
        ]},
        { h: "Dates and sources", p: [
          "Courses carry an effective date and a next-review date; compliance-sensitive lessons carry their own last and next review dates and the sources they rely on. A compliance-sensitive course cannot be released while one of its lessons is past its review date.",
          "Library entries show when they were last reviewed and list their sources.",
        ]},
        { h: "Approval is not a compliance guarantee", p: [
          "Review reduces the chance of error; it does not make content a substitute for payer policy, CMS guidance, coding authority publications or legal advice. Where they disagree with this material, they win.",
          "The Academy does not claim that its content or platform is HIPAA-compliant, accredited or certified by any body.",
        ]},
        { h: "Reporting an error", p: [
          "If something is wrong or out of date, tell us through the contact form or a support case. Corrections go through the same review before they are released, and the change is recorded in the content history.",
        ]},
      ]}
    />
  );
}
