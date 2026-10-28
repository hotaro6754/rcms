import type { CaseDefinitionInput } from "./definition";

/**
 * Seed cases and competencies. Synthetic throughout: Northwind Health Plan, its manual sections,
 * the providers, accounts and claim numbers are invented. Claim adjustment reason and group code
 * descriptions are paraphrased from the X12 code lists cited in each case's sources; a reviewer
 * must check them against the current lists before approving. Seeded cases are placed in review,
 * never published directly.
 */

const X12_CARC = "X12 Claim Adjustment Reason Codes, https://x12.org/codes/claim-adjustment-reason-codes (descriptions paraphrased; verify against the current list)";
const X12_GROUP = "X12 Claim Adjustment Group Codes (CO contractual obligation, PR patient responsibility, OA other adjustment, PI payer-initiated reduction), https://x12.org/codes/claim-adjustment-group-codes";
const FICTION = "Northwind Health Plan, its provider manual and every account, claim and provider in this case are fictional, created for training.";

export const SEED_COMPETENCIES = [
  {
    code: "DEN-ID",
    name: "Interpret a denial",
    description: "Read a remittance denial together with the claim history and evidence, and name the real problem.",
    expectedBehavior: "Reads the group code, CARC and RARC with the claim, timeline and payer records before deciding anything; separates what is known from what is missing.",
    proficiencyLevel: 2,
    criteria: ["issue", "evidence"],
    threshold: 75,
    reassessMonths: null,
  },
  {
    code: "DEN-RES",
    name: "Choose the resolution path",
    description: "Pick the action, rule and deadline that actually resolve a denial: correction, appeal, escalation, or no action.",
    expectedBehavior: "Chooses the route the payer's rules provide for this situation and works to the right deadline; does not default to appealing.",
    proficiencyLevel: 3,
    criteria: ["action", "policy", "deadline"],
    threshold: 75,
    reassessMonths: null,
  },
  {
    code: "DEN-ESC",
    name: "Escalate with judgement",
    description: "Know when a denial needs someone with more authority or clinical knowledge, and hand it over usefully.",
    expectedBehavior: "Escalates when the decision is outside billing's authority, says what the other person must decide, and does not escalate what can be resolved at their level.",
    proficiencyLevel: 3,
    criteria: ["escalation"],
    threshold: 75,
    reassessMonths: null,
  },
  {
    code: "DEN-DOC",
    name: "Document account work",
    description: "Leave account notes and reasoning another person can act on without asking.",
    expectedBehavior: "Notes state the denial, evidence relied on, action taken, cause and follow-up; the reasoning ties evidence to the decision.",
    proficiencyLevel: 2,
    criteria: ["documentation", "rationale"],
    threshold: 70,
    reassessMonths: null,
  },
  {
    code: "PRIV-MIN",
    name: "Minimum-necessary notes",
    description: "Keep identifiers that the task does not need out of notes and messages.",
    expectedBehavior: "Uses account and claim references; does not copy social security numbers, dates of birth, phone numbers or email addresses into working notes.",
    proficiencyLevel: 1,
    criteria: ["compliance"],
    threshold: 100,
    reassessMonths: 12,
  },
] as const;

const opt = (id: string, label: string, correct: boolean, explanation: string, risk = "") => ({ id, label, correct, explanation, risk });

