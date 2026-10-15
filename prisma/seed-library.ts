import type { PrismaClient, LibraryKind } from "@prisma/client";

/**
 * Starter library content. General revenue-cycle knowledge written for this seed, with synthetic
 * examples only. Seeded **in review**, never published: a reviewer must check each entry against
 * current sources and approve it before it appears on the public site.
 */

const SEED_AUTHOR = "seed";

type Entry = { kind: LibraryKind; slug: string; title: string; summary: string; body?: string; tags?: string[]; sources?: string[] };

const ENTRIES: Entry[] = [
  { kind: "GLOSSARY", slug: "accounts-receivable-ar", title: "Accounts receivable (AR)", summary: "Money owed to a provider for services already delivered, tracked by claim until it is paid, adjusted or written off.", tags: ["AR", "follow-up"] },
  { kind: "GLOSSARY", slug: "ar-aging", title: "AR aging", summary: "Outstanding balances grouped by how long they have been open (for example 0–30, 31–60, 61–90 and 90+ days), used to prioritise follow-up.", tags: ["AR", "reporting"] },
  { kind: "GLOSSARY", slug: "carc", title: "Claim Adjustment Reason Code (CARC)", summary: "A standard code on a remittance explaining why a claim or line was paid differently from what was billed.", tags: ["denials", "remittance"], sources: ["X12 code lists maintained by the X12 standards body (current edition)"] },
  { kind: "GLOSSARY", slug: "rarc", title: "Remittance Advice Remark Code (RARC)", summary: "A supplementary code that adds detail to a claim adjustment reason code on a remittance.", tags: ["denials", "remittance"], sources: ["X12 code lists maintained by the X12 standards body (current edition)"] },
  { kind: "GLOSSARY", slug: "clearinghouse", title: "Clearinghouse", summary: "An intermediary that checks claims for format and data errors and routes them electronically between providers and payers.", tags: ["claims"] },
  { kind: "GLOSSARY", slug: "eob", title: "Explanation of Benefits (EOB)", summary: "A statement from a health plan to the member explaining what was covered, paid and owed for a service.", tags: ["payments"] },
  { kind: "GLOSSARY", slug: "era", title: "Electronic Remittance Advice (ERA)", summary: "The electronic payment explanation a payer sends to a provider, used to post payments and adjustments.", tags: ["payments", "posting"] },
  { kind: "GLOSSARY", slug: "eligibility-verification", title: "Eligibility verification", summary: "Confirming before the visit that the patient's coverage is active and what it covers for the planned service.", tags: ["front end"] },
  { kind: "GLOSSARY", slug: "prior-authorization", title: "Prior authorization", summary: "Approval a payer requires before certain services are performed for them to be covered.", tags: ["front end", "denials"] },
  { kind: "GLOSSARY", slug: "timely-filing-limit", title: "Timely filing limit", summary: "The deadline a payer sets for receiving a claim after the date of service; claims received later can be denied.", body: "Each payer sets its own limit in its provider manual or contract, and corrected claims and appeals usually have their own deadlines. Track the limit per payer and keep proof of the original submission date.", tags: ["claims", "denials"] },
  { kind: "GLOSSARY", slug: "denial", title: "Denial", summary: "A payer's decision not to pay a claim or line, with reason codes explaining why.", tags: ["denials"] },
  { kind: "GLOSSARY", slug: "rejection", title: "Rejection", summary: "A claim returned before processing, usually by the clearinghouse or payer front end, because of format or data errors. It has not been adjudicated.", tags: ["claims"] },
  { kind: "GLOSSARY", slug: "underpayment", title: "Underpayment", summary: "A payment below the amount the provider's contract with the payer says is due for the service.", tags: ["payments"] },
  { kind: "GLOSSARY", slug: "credit-balance", title: "Credit balance", summary: "An account where more has been received than is owed, which may need a refund to the patient or payer.", tags: ["posting"] },
  { kind: "GLOSSARY", slug: "first-pass-resolution-rate", title: "First-pass resolution rate", summary: "The share of claims paid on first submission without rework; a common measure of claim quality.", tags: ["KPI"] },
  {
    kind: "PROCESS",
    slug: "claim-lifecycle",
    title: "The claim lifecycle, end to end",
    summary: "From registration to a zero balance: the stages a professional claim passes through and the most common failure at each.",
    body: "## Stages\n\n1. **Registration and eligibility.** Demographics and coverage are captured and checked. Common failure: inactive coverage discovered after the visit.\n2. **Charge capture and coding.** Services become billable codes. Common failure: missed or unsupported charges.\n3. **Claim creation and scrubbing.** The claim is built and checked against edits. Common failure: missing data the payer requires.\n4. **Submission and acknowledgement.** The clearinghouse accepts or rejects the file. Common failure: rejections nobody works.\n5. **Adjudication.** The payer pays, adjusts or denies.\n6. **Payment posting.** Remittances are posted and variances flagged.\n7. **Follow-up, denials and appeals.** Unpaid and denied claims are worked by priority.\n8. **Patient balance and closure.** Remaining patient responsibility is billed and the account is closed.\n\nEvery example in Academy lessons uses synthetic claims.",
    tags: ["claims", "foundation"],
  },
  {
    kind: "PROCESS",
    slug: "denial-management-workflow",
    title: "Denial management workflow",
    summary: "How a denial moves from remittance to resolution: categorise, find the root cause, fix, prevent.",
    body: "## Steps\n\n1. **Capture** the denial from the remittance with its reason codes.\n2. **Categorise** it (eligibility, authorization, coding, timely filing, duplicate, medical necessity and so on).\n3. **Decide** whether to correct and resubmit, appeal, or adjust, within the payer's deadline.\n4. **Track** outcomes by category and payer.\n5. **Prevent**: feed recurring causes back to the front end, coding or the claim edits.\n\nPrevention is where most of the value sits: a denial that never happens costs nothing to work.",
    tags: ["denials", "professional"],
  },
  {
    kind: "PROCESS",
    slug: "payment-posting",
    title: "Payment posting and variance review",
    summary: "Posting remittances accurately and flagging payments that do not match what was expected.",
    body: "## Steps\n\n1. Match each payment to the claim and line.\n2. Post payments, contractual adjustments and patient responsibility from the remittance.\n3. Compare the paid amount with the expected amount for the contract.\n4. Route variances (possible underpayments) and credit balances for review.\n5. Reconcile posted totals to the bank deposit.",
    tags: ["posting", "professional"],
  },
  {
    kind: "CASE_STUDY",
    slug: "authorization-denials-rise",
    title: "Synthetic case: authorization denials double in a quarter",
    summary: "A fictional cardiology group sees authorization denials rise after a payer changes its rules. How the team found the cause and what changed.",
    body: "*Synthetic scenario. The practice, payer and figures are invented.*\n\n## Situation\n\nAuthorization-related denials at a fictional 30-provider cardiology group rose from about 2% to 4% of claims over three months.\n\n## Analysis\n\n- Grouping denials by reason code and payer showed the rise came from one payer and two imaging procedures.\n- The payer had published a change to its authorization list; the scheduling checklist had not been updated.\n\n## Actions\n\n1. Update the scheduling checklist and train the front desk.\n2. Work the open denials within the appeal window.\n3. Add a weekly check of payer bulletins with a named owner.\n\n## Questions for you\n\nWhich metric would have caught this a month earlier, and who should own it?",
    tags: ["denials", "root cause"],
  },
  {
    kind: "TOOLKIT",
    slug: "kpi-definition-template",
    title: "KPI definition template",
    summary: "A one-page template for defining a revenue-cycle KPI so everyone measures it the same way.",
    body: "Write each KPI with these fields before reporting it:\n\n- **Name** and **purpose** (the decision it supports)\n- **Formula** (numerator and denominator)\n- **Population** and **exclusions**\n- **Data source** and **refresh frequency**\n- **Owner** (accountable) and **reviewer**\n- **Target** (only if agreed with the business, with the date it was set)\n- **Effective date** of this definition\n\nA metric without an agreed definition will be argued about instead of acted on.",
    tags: ["KPI", "leadership"],
  },
  {
    kind: "TOOLKIT",
    slug: "capacity-planning-basics",
    title: "Capacity planning basics",
    summary: "Estimating the staff a work queue needs from volume, handle time and available hours.",
    body: "A simple model:\n\n**Staff needed = (items per period × average handle time) ÷ productive hours per person per period**\n\nProductive hours exclude leave, training, meetings and system downtime. Test the model against what actually happened last month before using it for a decision.",
    tags: ["capacity", "leadership"],
  },
];

export async function seedLibrary(prisma: PrismaClient) {
  let created = 0;
  for (const e of ENTRIES) {
    const exists = await prisma.libraryEntry.findUnique({ where: { slug: e.slug } });
    if (exists) continue;
    await prisma.libraryEntry.create({
      data: { kind: e.kind, slug: e.slug, title: e.title, summary: e.summary, body: e.body ?? "", tags: e.tags ?? [], sources: e.sources ?? [], status: "IN_REVIEW", authorId: SEED_AUTHOR, submittedById: SEED_AUTHOR },
    });
    created++;
  }
  console.log(`  library entries: ${created} created (in review; approve them in Admin › Learning › Library)`);
}
