/**
 * Keyword retrieval for the assistant: BM25 over short passages, with a small synonym table for
 * revenue-cycle abbreviations. Pure and deterministic. The corpus is small (released lessons,
 * approved library entries, help articles), so an in-process index is enough; a vector database
 * would add infrastructure without a measured need.
 */

export interface Passage {
  /** Stable id within one search, e.g. "lesson:<id>:2". */
  id: string;
  kind: "lesson" | "library" | "help" | "course";
  title: string;
  /** Where it sits, e.g. "Course › Module". */
  context?: string;
  href: string;
  text: string;
}

export interface Hit {
  passage: Passage;
  score: number;
}

const STOP = new Set(
  "a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so that the their them then there these this to was we what when where which who why will with you your".split(" "),
);

/** Abbreviations and their expansions; a query using either finds both. */
const SYNONYMS: [string, string][] = [
  ["eob", "explanation of benefits"],
  ["era", "electronic remittance advice"],
  ["carc", "claim adjustment reason code"],
  ["rarc", "remittance advice remark code"],
  ["ar", "accounts receivable"],
  ["auth", "authorization"],
  ["prior auth", "prior authorization"],
  ["cob", "coordination of benefits"],
  ["poc", "plan of care"],
  ["dos", "date of service"],
  ["npi", "national provider identifier"],
  ["cpt", "procedure code"],
  ["icd", "diagnosis code"],
  ["rcm", "revenue cycle"],
  ["cert", "certificate"],
  ["login", "sign in"],
];

function stem(w: string) {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);
}

export function expandQuery(q: string): string[] {
  const lower = ` ${q.toLowerCase()} `;
  const extra: string[] = [];
  for (const [abbr, full] of SYNONYMS) {
    if (lower.includes(` ${abbr} `) || lower.includes(` ${abbr}?`) || lower.includes(` ${abbr},`)) extra.push(full);
    if (lower.includes(full)) extra.push(abbr);
  }
  return [...new Set([...tokenize(q), ...tokenize(extra.join(" "))])];
}

export function search(passages: Passage[], query: string, k = 5): Hit[] {
  const terms = expandQuery(query);
  if (!terms.length || !passages.length) return [];
  const docs = passages.map((p) => tokenize(`${p.title} ${p.title} ${p.text}`));
  const avg = docs.reduce((n, d) => n + d.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const N = docs.length;
  const k1 = 1.2;
  const b = 0.75;
  const hits: Hit[] = [];
  docs.forEach((d, i) => {
    const tf = new Map<string, number>();
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1);
    let score = 0;
    let matched = 0;
    for (const t of terms) {
      const f = tf.get(t);
      if (!f) continue;
      matched++;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.length) / avg)));
    }
    // Reward covering more of the question, not repeating one word.
    if (score > 0) hits.push({ passage: passages[i], score: score * (0.5 + matched / terms.length / 2) });
  });
  return hits.sort((a, b2) => b2.score - a.score).slice(0, k);
}

/** Below this, the best passage is too weak to call an answer. Tuned on the tests in tests/unit/assistant.test.ts. */
export const MIN_SCORE = 1.5;

/** The sentence or two of a passage that best match the query, for showing as an excerpt. */
export function excerpt(raw: string, query: string, max = 320) {
  // Plain text only: drop markdown emphasis, heading marks and link syntax.
  const text = raw.replace(/\*\*|__|`/g, "").replace(/^#+\s*/gm, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const terms = new Set(expandQuery(query));
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  if (!sentences.length) return text.slice(0, max);
  const scored = sentences.map((s, i) => ({ s, i, n: tokenize(s).filter((t) => terms.has(t)).length }));
  const best = scored.reduce((a, c) => (c.n > a.n ? c : a), scored[0]);
  let out = best.s;
  const next = sentences[best.i + 1];
  if (next && out.length + next.length < max) out += ` ${next}`;
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

/** Split long text into passages of roughly `size` characters on paragraph boundaries. */
export function chunk(text: string, size = 900): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (cur && cur.length + p.length > size) {
      out.push(cur);
      cur = "";
    }
    cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}
