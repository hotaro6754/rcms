import sharp from "sharp";
import { openPdf, MAX_PDF_PAGES } from "@/lib/documents/pdf";
import type { OutlineBlock } from "./structure";

/**
 * Reads a PDF into an outline from its text layout: larger text becomes headings (ranked by
 * size), lines that start with bullets or numbers become lists, page headers and footers that
 * repeat on most pages are dropped, and hyphenated line breaks are joined. Embedded pictures
 * are extracted and placed after the text of the page they were on. PDFs carry no real
 * structure, so the result needs a look in the designer, especially tables, which arrive as
 * text.
 */

type Line = { text: string; size: number; y: number; x: number; page: number };

const BULLET = /^\s*([•●▪◦‣∙·*–-]|\d{1,2}[.)]|[a-z][.)])\s+/;

export async function readPdf(buf: Buffer, saveImage: (bytes: Buffer, contentType: string, index: number) => Promise<{ id: string; alt: string } | null>): Promise<OutlineBlock[]> {
  const doc = await openPdf(buf);
  try {
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    const lines: Line[] = [];
    const pageImages = new Map<number, { id: string; alt: string }[]>();
    const { OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    let imageNo = 0;

    for (let p = 1; p <= pages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const rows = new Map<number, { x: number; str: string; size: number }[]>();
      for (const it of tc.items as { str: string; transform: number[] }[]) {
        if (!("str" in it) || !it.str.trim()) continue;
        const size = Math.round(Math.hypot(it.transform[0], it.transform[1]) * 10) / 10;
        const y = Math.round(it.transform[5]);
        const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key)!.push({ x: it.transform[4], str: it.str, size });
      }
      for (const [y, parts] of [...rows.entries()].sort((a, b) => b[0] - a[0])) {
        parts.sort((a, b) => a.x - b.x);
        const text = parts.map((q) => q.str).join(" ").replace(/\s+/g, " ").trim();
        if (text) lines.push({ text, size: Math.max(...parts.map((q) => q.size)), y, x: parts[0].x, page: p });
      }

      // Embedded pictures (skipping icons and rules).
      try {
        const ops = await page.getOperatorList();
        const found: { id: string; alt: string }[] = [];
        for (let i = 0; i < ops.fnArray.length && found.length < 20; i++) {
          if (ops.fnArray[i] !== OPS.paintImageXObject) continue;
          const name = ops.argsArray[i][0] as string;
          const img = await new Promise<{ width: number; height: number; data?: Uint8ClampedArray; kind?: number } | null>((resolve) => {
            try {
              page.objs.get(name, (o: unknown) => resolve(o as never));
            } catch {
              resolve(null);
            }
            setTimeout(() => resolve(null), 3000);
          });
          if (!img?.data || img.width < 80 || img.height < 80) continue;
          const channels = img.data.length / (img.width * img.height);
          if (![1, 3, 4].includes(channels)) continue;
          const png = await sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: channels as 1 | 3 | 4 } }).png().toBuffer();
          const saved = await saveImage(png, "image/png", ++imageNo).catch(() => null);
          if (saved) found.push(saved);
        }
        if (found.length) pageImages.set(p, found);
      } catch {
        // Pictures are a bonus; the text still imports.
      }
    }

    // Running headers and footers: the same text at the same height on most pages.
    const seen = new Map<string, number>();
    for (const l of lines) {
      const k = `${l.y}|${l.text.replace(/\d+/g, "#")}`;
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    const repeated = (l: Line) => pages >= 3 && (seen.get(`${l.y}|${l.text.replace(/\d+/g, "#")}`) ?? 0) >= Math.ceil(pages * 0.5);
    const body = lines.filter((l) => !repeated(l) && !/^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(l.text));

    // The most common text size is the body size; bigger sizes are heading levels.
    const weight = new Map<number, number>();
    for (const l of body) weight.set(l.size, (weight.get(l.size) ?? 0) + l.text.length);
    const bodySize = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
    const headingSizes = [...new Set(body.filter((l) => l.size >= bodySize * 1.15 && l.text.length <= 140).map((l) => l.size))].sort((a, b) => b - a).slice(0, 3);
    const levelOf = (l: Line) => {
      const i = headingSizes.indexOf(l.size);
      return i >= 0 && !/[.;,]$/.test(l.text) ? i + 1 : 0;
    };

    const out: OutlineBlock[] = [];
    let para: string[] = [];
    let list: { ordered: boolean; items: string[]; x: number } | null = null;
    let prev: Line | null = null;
    const flushPara = () => {
      if (para.length) out.push({ t: "para", text: para.join(" ").replace(/(\w)- (\w)/g, "$1$2") });
      para = [];
    };
    const flushList = () => {
      if (list) out.push({ t: "list", ordered: list.ordered, items: list.items });
      list = null;
    };
    const pushImages = (page: number) => {
      for (const img of pageImages.get(page) ?? []) out.push({ t: "image", mediaId: img.id, alt: img.alt });
      pageImages.delete(page);
    };

    for (const l of body) {
      if (prev && l.page !== prev.page) {
        flushPara();
        flushList();
        pushImages(prev.page);
      }
      const level = levelOf(l);
      const gap = prev && prev.page === l.page ? prev.y - l.y : Infinity;
      if (level) {
        flushPara();
        flushList();
        // A heading that wraps onto a second line continues the same heading.
        const last = out[out.length - 1];
        if (last?.t === "heading" && prev && levelOf(prev) === level && gap <= l.size * 1.6) last.text += ` ${l.text}`;
        else out.push({ t: "heading", level, text: l.text });
      } else if (BULLET.test(l.text)) {
        flushPara();
        const ordered = /^\s*(\d{1,2}|[a-z])[.)]/.test(l.text);
        const item = l.text.replace(BULLET, "").trim();
        if (list && list.ordered === ordered) list.items.push(item);
        else {
          flushList();
          list = { ordered, items: [item], x: l.x };
        }
      } else if (list && l.x > list.x + 4 && gap <= l.size * 1.8) {
        // An indented line continues the current list item.
        list.items[list.items.length - 1] += ` ${l.text}`;
      } else {
        flushList();
        if (para.length && gap > l.size * 1.7) flushPara();
        para.push(l.text);
      }
      prev = l;
    }
    flushPara();
    flushList();
    if (prev) pushImages(prev.page);
    for (const p of [...pageImages.keys()]) pushImages(p);
    return out;
  } finally {
    await doc.close();
  }
}
