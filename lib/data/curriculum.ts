/**
 * Lesson content for the Foundation program.
 *
 * Real curriculum rather than placeholder rows: Phase 2 is only a genuine test of the
 * player, progress and enrolment if there is something worth reading in it. The remaining
 * four programs get authored in Trainer Studio (Phase 3) rather than hard-coded here.
 *
 * Keyed by module title so it joins to what the seed already creates from LEVELS.
 */

export interface LessonSeed {
  title: string;
  body: string;
  minutes: number;
  resources?: { title: string; kind: string }[];
}

export const FOUNDATION_LESSONS: Record<string, LessonSeed[]> = {
  "Introduction to US healthcare": [
    {
      title: "Who pays, and why that is the whole question",
      minutes: 12,
      body: "In most countries one payer covers most people. The United States has thousands: commercial insurers, two large government programmes, employers who self-fund, and the patient. Every downstream process in the revenue cycle exists because the answer to \"who pays for this encounter\" is genuinely uncertain until someone checks.\n\nStart with the four parties on every claim: the patient who receives care, the provider who delivers it, the payer who is contracted to fund it, and the clearinghouse that moves the message between provider and payer. Most confusion in this industry comes from collapsing the last two.",
      resources: [{ title: "Payer landscape one-pager", kind: "application/pdf" }],
    },
    {
      title: "Provider types and why the setting changes the money",
      minutes: 10,
      body: "The same procedure pays differently depending on where it happens. A cardiology consult in a physician office, in a hospital outpatient department, and in an ambulatory surgery centre produce three different claim shapes and three different reimbursements.\n\nYou do not need to memorise the rates. You need to know that place of service is a field that changes the money, so a place-of-service error is a revenue error and not a clerical one.",
    },
    {
      title: "The vocabulary you will hear on day one",
      minutes: 8,
      body: "Encounter, charge, claim, remittance, adjustment, write-off, allowed amount, patient responsibility. These are not synonyms and people will use them as if they were.\n\nAllowed amount is what the payer agreed to pay for a service under the contract. Adjustment is the difference between what was billed and what was allowed. A write-off is an adjustment you have decided not to pursue. Confusing the last two is how AR inventory silently disappears.",
    },
  ],

  "Insurance fundamentals: commercial, Medicare, Medicaid, TPA": [
    {
      title: "Commercial plans and the contract behind them",
      minutes: 14,
      body: "A commercial payer pays according to a negotiated fee schedule, not a list price. The charge on the claim is almost never what arrives. What matters operationally is whether the payment matches the contracted rate, which is why underpayment detection exists as a discipline.\n\nIf you take one thing from this module: the fee schedule is the source of truth, and a payment that looks reasonable can still be wrong.",
      resources: [{ title: "Contract terms glossary", kind: "application/pdf" }],
    },
    {
      title: "Medicare: parts, and what each one means for a claim",
      minutes: 15,
      body: "Part A covers inpatient facility. Part B covers professional and outpatient. Part C is Medicare Advantage, administered by a commercial payer under Medicare rules, which is why it behaves like commercial in your worklist. Part D is drugs.\n\nThe operational consequence: a Medicare Advantage denial follows the commercial payer's appeal process and timeline, not traditional Medicare's. Teams that route it as Medicare lose the appeal window.",
    },
    {
      title: "Medicaid and the state-by-state problem",
      minutes: 11,
      body: "Medicaid is federal money administered by states, so rules, timely filing limits and prior-authorisation requirements differ by state and often by managed care plan within a state.\n\nThere is no shortcut here. What separates a good analyst from an average one is knowing which state rules they work under and where to look them up, not remembering all fifty.",
    },
    {
      title: "TPAs, and why the card lies",
      minutes: 9,
      body: "A third-party administrator processes claims for a self-funded employer. The card may carry a familiar insurer logo because that insurer rents its network, but the money is the employer's and the rules are the plan document's.\n\nPractically: verify eligibility against the administrator, not the logo.",
    },
  ],

  "The revenue cycle end to end": [
    {
      title: "The lifecycle, stage by stage",
      minutes: 16,
      body: "Scheduling, registration, eligibility, authorisation, encounter, coding, charge entry, claim submission, clearinghouse scrubbing, payer adjudication, remittance, posting, denial or underpayment work, patient balance, and finally cash.\n\nEvery metric you will ever be measured on attaches to one of those stages. Days in A/R is the whole pipe. First-pass resolution is submission through posting. Denial rate is adjudication. Knowing which stage a number belongs to is how you diagnose rather than guess.",
      resources: [{ title: "Lifecycle map, printable", kind: "application/pdf" }],
    },
    {
      title: "Front end, middle, back end: who owns what",
      minutes: 12,
      body: "Front end is everything before the encounter: registration, eligibility, authorisation. Middle is coding and charge capture. Back end is submission through cash.\n\nThe uncomfortable truth of this industry is that most back-end work is caused by front-end failure. An eligibility error surfaces six weeks later as a denial that an AR analyst then spends twenty minutes on. When you get to level three you will spend your time pushing work forward, not clearing it faster.",
    },
  ],

  "Medical terminology for RCM": [
    {
      title: "Only the terminology that changes a claim",
      minutes: 13,
      body: "You are not learning clinical language to practise medicine. You are learning enough to tell whether a diagnosis supports a procedure, because that relationship is what medical necessity denials turn on.\n\nRoot, prefix, suffix. Cardi-, -ology, -itis, -ectomy, -ostomy, -oscopy. Enough to read a chart note and know what happened.",
    },
    {
      title: "Anatomy that shows up in denials",
      minutes: 10,
      body: "Laterality, approach and body system are the three that appear in denial reasons most often. Left versus right is a modifier problem that reads as a clinical one, and it is one of the easiest denials to prevent and one of the most common to see.",
    },
  ],

  "Patient registration and demographics": [
    {
      title: "The fields that cause denials",
      minutes: 11,
      body: "Name exactly as on the card, date of birth, member identifier, group number, subscriber relationship, and address. A transposed digit in the member ID is not a typo, it is a rejection.\n\nCO-16, missing or invalid information, is overwhelmingly a registration failure. It has one of the highest overturn rates of any denial category, which tells you it is not a clinical disagreement. It is rework you paid for twice.",
      resources: [{ title: "Registration QA checklist", kind: "application/pdf" }],
    },
    {
      title: "Coordination of benefits",
      minutes: 12,
      body: "When a patient has two plans, one is primary and one is secondary, and the order is determined by rules rather than preference. Bill the wrong one first and the claim denies for COB.\n\nThe birthday rule, employment status and Medicare secondary payer rules cover most cases. Ask at registration, because asking after the denial costs four weeks.",
    },
  ],

  "Eligibility and benefits": [
    {
      title: "Running an eligibility check and reading the answer",
      minutes: 14,
      body: "A 270 goes out asking whether this member is covered for this service on this date; a 271 comes back. The response carries active coverage, plan type, copay, deductible remaining, coinsurance and often authorisation requirements.\n\nA check that only confirms \"active\" is half a check. The financial fields are the ones that determine what you collect at the desk and what you chase for six months.",
    },
    {
      title: "Prior authorisation, and the cost of missing one",
      minutes: 13,
      body: "Some services require the payer's agreement before they happen. No authorisation, no payment, and in most contracts you cannot bill the patient for it either, which makes it a pure write-off.\n\nAuthorisation requirements change by payer bulletin, sometimes mid-year. A team with no owner for reading those bulletins will eventually be surprised by a denial spike. That failure mode is the whole subject of the Governance Room.",
      resources: [{ title: "Authorisation tracker template", kind: "text/csv" }],
    },
  ],

  "Charge entry and claim submission": [
    {
      title: "From encounter to charge",
      minutes: 12,
      body: "Coding turns the clinical record into CPT, HCPCS and ICD-10-CM codes. Charge entry attaches those codes, the units, the modifiers, the rendering provider and the place of service to a billable line.\n\nEvery field here is a denial waiting to happen if it is wrong, and every one is cheap to fix before submission and expensive after.",
    },
    {
      title: "The 837, the clearinghouse and the scrub",
      minutes: 13,
      body: "The 837 is the electronic claim. It goes to a clearinghouse, which validates format and payer-specific rules and either forwards it or rejects it back to you.\n\nLearn the difference between a rejection and a denial and never confuse them again. A rejection never reached adjudication: the payer has not seen it, there is no appeal, you fix it and resend. A denial was adjudicated and refused: there is an appeal, and there is a clock.",
      resources: [{ title: "Rejection versus denial, one page", kind: "application/pdf" }],
    },
  ],

  "Reading an EOB and an ERA": [
    {
      title: "Reading an EOB line by line",
      minutes: 14,
      body: "Billed, allowed, paid, adjustment, patient responsibility. Work across the line and make the arithmetic close.\n\nBilled minus allowed is the contractual adjustment. Allowed minus paid is patient responsibility, split into deductible, copay and coinsurance. If those do not reconcile, either the claim was processed against the wrong contract or you are reading the wrong plan.",
      resources: [{ title: "Worked EOB, annotated", kind: "application/pdf" }],
    },
    {
      title: "The 835 and what posting really is",
      minutes: 12,
      body: "The 835 is the electronic remittance. Posting is not data entry; it is the point at which you find out whether you were paid correctly.\n\nThis is where CARC and RARC codes arrive: CARC says why the amount changed, RARC adds detail. CO-45 means the charge exceeded the fee schedule, which is contractual and not appealable. CO-50 means not deemed medically necessary, which usually is. Telling those two apart is the difference between recovering money and wasting a week.",
      resources: [{ title: "CARC and RARC quick reference", kind: "application/pdf" }],
    },
  ],
};
