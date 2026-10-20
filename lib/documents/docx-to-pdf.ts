import mammoth from "mammoth";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { parse, type HTMLElement, type Node } from "node-html-parser";

/**
 * Turns a Word (.docx) file into a PDF so it can be shown as a view-only document, page by
 * page, like any other PDF. mammoth reads Word's own structure (headings, bold and italic,
 * lists, tables, pictures) and pdfkit sets it again on A4 pages.
 *
 * This is a re-typeset, not a pixel copy: fonts, columns, headers and footers, text boxes and
 * exact page breaks from Word are not kept. Text outside the Latin alphabet (for example
 * Hindi) is not supported by the PDF's built-in fonts and is replaced by "?". For an exact
 * copy, export the file from Word as a PDF and upload that instead.
 *
 * Server-only. Staff upload these; learners only ever see the resulting page images.
 */

const MARGIN = 56;
const BODY = 11;
const COLORS = { text: "#1a1a1a", rule: "#bdbdbd", head: "#eeeeee" };

type Run = { text: string; bold?: boolean; italic?: boolean };
type Img = { bytes: Buffer; width: number; height: number };

/** Characters the PDF's built-in fonts can draw; anything else becomes "?". */
const WIN_ANSI_EXTRA: Record<string, string> = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", "•": "•", " ": " ", " ": " ", "​": "" };
function clean(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch in WIN_ANSI_EXTRA) out += WIN_ANSI_EXTRA[ch];
    else if (code === 9 || code === 10 || (code >= 32 && code < 127) || (code >= 160 && code <= 255)) out += ch;
    else out += "?";
  }
  return out;
}

function runsOf(n: Node, style: { bold?: boolean; italic?: boolean } = {}): Run[] {
  if (n.nodeType === 3) {
    const t = n.text.replace(/\s+/g, " ");
    return t ? [{ text: clean(t), ...style }] : [];
  }
  const el = n as HTMLElement;
  const tag = el.rawTagName?.toLowerCase();
  if (tag === "br") return [{ text: "\n", ...style }];
  if (tag === "img" || tag === "ul" || tag === "ol" || tag === "table") return [];
  const next = { bold: style.bold || tag === "strong" || tag === "b", italic: style.italic || tag === "em" || tag === "i" };
  return el.childNodes.flatMap((c) => runsOf(c, next));
}

/** Joins runs, trims the ends and merges runs with the same style. */
function tidy(runs: Run[]): Run[] {
  const merged: Run[] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic) last.text += r.text;
    else merged.push({ ...r });
  }
  if (merged.length) {
    merged[0].text = merged[0].text.replace(/^\s+/, "");
    merged[merged.length - 1].text = merged[merged.length - 1].text.replace(/\s+$/, "");
  }
  return merged.filter((r) => r.text.length > 0);
}

const font = (r: Run) => (r.bold && r.italic ? "Helvetica-BoldOblique" : r.bold ? "Helvetica-Bold" : r.italic ? "Helvetica-Oblique" : "Helvetica");

