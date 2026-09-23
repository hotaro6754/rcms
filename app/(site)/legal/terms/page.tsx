import { LegalPage } from "@/components/site/LegalPage";

export const metadata = { title: "Terms and conditions" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms and conditions"
      lead="What you are buying, what you may do with it, and the limits on both sides."
      updated="6 September 2026"
      clauses={[
        { h: "What you are buying", p: [
          "A licence to access a named program's material for your own professional development, or a booked block of one-to-one mentoring time.",
          "Access to a program is for the life of that program on this platform. If a program is retired, existing purchasers keep access to the retired material or are moved to its replacement, whichever is more useful to them.",
        ]},
        { h: "Accounts", p: [
          "One account per person. Sharing credentials, or reselling or redistributing material, ends access without refund.",
          "You are responsible for activity under your account. Tell us promptly if you believe it has been used by someone else.",
        ]},
        { h: "Acceptable use", p: [
          "Material may be used in your own work. It may not be repackaged, resold, or delivered as training by you or your employer without a corporate licence.",
          "Community channels are moderated. Posts containing protected health information, client documents, or abuse are removed and may end access.",
        ]},
        { h: "Mentoring", p: [
          "Sessions are guidance based on experience. They are not legal, compliance, coding-certification or employment advice, and they do not create any professional or fiduciary relationship.",
          "Sessions may be rescheduled by either side with at least 24 hours' notice. See the refund policy for what happens with less.",
        ]},
        { h: "Corporate engagements", p: [
          "Corporate cohorts run under a separate written scope covering headcount, duration, data handling and licence extent. These terms apply to anything the scope does not cover.",
        ]},
        { h: "Intellectual property", p: [
          "Frameworks, curricula, SOP templates, benchmark libraries and simulation scenarios remain the property of the academy. Your licence is to use them, not to own them.",
          "Work you produce during a program — your capacity model, your review deck — is yours.",
        ]},
        { h: "Limitation of liability", p: [
          "Training is educational. No outcome is guaranteed: not a promotion, a job, a salary, a certification result, or any operational or financial result at your employer.",
          "Liability in any claim is limited to the amount you paid for the program or session the claim concerns.",
        ]},
        { h: "Governing law", p: [
          "These terms are governed by the laws of India, and disputes fall to the courts of the founder's registered jurisdiction.",
        ]},
      ]}
    />
  );
}