export const SEED_CASES: { slug: string; definition: CaseDefinitionInput }[] = [
  {
    slug: "duplicate-denial-already-paid",
    definition: {
      title: "A duplicate denial on a claim that was already paid",
      summary: "An office visit was submitted twice after a status check came back empty. The second claim denied as a duplicate. Decide what, if anything, needs doing.",
      difficulty: 1,
      estimatedMinutes: 15,
      brief: "You own this account's denials. The denial work queue shows a $185.00 OA-18 denial on claim SYN-B-9034. Review the account, decide what the denial means and what to do, and leave a note the next person can act on. Today is 2026-08-14.",
      payer: { name: "Northwind Health Plan (fictional)", plan: "Northwind Choice PPO" },
      claim: {
        claimNumber: "SYN-B-9034",
        patientRef: "ACCT-SYN-55102",
        providerRef: "Lakeside Family Medicine (fictional)",
        dateOfService: "2026-07-08",
        submittedOn: "2026-07-29",
        billed: 18500,
        paid: 0,
        lines: [{ code: "99214", description: "Office or other outpatient visit, established patient, moderate complexity", units: 1, charge: 18500 }],
        diagnosis: ["E11.9 Type 2 diabetes mellitus without complications"],
      },
      denial: { groupCode: "OA", carc: "18", description: "Exact duplicate claim or service", deniedOn: "2026-08-12" },
      financial: { atRisk: 18500, priority: "LOW" },
      timeline: [
        { date: "2026-07-10", event: "Claim SYN-A-7781 submitted electronically for the 2026-07-08 visit; clearinghouse accepted it." },
        { date: "2026-07-24", event: "Claim status inquiry to Northwind returned no record found." },
        { date: "2026-07-29", event: "Biller resubmitted the visit as a new claim, SYN-B-9034." },
        { date: "2026-08-06", event: "Remittance received for SYN-A-7781." },
        { date: "2026-08-12", event: "Remittance received for SYN-B-9034: denied OA-18." },
      ],
      evidence: [
        { id: "remit-original", kind: "REMIT", title: "Remittance 2026-08-06, claim SYN-A-7781", date: "2026-08-06", relevant: true, body: "Claim SYN-A-7781 · DOS 2026-07-08 · 99214 × 1\nBilled 185.00 · Allowed 152.40 · Paid 132.40\nAdjustments: CO-45 32.60 (charge exceeds fee schedule); PR-3 20.00 (copayment)\nPayment: EFT SYN-EFT-44120" },
        { id: "remit-duplicate", kind: "REMIT", title: "Remittance 2026-08-12, claim SYN-B-9034", date: "2026-08-12", relevant: true, body: "Claim SYN-B-9034 · DOS 2026-07-08 · 99214 × 1\nBilled 185.00 · Allowed 0.00 · Paid 0.00\nAdjustments: OA-18 185.00 (exact duplicate claim/service)" },
        { id: "portal-status", kind: "PORTAL", title: "Northwind portal claim status", date: "2026-08-14", relevant: true, body: "SYN-A-7781 — Finalized, paid 2026-08-06, EFT SYN-EFT-44120, 132.40.\nSYN-B-9034 — Finalized, denied 2026-08-12, duplicate of SYN-A-7781." },
        { id: "note-resubmit", kind: "NOTE", title: "Account note 2026-07-29", date: "2026-07-29", relevant: true, body: "Status check says no record found for 7/8 visit. Resubmitted as new claim. — billing" },
        { id: "policy-duplicates", kind: "POLICY", title: "Northwind provider manual §7.3 Duplicate claims (fictional)", relevant: true, body: "Allow 30 days from submission for a claim to appear in status inquiries. Do not resubmit a claim while the original is in process. Duplicate submissions are denied and are not appealable. To change a processed claim, submit a corrected claim (frequency code 7)." },
        { id: "policy-appeals", kind: "POLICY", title: "Northwind provider manual §9.2 Appeals (fictional)", relevant: false, body: "Level 1 appeals must be received within 180 days of the denial date and include the records that support the service as billed." },
        { id: "visit-note", kind: "DOCUMENT", title: "Visit note excerpt, 2026-07-08", relevant: false, body: "Established patient, follow-up of type 2 diabetes. A1c reviewed, medication adjusted, return in 3 months. Synthetic excerpt." },
      ],
      issueOptions: [
        opt("duplicate-paid", "A second submission of a visit the payer has already paid", true, "The portal and both remittances show SYN-A-7781 paid on 2026-08-06; SYN-B-9034 is the same service submitted again on 2026-07-29."),
        opt("never-processed", "The payer lost the original claim and denied the replacement in error", false, "The portal shows the original was finalized and paid. The 'no record found' result came 14 days after submission, inside the 30 days the manual allows."),
        opt("coding", "The E/M level was coded incorrectly", false, "Nothing in the remittance questions the code; the original paid at the 99214 fee schedule."),
        opt("auth", "A required authorization was missing", false, "An office visit under this plan needs no authorization, and the denial code is about duplication."),
      ],
      missingInfoOptions: [
        opt("posted", "Whether the 2026-08-06 payment has been posted to the account", true, "If it is not posted, the account still shows a balance and the duplicate looks like lost money."),
        opt("card", "An updated copy of the patient's insurance card", false, "Coverage is not in question; the payer paid the original."),
        opt("records", "A copy of the visit note to send to the payer", false, "Nothing needs to go to the payer."),
      ],
      policyOptions: [
        opt("p-73", "Manual §7.3: duplicate denials are not appealable; change a processed claim only with a corrected claim", true, "This governs duplicates and explains why the resubmission should not have happened."),
        opt("p-92", "Manual §9.2: appeal within 180 days with supporting records", false, "Appeals do not apply to duplicate denials under §7.3."),
      ],
      actionOptions: [
        opt("close", "Confirm the original payment is posted, record the duplicate denial as needing no action, and close it", true, "The OA-18 line carries nothing that is owed: the service was settled on SYN-A-7781."),
        opt("appeal", "Appeal the duplicate denial", false, "There is nothing to appeal; §7.3 says duplicate denials are not appealable.", "Uses a payer touch and staff time on money that was already paid, and the appeal will be returned."),
        opt("resubmit", "Resubmit the visit again as a new claim", false, "A third submission is another duplicate.", "Creates another duplicate denial and a pattern of duplicate billing on the provider's record with the payer."),
        opt("write-off", "Write off the $185.00 as a duplicate-denial adjustment", false, "The original remittance already settled the charge with payment, copay and contractual adjustment.", "Double-counts the adjustment and understates collected revenue on the account."),
        opt("bill-patient", "Transfer the $185.00 to the patient", false, "The patient owes only the $20.00 copayment the original remittance assigned to them.", "Bills the patient for an amount the payer settled: a billing error the patient will dispute, and a complaint risk."),
      ],
      escalation: { required: false, explanation: "This is resolved within the account owner's authority. Escalate only if the original payment cannot be found on the account." },
      documentation: {
        minLength: 80,
        elements: [
          { label: "the duplicate claim and its denial code", terms: ["oa-18", "oa 18", "duplicate", "carc 18"] },
          { label: "the original claim and that it was paid", terms: ["syn-a-7781", "7781", "original claim"] },
          { label: "what you did and that no further action is needed", terms: ["no further action", "no action", "closed", "close"] },
          { label: "why it happened, to prevent a repeat", terms: ["status", "resubmi", "no record"] },
        ],
      },
      rationale: {
        minLength: 60,
        elements: [
          { label: "the original remittance or portal status", terms: ["remit", "portal", "08-06", "paid", "eft"] },
          { label: "why an appeal or resubmission would be wrong", terms: ["appeal", "resubmi", "7.3", "not appealable"] },
        ],
      },
      expected: {
        decision: "SYN-B-9034 is an exact duplicate of SYN-A-7781, which Northwind paid on 2026-08-06 ($132.40 paid, $20.00 copayment assigned to the patient, $32.60 contractual adjustment). The OA-18 line carries nothing that is owed. Confirm the payment is posted, note the duplicate as needing no action and close it. Do not appeal, resubmit, write off or move the balance.",
        howToCorrect: "Before acting on any denial, read the account's whole claim history for that date of service. When a status inquiry returns no record soon after submission, wait the payer's stated processing time or call before resubmitting.",
      },
      rubric: {
        weights: { issue: 2, evidence: 2, policy: 1, deadline: 0, action: 3, escalation: 1, documentation: 2, compliance: 1, rationale: 2 },
        passMark: 70,
        revealAfterAttempts: 2,
        maxAttempts: 3,
        criticalErrors: [
          { id: "ce-resubmit", label: "Submitting the same service again after a duplicate denial", explanation: "Each resubmission creates another duplicate and builds a duplicate-billing pattern with the payer.", trigger: { type: "action", optionId: "resubmit" } },
          { id: "ce-patient", label: "Moving a balance the payer settled to the patient", explanation: "The patient owes what the remittance assigns to them (here the copayment), not the denied duplicate charge.", trigger: { type: "action", optionId: "bill-patient" } },
          { id: "ce-identifiers", label: "Copying identifiers into notes that the task does not need", explanation: "Working notes should carry account and claim references, not social security numbers, dates of birth or contact details.", trigger: { type: "identifier_in_notes" } },
        ],
      },
      competencyCodes: ["DEN-ID", "DEN-RES", "DEN-ESC", "DEN-DOC", "PRIV-MIN"],
      sources: [X12_CARC, X12_GROUP, FICTION],
    },
  },
  {
    slug: "authorization-on-file-not-on-claim",
    definition: {
      title: "Authorization denied, but the authorization exists",
      summary: "An MRI was denied for missing authorization. The portal shows an approved authorization. Work out the right route and the deadline.",
      difficulty: 2,
      estimatedMinutes: 20,
      brief: "You own denials for an imaging center. Claim SYN-31877 for an MRI denied CO-197 for $2,450.00. Investigate, choose what to do and by when, and document it. Today is 2026-07-01.",
      payer: { name: "Northwind Health Plan (fictional)", plan: "Northwind Select HMO" },
      claim: {
        claimNumber: "SYN-31877",
        patientRef: "ACCT-SYN-60417",
        providerRef: "Riverbend Imaging Center (fictional)",
        dateOfService: "2026-06-02",
        submittedOn: "2026-06-05",
        billed: 245000,
        paid: 0,
        lines: [{ code: "70553", description: "MRI brain without contrast, followed by contrast and further sequences", units: 1, charge: 245000 }],
        diagnosis: ["R51.9 Headache, unspecified"],
      },
      denial: { groupCode: "CO", carc: "197", description: "Precertification, authorization, notification or pre-treatment absent", deniedOn: "2026-06-20" },
      financial: { atRisk: 245000, priority: "HIGH" },
      timeline: [
        { date: "2026-05-20", event: "Referral received from the ordering physician." },
        { date: "2026-05-22", event: "Authorization requested through the Northwind portal." },
        { date: "2026-05-23", event: "Authorization AUTH-SYN-88213 approved." },
        { date: "2026-06-02", event: "MRI performed." },
        { date: "2026-06-05", event: "Claim SYN-31877 submitted." },
        { date: "2026-06-20", event: "Remittance: denied CO-197." },
      ],
      evidence: [
        { id: "remit", kind: "REMIT", title: "Remittance 2026-06-20, claim SYN-31877", date: "2026-06-20", relevant: true, body: "Claim SYN-31877 · DOS 2026-06-02 · 70553 × 1\nBilled 2,450.00 · Paid 0.00\nAdjustments: CO-197 2,450.00" },
        { id: "portal-auth", kind: "PORTAL", title: "Northwind portal: authorization AUTH-SYN-88213", date: "2026-05-23", relevant: true, body: "Status: Approved\nService: 70553 × 1 unit\nValid: 2026-05-23 to 2026-07-22\nServicing provider: Riverbend Imaging Center\nOrdering provider: on file" },
        { id: "claim-copy", kind: "CLAIM", title: "Submitted claim data, SYN-31877", date: "2026-06-05", relevant: true, body: "Loop 2300 REF*G1 (prior authorization number): blank\nFrequency code: 1 (original)\nAll other fields complete." },
        { id: "policy-corrected", kind: "POLICY", title: "Northwind provider manual §5.1 Authorization denials (fictional)", relevant: true, body: "When a claim denies because an authorization is absent and a valid authorization covered the service, code and date, submit a corrected claim (frequency code 7, with the original claim number) carrying the authorization number within 90 days of the denial date. Appeals are for disputing an authorization decision or medical necessity." },
        { id: "policy-appeals", kind: "POLICY", title: "Northwind provider manual §9.2 Appeals (fictional)", relevant: false, body: "Level 1 appeals must be received within 180 days of the denial date and include the records that support the service as billed." },
        { id: "front-desk", kind: "NOTE", title: "Front desk note 2026-06-02", date: "2026-06-02", relevant: false, body: "Patient checked in. Copay collected per plan. No issues." },
      ],
      issueOptions: [
        opt("auth-not-reported", "An authorization was obtained but not reported on the claim", true, "The portal shows AUTH-SYN-88213 approved for 70553 on this date; the claim's authorization field was blank."),
        opt("no-auth", "No authorization was obtained before the service", false, "The portal shows an approval dated 2026-05-23, ten days before the MRI."),
        opt("necessity", "The payer judged the MRI not medically necessary", false, "That would be a different code (for example CARC 50); CARC 197 is about the authorization."),
        opt("eligibility", "The patient's coverage had ended", false, "Nothing in the remittance or portal suggests a coverage problem."),
      ],
      missingInfoOptions: [
        opt("nothing", "Nothing further: the authorization covers the code, units and date of service", true, "Code 70553 × 1, valid 2026-05-23 to 2026-07-22, servicing provider matches."),
        opt("retro", "A retroactive authorization from the payer", false, "Not needed: the authorization was obtained in advance."),
        opt("lmn", "A letter of medical necessity from the ordering physician", false, "Necessity is not in dispute."),
      ],
      policyOptions: [
        opt("p-51", "Manual §5.1: corrected claim with the authorization number within 90 days of the denial", true, "This is the route the manual provides when a valid authorization existed."),
        opt("p-92", "Manual §9.2: level 1 appeal within 180 days", false, "§5.1 reserves appeals for disputing an authorization decision; nothing is disputed here."),
      ],
      deadline: {
        question: "By when must the correction reach Northwind?",
        options: [
          opt("d-0918", "2026-09-18 (90 days after the 2026-06-20 denial)", true, "§5.1 counts 90 days from the denial date."),
          opt("d-0831", "2026-08-31 (90 days after the date of service)", false, "§5.1 counts from the denial, not the service."),
          opt("d-1217", "2026-12-17 (180 days after the denial)", false, "That is the appeal window in §9.2, which does not apply."),
          opt("d-0722", "2026-07-22 (when the authorization expires)", false, "The authorization's end date limits when the service could be performed, not when the claim can be corrected."),
        ],
      },
      actionOptions: [
        opt("corrected", "Submit a corrected claim (frequency code 7) with AUTH-SYN-88213", true, "Fixes the actual defect by the route §5.1 provides."),
        opt("appeal", "Send a level 1 appeal with the authorization approval attached", false, "The manual reserves appeals for disputes.", "The payer may return it as the wrong route while the 90-day correction window keeps running."),
        opt("new-claim", "Submit a new original claim with the authorization number", false, "The original was processed; a new original claim duplicates it.", "Likely to deny as a duplicate (CARC 18), adding a second denial and delay."),
        opt("write-off", "Write off the $2,450.00 as an authorization denial", false, "The provider did everything right before the service; only the claim was incomplete.", "Gives away revenue the provider is owed and hides a front-end process gap."),
        opt("bill-patient", "Bill the patient, since authorization was their responsibility", false, "CO means the payer holds the provider responsible; the provider obtained the authorization anyway.", "Bills the patient for a contractual adjustment, which the network contract does not allow."),
      ],
      escalation: { required: false, explanation: "The correction is within the account owner's authority. Escalation is not needed unless the correction also denies." },
      documentation: {
        minLength: 100,
        elements: [
          { label: "the denial code", terms: ["197"] },
          { label: "the authorization number", terms: ["88213"] },
          { label: "the action taken", terms: ["corrected claim", "frequency 7", "freq 7", "code 7"] },
          { label: "the deadline or follow-up date", terms: ["09-18", "9/18", "sep 18", "18 sep", "september 18", "follow up", "follow-up"] },
          { label: "the cause", terms: ["blank", "missing from the claim", "not on the claim", "not reported", "left off", "omitted"] },
        ],
      },
      rationale: {
        minLength: 60,
        elements: [
          { label: "that the authorization covers this service and date", terms: ["valid", "approved", "covers", "covered"] },
          { label: "the rule that sets the route", terms: ["5.1", "manual", "corrected claim"] },
        ],
      },
      expected: {
        decision: "Northwind approved AUTH-SYN-88213 for 70553 × 1, valid 2026-05-23 to 2026-07-22, before the 2026-06-02 MRI. The claim went out with the authorization field blank. Under manual §5.1, submit a corrected claim (frequency code 7, referencing SYN-31877) with the authorization number by 2026-09-18, and set a follow-up to check it.",
        howToCorrect: "Compare the denial against the authorization record before choosing a route. Use the route the payer's manual gives for that situation and count its deadline from the date the manual names. Raise the blank-field cause with the charge entry team so it does not repeat.",
      },
      rubric: {
        weights: { issue: 2, evidence: 2, policy: 2, deadline: 2, action: 3, escalation: 1, documentation: 2, compliance: 1, rationale: 2 },
        passMark: 75,
        revealAfterAttempts: 2,
        maxAttempts: 3,
        criticalErrors: [
          { id: "ce-writeoff", label: "Writing off a recoverable balance", explanation: "A valid authorization existed; the balance is recoverable by correcting the claim.", trigger: { type: "action", optionId: "write-off" } },
          { id: "ce-patient", label: "Billing the patient for a contractual (CO) adjustment", explanation: "Group code CO assigns the amount to the provider under the contract; it cannot be moved to the patient.", trigger: { type: "action", optionId: "bill-patient" } },
          { id: "ce-deadline", label: "Working to the wrong filing deadline", explanation: "A correction filed after the deadline the rule sets is lost for good.", trigger: { type: "deadline_wrong" } },
          { id: "ce-identifiers", label: "Copying identifiers into notes that the task does not need", explanation: "Working notes should carry account and claim references, not social security numbers, dates of birth or contact details.", trigger: { type: "identifier_in_notes" } },
        ],
      },
      competencyCodes: ["DEN-ID", "DEN-RES", "DEN-ESC", "DEN-DOC", "PRIV-MIN"],
      sources: [X12_CARC, X12_GROUP, FICTION],
    },
  },
  {
    slug: "medical-necessity-plan-of-care-lapsed",
    definition: {
      title: "A medical necessity denial that billing cannot fix alone",
      summary: "Therapeutic exercise units denied as not medically necessary. The note points to a plan of care that seems to have lapsed. Decide what billing can and cannot do.",
      difficulty: 3,
      estimatedMinutes: 25,
      brief: "You work denials for a physical therapy practice. Claim SYN-40962 had its therapeutic exercise line denied CO-50 for $640.00 while manual therapy paid. Investigate, decide the next step, and document it. Today is 2026-06-10.",
      payer: { name: "Northwind Health Plan (fictional)", plan: "Northwind Choice PPO" },
      claim: {
        claimNumber: "SYN-40962",
        patientRef: "ACCT-SYN-71230",
        providerRef: "Harbor Physical Therapy (fictional)",
        dateOfService: "2026-05-12",
        submittedOn: "2026-05-14",
        billed: 86000,
        paid: 15400,
        lines: [
          { code: "97110", description: "Therapeutic exercise, each 15 minutes", units: 4, charge: 64000 },
          { code: "97140", description: "Manual therapy techniques, each 15 minutes", units: 2, charge: 22000 },
        ],
        diagnosis: ["M54.50 Low back pain, unspecified"],
      },
      denial: { groupCode: "CO", carc: "50", description: "Non-covered because the payer does not deem the service a medical necessity", deniedOn: "2026-06-03" },
      financial: { atRisk: 64000, priority: "MEDIUM" },
      timeline: [
        { date: "2026-03-01", event: "Initial evaluation; plan of care signed, certified for 60 days." },
        { date: "2026-05-12", event: "Treatment visit: therapeutic exercise and manual therapy." },
        { date: "2026-05-14", event: "Claim SYN-40962 submitted." },
        { date: "2026-06-03", event: "Remittance: 97140 paid; 97110 denied CO-50." },
      ],
      evidence: [
        { id: "remit", kind: "REMIT", title: "Remittance 2026-06-03, claim SYN-40962", date: "2026-06-03", relevant: true, body: "97110 × 4 · Billed 640.00 · Paid 0.00 · CO-50 640.00\n97140 × 2 · Billed 220.00 · Allowed 174.00 · Paid 154.00 · CO-45 46.00 · PR-3 20.00" },
        { id: "poc", kind: "DOCUMENT", title: "Plan of care, signed 2026-03-01", date: "2026-03-01", relevant: true, body: "Certification period: 2026-03-01 to 2026-04-29 (60 days).\nGoals: improve lumbar flexion to functional range; sit 60 minutes without pain; return to lifting 10 kg at work.\nSynthetic excerpt." },
        { id: "visit", kind: "DOCUMENT", title: "Treatment note 2026-05-12", date: "2026-05-12", relevant: true, body: "Therapeutic exercise 60 min: core stabilisation, lumbar flexion progressions. Manual therapy 30 min. Goals: see plan of care. Patient tolerating well.\nSynthetic excerpt." },
        { id: "policy-therapy", kind: "POLICY", title: "Northwind provider manual §6.4 Outpatient therapy (fictional)", relevant: true, body: "Therapy is covered when delivered under a current plan of care signed by the treating therapist, with measurable functional goals, and when the treatment note relates the services to those goals. Services outside a current plan of care are denied as not medically necessary." },
        { id: "policy-appeals", kind: "POLICY", title: "Northwind provider manual §9.2 Appeals (fictional)", relevant: false, body: "Level 1 appeals must be received within 180 days of the denial date and include the records that support the service as billed." },
        { id: "chart-search", kind: "NOTE", title: "Billing note 2026-06-09", date: "2026-06-09", relevant: true, body: "Looked in the scanned chart for a recertification after 4/29. Did not find one. Clinical staff may have it in the therapy system. — billing" },
      ],
      issueOptions: [
        opt("poc-lapsed", "The treatment fell outside a current plan of care, so the record does not show coverage criteria were met", true, "The plan of care's certification ended 2026-04-29; the 2026-05-12 visit relies on it and no recertification has been found."),
        opt("coding", "97110 was the wrong code for therapeutic exercise", false, "97110 is the therapeutic exercise code; the denial is about necessity, not coding."),
        opt("duplicate", "The line duplicated an earlier claim", false, "That would be CARC 18; this is CARC 50."),
        opt("eligibility", "The patient was not covered on the date of service", false, "97140 on the same claim was paid."),
      ],
      missingInfoOptions: [
        opt("recert", "Whether a recertified plan of care covering 2026-05-12 exists", true, "If it exists in the therapy system, the appeal has support; if not, it does not."),
        opt("goals", "Whether the treatment note relates the exercises to measurable functional goals", true, "§6.4 requires the note to tie services to goals; 'see plan of care' may not be enough."),
        opt("employer", "The patient's employer details", false, "Not relevant to a medical necessity decision."),
        opt("referral", "A new referral from the primary care physician", false, "The plan is a PPO and the denial is not about referral."),
      ],
      policyOptions: [
        opt("p-64", "Manual §6.4: therapy is covered under a current, signed plan of care with measurable goals", true, "This is the coverage rule the denial applies."),
        opt("p-51", "Manual §5.1: corrected claim for a missing authorization", false, "No authorization is involved."),
        opt("p-73", "Manual §7.3: duplicate claims", false, "Not a duplicate."),
      ],
      deadline: {
        question: "If the documentation supports the service, by when must the appeal reach Northwind?",
        options: [
          opt("d-1130", "2026-11-30 (180 days after the 2026-06-03 denial)", true, "§9.2 counts 180 days from the denial date."),
          opt("d-1108", "2026-11-08 (180 days after the date of service)", false, "§9.2 counts from the denial, not the service."),
          opt("d-0901", "2026-09-01 (90 days after the denial)", false, "Ninety days is the §5.1 correction window, which does not apply."),
        ],
      },
      actionOptions: [
        opt("clinical-review", "Route to the therapy clinical lead to confirm whether a current plan of care and goal-linked documentation exist; hold the appeal decision until they answer", true, "Only clinical staff can establish what was documented and certified; the answer decides whether an appeal is supported."),
        opt("appeal-now", "Appeal now with the treatment note as it stands", false, "The note relies on a plan of care whose certification ended.", "Likely to be upheld, using an appeal level without new support."),
        opt("amend-note", "Ask the therapist to add functional goals to the 2026-05-12 note so the appeal succeeds", false, "Changing a record after a denial to win payment is not billing's call and can misrepresent what happened.", "Altering clinical records to support payment is a serious compliance problem. Any late entry is the clinician's decision, must be dated as late, and must reflect what actually happened."),
        opt("write-off", "Write off the 97110 units as not medically necessary", false, "Premature: nobody has checked the therapy system for a recertification.", "May give away revenue the provider is owed if a current plan of care exists."),
        opt("bill-patient", "Bill the patient for the denied units", false, "CO-50 assigns liability to the provider under the contract.", "Bills the patient for a contractual adjustment without any waiver on file."),
      ],
      escalation: { required: true, explanation: "Whether care was delivered under a current plan of care is a clinical documentation question. Billing cannot create or change clinical records, so the decision needs the therapy clinical lead." },
      documentation: {
        minLength: 120,
        elements: [
          { label: "the denial code and line", terms: ["co-50", "co 50", "carc 50", "97110"] },
          { label: "the plan of care finding", terms: ["plan of care", "poc", "recert"] },
          { label: "who it was routed to", terms: ["clinical lead", "therapy lead", "clinical review", "therapist"] },
          { label: "the appeal deadline", terms: ["11-30", "11/30", "nov 30", "30 nov", "november 30", "180 days"] },
          { label: "the follow-up", terms: ["follow up", "follow-up", "recheck", "check back"] },
        ],
      },
      rationale: {
        minLength: 80,
        elements: [
          { label: "the lapsed certification", terms: ["04-29", "4/29", "lapsed", "expired", "ended", "recert"] },
          { label: "why billing cannot resolve it alone", terms: ["clinical", "documentation", "cannot", "can't", "alter", "amend"] },
        ],
      },
      expected: {
        decision: "The 97110 units were denied under the coverage rule in manual §6.4. The plan of care's certification ended on 2026-04-29, and no recertification has been found for the 2026-05-12 visit. Billing cannot establish or create clinical documentation. Route the account to the therapy clinical lead to confirm whether a current plan of care and goal-linked documentation exist, and note the appeal deadline of 2026-11-30. Appeal only if the records support it; never ask for a note to be changed to win payment.",
        howToCorrect: "When a denial turns on what the clinical record shows, find out what exists before choosing a route, and involve the people who own the record. Track plan-of-care end dates so recertification happens before the period lapses.",
      },
      rubric: {
        weights: { issue: 2, evidence: 2, policy: 1, deadline: 1, action: 3, escalation: 3, documentation: 2, compliance: 1, rationale: 2 },
        passMark: 75,
        revealAfterAttempts: 2,
        maxAttempts: 3,
        criticalErrors: [
          { id: "ce-amend", label: "Asking for a clinical record to be changed to support payment", explanation: "Records must reflect what happened when it happened. A request from billing to add content after a denial is a compliance risk regardless of intent.", trigger: { type: "action", optionId: "amend-note" } },
          { id: "ce-patient", label: "Billing the patient for a contractual (CO) adjustment", explanation: "Group code CO assigns the amount to the provider under the contract; it cannot be moved to the patient without a valid waiver.", trigger: { type: "action", optionId: "bill-patient" } },
          { id: "ce-escalation", label: "Resolving a documentation-dependent denial without clinical input", explanation: "Whether care met coverage criteria depends on clinical documentation that billing does not own.", trigger: { type: "escalation_missed" } },
          { id: "ce-identifiers", label: "Copying identifiers into notes that the task does not need", explanation: "Working notes should carry account and claim references, not social security numbers, dates of birth or contact details.", trigger: { type: "identifier_in_notes" } },
        ],
      },
      competencyCodes: ["DEN-ID", "DEN-RES", "DEN-ESC", "DEN-DOC", "PRIV-MIN"],
      sources: [X12_CARC, X12_GROUP, FICTION],
    },
  },
];

/** A valid starting point for a new case: every field present, every value obviously a placeholder. */
export function starterDefinition(title: string): CaseDefinitionInput {
  return {
    ...structuredClone(SEED_CASES[0].definition),
    title,
    summary: "Replace this summary: one or two sentences on what the learner will investigate.",
    competencyCodes: [],
  };
}