export async function docxToPdf(buf: Buffer): Promise<Buffer> {
  const images = new Map<string, Img>();
  let n = 0;
  const { value: html } = await mammoth.convertToHtml(
    { buffer: buf },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const id = `img-${++n}`;
        try {
          const raw = await image.readAsBuffer();
          const png = await sharp(raw, { animated: false }).rotate().png().toBuffer({ resolveWithObject: true });
          images.set(id, { bytes: png.data, width: png.info.width, height: png.info.height });
        } catch {
          // A picture format the converter cannot read (for example a Word drawing) is skipped.
        }
        return { src: id };
      }),
    },
  );
  const root = parse(html);

  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: false, info: { Producer: "RCMExcel" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const left = MARGIN;
  const width = doc.page.width - MARGIN * 2;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const room = (h: number) => {
    if (doc.y + h > bottom()) doc.addPage();
  };

  function paragraph(runs: Run[], o: { size?: number; indent?: number; gap?: number; prefix?: string; boldAll?: boolean } = {}) {
    const all = tidy(o.boldAll ? runs.map((r) => ({ ...r, bold: true })) : runs);
    if (!all.length) return;
    const size = o.size ?? BODY;
    const indent = o.indent ?? 0;
    doc.fillColor(COLORS.text).fontSize(size);
    doc.x = left + indent;
    const w = width - indent;
    if (o.prefix) all.unshift({ text: `${o.prefix} ` });
    all.forEach((r, i) => {
      doc.font(font(r)).text(r.text, { continued: i < all.length - 1, width: w, lineGap: 2 });
    });
    doc.x = left;
    doc.moveDown((o.gap ?? 0.6) * (BODY / size));
  }

  function picture(id: string) {
    const img = images.get(id);
    if (!img) return;
    const maxW = width;
    const maxH = (doc.page.height - MARGIN * 2) * 0.7;
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    room(h + 6);
    doc.image(img.bytes, left, doc.y, { width: w, height: h });
    doc.y += h + 6;
    doc.x = left;
  }

  function pictures(el: HTMLElement) {
    for (const im of el.querySelectorAll("img")) picture(im.getAttribute("src") ?? "");
  }

  function list(el: HTMLElement, depth: number) {
    const ordered = el.rawTagName?.toLowerCase() === "ol";
    let i = 0;
    for (const li of el.childNodes) {
      if ((li as HTMLElement).rawTagName?.toLowerCase() !== "li") continue;
      const item = li as HTMLElement;
      i++;
      room(BODY * 3);
      paragraph(item.childNodes.flatMap((c) => runsOf(c)), { indent: 14 + depth * 16, gap: 0.25, prefix: ordered ? `${i}.` : "•" });
      pictures(item);
      for (const c of item.childNodes) {
        const t = (c as HTMLElement).rawTagName?.toLowerCase();
        if (t === "ul" || t === "ol") list(c as HTMLElement, depth + 1);
      }
    }
    doc.moveDown(0.4);
  }

  function table(el: HTMLElement) {
    const rows = el.querySelectorAll("tr").map((tr) => tr.childNodes.filter((c) => ["td", "th"].includes((c as HTMLElement).rawTagName?.toLowerCase() ?? "")) as HTMLElement[]);
    const cols = Math.max(0, ...rows.map((r) => r.length));
    if (!cols) return;
    const colW = width / cols;
    const pad = 4;
    rows.forEach((cells, rowIndex) => {
      const texts = cells.map((c) => tidy(runsOf(c)).map((r) => r.text).join(""));
      const header = cells.some((c) => c.rawTagName?.toLowerCase() === "th") || (rowIndex === 0 && cells.every((c) => !!c.querySelector("strong, b")));
      doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(BODY - 1);
      const h = Math.max(...texts.map((t) => doc.heightOfString(t || " ", { width: colW - pad * 2 })), BODY) + pad * 2;
      room(h);
      const y = doc.y;
      texts.forEach((t, c) => {
        const x = left + c * colW;
        if (header) doc.rect(x, y, colW, h).fillAndStroke(COLORS.head, COLORS.rule);
        else doc.rect(x, y, colW, h).stroke(COLORS.rule);
        doc.fillColor(COLORS.text).font(header ? "Helvetica-Bold" : "Helvetica").fontSize(BODY - 1).text(t, x + pad, y + pad, { width: colW - pad * 2 });
      });
      doc.x = left;
      doc.y = y + h;
    });
    doc.moveDown(0.8);
  }

  const headingSize: Record<string, number> = { h1: 22, h2: 17, h3: 14, h4: 12.5, h5: 11.5, h6: 11 };

  for (const node of root.childNodes) {
    if (node.nodeType !== 1) continue;
    const el = node as HTMLElement;
    const tag = el.rawTagName?.toLowerCase() ?? "";
    if (headingSize[tag]) {
      room(headingSize[tag] * 3);
      doc.moveDown(0.4);
      paragraph(runsOf(el), { size: headingSize[tag], boldAll: true, gap: 0.5 });
      pictures(el);
    } else if (tag === "p") {
      paragraph(runsOf(el));
      pictures(el);
    } else if (tag === "ul" || tag === "ol") list(el, 0);
    else if (tag === "table") table(el);
  }

  // A file with no readable content still has to be a valid, one-page PDF.
  if (doc.y <= MARGIN + 1 && n === 0 && root.text.trim() === "") paragraph([{ text: "(This document has no readable content.)", italic: true }]);
  doc.end();
  return done;
}
