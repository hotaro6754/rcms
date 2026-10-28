import { COMPONENTS, type ComponentType, type Design, type DesignNode } from "../schema";

/**
 * Turns a document's outline (headings, paragraphs, lists, tables, images, in reading order)
 * into a lesson design, using layout rules rather than AI, so nothing leaves the server:
 *
 *   - each top-level heading starts a section with its own heading
 *   - a numbered list of 3 to 8 short steps becomes a process diagram
 *   - a bulleted list of "Term: definition" lines becomes flip cards
 *   - three or more short sub-sections become an accordion
 *   - "Summary", "Key points", "Takeaways" sections become a highlighted callout
 *   - "FAQ" sections whose paragraphs are questions and answers become an accordion
 *   - a two-column table with numbers also gets a bar chart above it
 *   - "Note:", "Tip:", "Warning:", "Important:" paragraphs become callouts
 *   - a short section with one image is laid out as text beside the image
 *   - images stay where they were in the document
 *
 * The result is a starting point: it opens in the designer for the author to adjust.
 */

export type OutlineBlock =
  | { t: "heading"; level: number; text: string }
  | { t: "para"; text: string }
  | { t: "list"; ordered: boolean; items: string[] }
  | { t: "table"; rows: string[][] }
  | { t: "image"; mediaId: string; alt: string };

