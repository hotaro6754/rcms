/**
 * The product's name and how it is written. Change it here; everything user-facing (site,
 * emails, certificates, invoices, sign-in, metadata) reads from this file. Copy that the website
 * editor manages (navigation, footer, page text) has these as its defaults.
 */
export const BRAND = {
  /** The name as written in text, titles and emails. */
  name: "RCMExcel",
  /** The wordmark: the first part set in monospace capitals, the second in the serif. */
  markShort: "RCM",
  markRest: "Excel",
  /** Capitals for small labels (certificates, footers of documents). */
  caps: "RCMEXCEL",
  /** One line on what it is, for search results and link previews. */
  tagline: "US healthcare revenue cycle training and mentoring, from first claim to operations leadership",
  /** Prefix of certificate serials issued from now on (earlier RCMS- serials still verify). */
  serialPrefix: "RCMX",
} as const;
