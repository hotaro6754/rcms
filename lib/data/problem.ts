/**
 * The opening statement's six lines: what RCM is instead of "one process". Each noun
 * carries one plain fact about the work, so the sequence teaches as it builds.
 * General descriptions of the field only; no figures.
 */
export interface ProblemLine {
  lead: string;
  noun: string;
  fact: string;
}

export const PROBLEM_LINES: ProblemLine[] = [
  {
    lead: "It's a",
    noun: "chain.",
    fact: "Registration, eligibility, authorization, charge capture, coding, submission, remittance, posting, follow-up, recovery. Each link depends on the one before it.",
  },
  {
    lead: "A",
    noun: "system.",
    fact: "Providers, payers, clearinghouses and practice-management software, each with its own rules for the same claim.",
  },
  {
    lead: "A set of",
    noun: "decisions.",
    fact: "Every field on a claim was decided by someone: a code, a modifier, a date, whether to appeal or to write off.",
  },
  {
    lead: "A set of",
    noun: "people.",
    fact: "Front desk, coders, billers, AR callers, posters, leads and managers. A claim passes through many hands before it is paid.",
  },
  {
    lead: "A set of",
    noun: "rules.",
    fact: "CPT and ICD-10 code sets, payer policies, CMS guidance, timely-filing limits. They change, and the work has to change with them.",
  },
  {
    lead: "A set of",
    noun: "financial outcomes.",
    fact: "In the end every claim is money collected, money delayed or money lost, and someone has to explain which.",
  },
];
