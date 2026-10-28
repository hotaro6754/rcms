/**
 * Automated screening for data that must never enter the Academy: payment card numbers,
 * US Social Security numbers, Medicare Beneficiary Identifiers and similar identifiers.
 *
 * Blueprint §12 asks for "automated file and text screening where practical". This is that,
 * and no more: pattern screening catches careless pastes, not a determined person, so the
 * "do not submit PHI" warnings stay in place everywhere text is entered.
 *
 * `findings` reports what was found; `mask` replaces it. Content authoring refuses text with
 * hard findings; support chat masks before storage.
 */

export type FindingKind = "card" | "ssn" | "mbi" | "long_number" | "email_dob";

export interface Finding {
  kind: FindingKind;
  label: string;
  hard: boolean;
}

function luhn(digits: string) {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const CARD = /\b(?:\d[ -]?){12,18}\d\b/g;
const SSN = /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g;
// MBI: 11 characters, positions fixed by CMS; excludes S, L, O, I, B, Z.
const MBI = /\b[1-9][AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d-?[AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d-?[AC-HJKMNP-RT-Y]{2}\d{2}\b/g;
const LONG_NUMBER = /\b\d{9,}\b/g;
const DOB = /\b(?:dob|date of birth)\b[:\s]*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi;

function cardMatches(text: string) {
  return [...text.matchAll(CARD)].map((m) => m[0]).filter((m) => {
    const digits = m.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhn(digits);
  });
}

export function findings(text: string): Finding[] {
  if (!text) return [];
  const out: Finding[] = [];
  if (cardMatches(text).length) out.push({ kind: "card", label: "a payment card number", hard: true });
  if (SSN.test(text)) out.push({ kind: "ssn", label: "a Social Security number", hard: true });
  SSN.lastIndex = 0;
  if (MBI.test(text)) out.push({ kind: "mbi", label: "a Medicare Beneficiary Identifier", hard: true });
  MBI.lastIndex = 0;
  if (DOB.test(text)) out.push({ kind: "email_dob", label: "a date of birth", hard: true });
  DOB.lastIndex = 0;
  if (LONG_NUMBER.test(text)) out.push({ kind: "long_number", label: "a long account or member number", hard: false });
  LONG_NUMBER.lastIndex = 0;
  return out;
}

/** Replace anything screened with a placeholder. Returns whether anything changed. */
export function mask(text: string): { text: string; masked: boolean } {
  let out = text;
  for (const c of cardMatches(out)) out = out.replace(c, "[card number removed]");
  out = out
    .replace(SSN, "[SSN removed]")
    .replace(MBI, "[identifier removed]")
    .replace(DOB, "[date of birth removed]")
    .replace(LONG_NUMBER, "[number removed]");
  return { text: out, masked: out !== text };
}

/** For authoring: a sentence explaining why content was refused, or null if it is clean. */
export function refusalFor(text: string): string | null {
  const hard = findings(text).filter((f) => f.hard);
  if (!hard.length) return null;
  return `This looks like it contains ${hard.map((f) => f.label).join(" and ")}. Course content must use synthetic, de-identified examples only. Remove it before saving.`;
}
