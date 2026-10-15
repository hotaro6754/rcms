import type { LibraryKind } from "@prisma/client";

/** Public library sections: URL segment → kind and copy. Client-safe (no server imports). */
export const SECTIONS: { path: string; kind: LibraryKind; title: string; lead: string }[] = [
  { path: "glossary", kind: "GLOSSARY", title: "Glossary", lead: "Revenue cycle terms in plain language, with the context a new analyst needs." },
  { path: "processes", kind: "PROCESS", title: "RCM process library", lead: "How each stage of the revenue cycle works, step by step, and where it usually breaks." },
  { path: "case-studies", kind: "CASE_STUDY", title: "Case studies", lead: "Synthetic, de-identified scenarios that show a problem, the analysis and the fix." },
  { path: "toolkit", kind: "TOOLKIT", title: "Leadership toolkit", lead: "Frameworks and templates for SLAs, KPIs, capacity and governance." },
  { path: "resources", kind: "RESOURCE", title: "Other resources", lead: "Checklists, references and links to authoritative sources." },
];

export const sectionByPath = (p: string) => SECTIONS.find((s) => s.path === p) ?? null;
export const sectionByKind = (k: LibraryKind) => SECTIONS.find((s) => s.kind === k)!;