let seq = 0;
function node(type: ComponentType, props: Record<string, unknown>, slots: Record<string, DesignNode[]> = {}): DesignNode {
  const base = COMPONENTS[type].parse(props) as Record<string, unknown>;
  return { type, props: { ...base, ...slots, id: `${type}-import-${++seq}` } };
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const TERM = /^\s*(\*\*)?([^:–—-]{2,60}?)(\*\*)?\s*[:–—-]\s+(.{3,})$/;
const NUMBER = /^-?[\d,.]+\s*%?$/;
const CALLOUT = /^(note|tip|warning|caution|important|remember|key point)s?\s*[:\-–]\s*/i;
const SUMMARY = /^(summary|key (points|takeaways|ideas)|takeaways|in summary|conclusion|recap)\b/i;
const FAQ = /^(faq|faqs|frequently asked questions|questions and answers|q\s*&\s*a)\b/i;

type Section = { title: string; level: number; body: OutlineBlock[] };

function sections(blocks: OutlineBlock[]): { title: string | null; intro: OutlineBlock[]; sections: Section[] } {
  const levels = [...new Set(blocks.filter((b) => b.t === "heading").map((b) => (b as { level: number }).level))].sort((a, b) => a - b);
  let title: string | null = null;
  let rest = blocks;
  // The document's title: a single top-level heading at the start, above other headings.
  const first = blocks[0];
  if (first?.t === "heading" && levels.length > 1 && blocks.filter((b) => b.t === "heading" && b.level === first.level).length === 1) {
    title = first.text;
    rest = blocks.slice(1);
  }
  const restLevels = [...new Set(rest.filter((b) => b.t === "heading").map((b) => (b as { level: number }).level))].sort((a, b) => a - b);
  const top = restLevels[0];
  const intro: OutlineBlock[] = [];
  const out: Section[] = [];
  for (const b of rest) {
    if (b.t === "heading" && b.level === top) out.push({ title: b.text, level: b.level, body: [] });
    else if (out.length) out[out.length - 1].body.push(b);
    else intro.push(b);
  }
  return { title, intro, sections: out };
}

/** Markdown text for a run of outline blocks (used inside accordions, tabs and callouts). */
function markdown(blocks: OutlineBlock[]): string {
  return blocks
    .map((b) => {
      if (b.t === "para") return b.text;
      if (b.t === "heading") return `### ${b.text}`;
      if (b.t === "list") return b.items.map((it, i) => (b.ordered ? `${i + 1}. ${it}` : `- ${it}`)).join("\n");
      if (b.t === "table") return b.rows.map((r) => `- ${r.join(" — ")}`).join("\n");
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function listNodes(b: Extract<OutlineBlock, { t: "list" }>): DesignNode[] {
  const items = b.items.map((s) => s.trim()).filter(Boolean);
  const terms = items.map((s) => TERM.exec(s));
  if (!b.ordered && items.length >= 3 && terms.filter(Boolean).length >= Math.ceil(items.length * 0.6)) {
    return [
      node("FlipCards", {
        columns: items.length % 3 === 0 ? "3" : items.length % 2 === 0 ? "2" : "3",
        items: items.map((s, i) => {
          const m = terms[i];
          return m ? { front: clip(m[2].trim(), 200), back: clip(m[4].trim(), 1000) } : { front: clip(s, 200), back: "" };
        }),
      }),
    ];
  }
  if (b.ordered && items.length >= 3 && items.length <= 8 && items.every((s) => s.length <= 300)) {
    return [
      node("Process", {
        steps: items.map((s) => {
          const m = TERM.exec(s);
          return m ? { title: clip(m[2].trim(), 160), body: clip(m[4].trim(), 1500) } : { title: clip(s.split(/(?<=[.!?])\s/)[0], 160), body: s.includes(". ") ? clip(s.slice(s.split(/(?<=[.!?])\s/)[0].length).trim(), 1500) : "" };
        }),
      }),
    ];
  }
  // Short lists of labelled numbers ("Clean claim rate: 92%") read better as key numbers.
  const stats = items.map((s) => /^(.{2,80}?)\s*[:–—-]\s*([$₹€£]?\s?[\d,.]+\s*(%|x|days?|hrs?|hours?)?)\s*$/i.exec(s));
  if (items.length >= 2 && items.length <= 8 && stats.every(Boolean)) {
    return [node("Stats", { columns: items.length === 4 ? "4" : items.length === 2 ? "2" : "3", items: stats.map((m) => ({ value: clip(m![2].trim(), 40), label: clip(m![1].trim(), 120), note: "" })) })];
  }
  return [node("List", { marker: b.ordered ? "number" : "bullet", items: items.slice(0, 60).map((text) => ({ text: clip(text, 1000) })) })];
}

function tableNodes(b: Extract<OutlineBlock, { t: "table" }>): DesignNode[] {
  const rows = b.rows.filter((r) => r.some((c) => c.trim()));
  if (!rows.length) return [];
  const [head, ...body] = rows;
  const out: DesignNode[] = [];
  if (head.length === 2 && body.length >= 3 && body.length <= 24 && body.every((r) => NUMBER.test((r[1] ?? "").replace(/[$₹€£\s]/g, "")))) {
    out.push(
      node("BarChart", {
        title: head.join(" by "),
        unit: body.some((r) => r[1].includes("%")) ? "%" : "",
        items: body.map((r) => ({ label: clip(r[0], 80), value: Number(r[1].replace(/[^\d.-]/g, "")) || 0 })),
      }),
    );
  }
  out.push(node("Table", { header: head.map((c) => c.replace(/\|/g, "/")).join(" | "), rows: body.slice(0, 80).map((r) => ({ cells: r.map((c) => c.replace(/\|/g, "/")).join(" | ") })) }));
  return out;
}

/** Content of one section (or the introduction), with sub-sections grouped when that helps. */
function bodyNodes(body: OutlineBlock[]): DesignNode[] {
  const subLevels = body.filter((b) => b.t === "heading").map((b) => (b as { level: number }).level);
  const sub = subLevels.length ? Math.min(...subLevels) : null;
  if (sub !== null) {
    const groups: { title: string; blocks: OutlineBlock[] }[] = [];
    const lead: OutlineBlock[] = [];
    for (const b of body) {
      if (b.t === "heading" && b.level === sub) groups.push({ title: b.text, blocks: [] });
      else if (groups.length) groups[groups.length - 1].blocks.push(b);
      else lead.push(b);
    }
    const short = groups.every((g) => markdown(g.blocks).length <= 1500 && !g.blocks.some((b) => b.t === "image" || b.t === "table"));
    if (groups.length >= 3 && short) {
      return [...flat(lead), node("Accordion", { items: groups.slice(0, 40).map((g) => ({ title: clip(g.title, 200), body: clip(markdown(g.blocks), 4000) })) })];
    }
    return [...flat(lead), ...groups.flatMap((g) => [node("Heading", { text: clip(g.title, 300), level: "3" }), ...flat(g.blocks)])];
  }
  return flat(body);
}

function flat(blocks: OutlineBlock[]): DesignNode[] {
  const out: DesignNode[] = [];
  let paras: string[] = [];
  const flush = () => {
    if (paras.length) out.push(node("Text", { text: clip(paras.join("\n\n"), 20_000) }));
    paras = [];
  };
  for (const b of blocks) {
    if (b.t === "para") {
      const m = CALLOUT.exec(b.text);
      if (m) {
        flush();
        const word = m[1].toLowerCase();
        out.push(node("Callout", { tone: /warning|caution|important/.test(word) ? "warning" : word === "tip" ? "tip" : "info", title: m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), text: clip(b.text.slice(m[0].length), 4000) }));
      } else paras.push(b.text);
      continue;
    }
    flush();
    if (b.t === "heading") out.push(node("Heading", { text: clip(b.text, 300), level: b.level <= 2 ? "3" : "4" }));
    else if (b.t === "list") out.push(...listNodes(b));
    else if (b.t === "table") out.push(...tableNodes(b));
    else if (b.t === "image") out.push(node("Image", { mediaId: b.mediaId, alt: clip(b.alt, 300), width: 80, align: "center" }));
  }
  flush();
  return out;
}

function sectionNode(s: Section, index: number): DesignNode {
  const heading = node("Heading", { text: clip(s.title, 300), level: "2" });
  if (SUMMARY.test(s.title)) {
    return node("Section", { width: "normal" }, { content: [heading, node("Callout", { tone: "tip", title: "Key points", text: clip(markdown(s.body), 4000) })] });
  }
  if (FAQ.test(s.title)) {
    const qa: { title: string; body: string }[] = [];
    for (const b of s.body) {
      const text = b.t === "para" ? b.text : b.t === "heading" ? b.text : null;
      if (text && /\?\s*$/.test(text)) qa.push({ title: clip(text, 200), body: "" });
      else if (qa.length) qa[qa.length - 1].body = clip([qa[qa.length - 1].body, markdown([b])].filter(Boolean).join("\n\n"), 4000);
    }
    if (qa.length >= 2) return node("Section", { width: "normal" }, { content: [heading, node("Accordion", { items: qa })] });
  }
  const images = s.body.filter((b) => b.t === "image");
  const text = s.body.filter((b) => b.t !== "image");
  // A short section with one picture: text beside the image, alternating sides.
  if (images.length === 1 && text.every((b) => b.t === "para" || b.t === "list") && markdown(text).length <= 1600 && text.length) {
    const img = images[0] as Extract<OutlineBlock, { t: "image" }>;
    const textCol = flat(text);
    const imgCol = [node("Image", { mediaId: img.mediaId, alt: clip(img.alt, 300), width: 100 })];
    return node("Section", { width: "normal" }, { content: [heading, node("Columns", { columns: "2", align: "center", gap: 32 }, index % 2 ? { col1: imgCol, col2: textCol, col3: [], col4: [] } : { col1: textCol, col2: imgCol, col3: [], col4: [] })] });
  }
  return node("Section", { width: "normal" }, { content: [heading, ...bodyNodes(s.body)] });
}

export function outlineToDesign(blocks: OutlineBlock[], docTitle: string): Design {
  seq = 0;
  const { title, intro, sections: secs } = sections(blocks.filter((b) => (b.t === "para" ? b.text.trim() : true)));
  const content: DesignNode[] = [];
  const opening = [node("Heading", { text: clip(title ?? docTitle, 300), level: "1" }), ...bodyNodes(intro)];
  content.push(node("Section", { width: "normal" }, { content: opening }));
  secs.forEach((s, i) => content.push(sectionNode(s, i)));
  return { root: { props: { title: clip(title ?? docTitle, 200), background: "" } }, content };
}
