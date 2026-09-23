import { LegalPage } from "@/components/site/LegalPage";

export const metadata = { title: "Disclaimer" };

export default function DisclaimerPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Disclaimer"
      lead="What this training is, what it is not, and where the authoritative source actually sits."
      updated="6 September 2026"
      clauses={[
        { h: "Educational purpose", p: [
          "All programs, articles, templates, simulations and mentoring sessions are provided for professional education.",
          "They do not replace payer policy, CMS guidance, HIPAA obligations, coding authority publications, legal or compliance advice, or your employer's own procedures. Where this material and any of those disagree, those win.",
        ]},
        { h: "Data in the console and simulations", p: [
          "Every figure in the operations console and the Governance Room is illustrative teaching data. The client, the pods, the analysts, the claim volumes and the financial impacts are invented.",
          "The situations they describe are drawn from the shape of real revenue cycle operations. The numbers are not from any real engagement, and no real patient, provider or payer data is used anywhere on this site.",
        ]},
        { h: "Benchmarks", p: [
          "Benchmark references, including HFMA MAP Keys, are cited for teaching purposes. This academy is not affiliated with, endorsed by, or certified by HFMA or any other standards body.",
          "Benchmarks move. Verify against the current published source before using one in a client conversation.",
        ]},
        { h: "No outcome guarantee", p: [
          "No program guarantees employment, promotion, salary change, interview success or certification result.",
          "What the programs provide is structure, practice and feedback. What you do with them at your employer is outside anyone's control here.",
        ]},
        { h: "Not certification", p: [
          "These programs are not a coding certification and are not accredited by AAPC, AHIMA or any similar body. Where a certification is required for a role, obtain it from the certifying organisation.",
        ]},
        { h: "External links", p: [
          "Links to payer bulletins, standards bodies and third-party tools are provided for convenience. Their content and availability are not controlled here.",
        ]},
      ]}
    />
  );
}
