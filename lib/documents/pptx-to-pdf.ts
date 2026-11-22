import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import PDFDocument from "pdfkit";
import sharp from "sharp";

/**
 * Turns a PowerPoint deck (.pptx) into a PDF, one page per slide, so it can be shown to
 * learners as a view-only slide viewer: the server renders each page to an image and the
 * deck itself never reaches the browser.
 *
 * 1. Exact: when LibreOffice is installed on the server (SOFFICE_PATH, or a standard install
 *    location), the deck is converted by LibreOffice. Layout, themes, shapes and fonts match.
 * 2. Fallback: otherwise the deck is re-drawn from its own structure: each slide's text boxes
 *    (titles and bullets, at their positions and sizes) and pictures. Themes, shapes, charts,
 *    SmartArt and animations are not drawn. For an exact copy without LibreOffice, save the deck
 *    from PowerPoint as a PDF (File › Export › PDF) and upload that as the slides instead.
 *
 * Server-only. Staff upload decks; learners only ever see the resulting page images.
 */

const run = promisify(execFile);

const CANDIDATES = [
  process.env.SOFFICE_PATH,
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "/usr/bin/soffice",
  "/usr/bin/libreoffice",
  "/usr/lib/libreoffice/program/soffice",
  "/opt/libreoffice/program/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
].filter((p): p is string => !!p);

export function libreOfficePath(): string | null {
  return CANDIDATES.find((p) => existsSync(p)) ?? null;
}

export type ConversionMethod = "libreoffice" | "redrawn";

export async function pptxToPdf(buf: Buffer): Promise<{ pdf: Buffer; method: ConversionMethod }> {
  const soffice = libreOfficePath();
  if (soffice) {
    try {
      return { pdf: await viaLibreOffice(soffice, buf), method: "libreoffice" };
    } catch (e) {
      console.error("[pptx-to-pdf] LibreOffice conversion failed; re-drawing instead", e);
    }
  }
  return { pdf: await redraw(buf), method: "redrawn" };
}

async function viaLibreOffice(soffice: string, buf: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "rcms-pptx-"));
  try {
    const input = path.join(dir, "deck.pptx");
    await writeFile(input, buf);
    // A private profile per conversion: LibreOffice refuses to run twice on one profile.
    const profile = `file:///${path.join(dir, "profile").replace(/\\/g, "/").replace(/^\/+/, "")}`;
    await run(soffice, [`-env:UserInstallation=${profile}`, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", dir, input], { timeout: 180_000, windowsHide: true });
    return await readFile(path.join(dir, "deck.pdf"));
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ fallback re-draw */

const EMU_PER_PT = 12700;
const PAGE_W = 960; // points; 16:9 at 13.33in
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

type El = Element;
const kids = (el: El | Document, tag: string): El[] => Array.from(el.getElementsByTagName(tag)) as El[];
const first = (el: El | Document, tag: string): El | null => (el.getElementsByTagName(tag)[0] as El | undefined) ?? null;
const num = (v: string | null | undefined, d = 0) => (v == null || v === "" || Number.isNaN(Number(v)) ? d : Number(v));

/** Characters the PDF's built-in fonts can draw; anything else becomes "?". */
const MAP: Record<string, string> = { "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "...", "•": "•", " ": " ", "​": "" };
function clean(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (ch in MAP) out += MAP[ch];
    else if (code === 9 || code === 10 || (code >= 32 && code < 127) || (code >= 160 && code <= 255)) out += ch;
    else out += "?";
  }
  return out;
}

async function relsOf(zip: JSZip, partPath: string): Promise<Map<string, string>> {
  const dir = path.posix.dirname(partPath);
  const relPath = path.posix.join(dir, "_rels", `${path.posix.basename(partPath)}.rels`);
  const xml = await zip.file(relPath)?.async("string");
  const out = new Map<string, string>();
  if (!xml) return out;
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  for (const r of kids(doc, "Relationship")) {
    const target = r.getAttribute("Target") ?? "";
    if (r.getAttribute("TargetMode") === "External") continue;
    out.set(r.getAttribute("Id") ?? "", path.posix.normalize(path.posix.join(dir, target)));
  }
  return out;
}

interface Box { x: number; y: number; w: number; h: number }
function boxOf(el: El): Box | null {
  const xfrm = first(el, "a:xfrm");
  const off = xfrm && first(xfrm, "a:off");
  const ext = xfrm && first(xfrm, "a:ext");
  if (!off || !ext) return null;
  return { x: num(off.getAttribute("x")) / EMU_PER_PT, y: num(off.getAttribute("y")) / EMU_PER_PT, w: num(ext.getAttribute("cx")) / EMU_PER_PT, h: num(ext.getAttribute("cy")) / EMU_PER_PT };
}

interface Para { text: string; level: number; size: number | null; bold: boolean; bullet: boolean; align: "left" | "center" | "right" }

function parasOf(sp: El, isTitle: boolean, plain = false): Para[] {
  const body = first(sp, "p:txBody");
  if (!body) return [];
  const out: Para[] = [];
  for (const p of kids(body, "a:p")) {
    const runs = [...kids(p, "a:r"), ...kids(p, "a:fld")];
    const text = runs.map((r) => first(r, "a:t")?.textContent ?? "").join("");
    if (!text.trim()) continue;
    const pPr = first(p, "a:pPr");
    const rPr = first(p, "a:rPr") ?? first(p, "a:endParaRPr");
    const algn = pPr?.getAttribute("algn");
    const noBullet = !!(pPr && first(pPr, "a:buNone"));
    out.push({
      text: clean(text),
      level: num(pPr?.getAttribute("lvl")),
      size: rPr?.getAttribute("sz") ? num(rPr.getAttribute("sz")) / 100 : null,
      bold: rPr?.getAttribute("b") === "1" || isTitle,
      bullet: !isTitle && !plain && !noBullet,
      align: algn === "ctr" || (plain && !algn) ? "center" : algn === "r" ? "right" : "left",
    });
  }
  return out;
}

async function redraw(buf: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buf);
  const presXml = await zip.file("ppt/presentation.xml")?.async("string");
  if (!presXml) throw new Error("That file is not a PowerPoint deck.");
  const pres = new DOMParser().parseFromString(presXml, "text/xml");
  const sz = first(pres, "p:sldSz");
  const slideW = num(sz?.getAttribute("cx"), 12192000) / EMU_PER_PT;
  const slideH = num(sz?.getAttribute("cy"), 6858000) / EMU_PER_PT;
  const scale = PAGE_W / slideW;
  const pageH = slideH * scale;
  const presRels = await relsOf(zip, "ppt/presentation.xml");
  const slidePaths = kids(pres, "p:sldId")
    .map((s) => presRels.get(s.getAttributeNS(NS_R, "id") ?? s.getAttribute("r:id") ?? ""))
    .filter((p): p is string => !!p);
  if (!slidePaths.length) throw new Error("That deck has no slides.");

  const doc = new PDFDocument({ size: [PAGE_W, pageH], margin: 0, autoFirstPage: false, info: { Title: "Slides", Producer: "RCMExcel" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  for (const [i, slidePath] of slidePaths.entries()) {
    const xml = await zip.file(slidePath)?.async("string");
    doc.addPage({ size: [PAGE_W, pageH], margin: 0 });
    doc.rect(0, 0, PAGE_W, pageH).fill("#ffffff");
    if (!xml) continue;
    const slide = new DOMParser().parseFromString(xml, "text/xml");
    const rels = await relsOf(zip, slidePath);

    // Pictures first, so text sits above them as it usually does on a slide.
    for (const pic of kids(slide, "p:pic")) {
      const blip = first(pic, "a:blip");
      const target = blip && rels.get(blip.getAttributeNS(NS_R, "embed") ?? blip.getAttribute("r:embed") ?? "");
      const box = boxOf(pic);
      if (!target || !box) continue;
      const raw = await zip.file(target)?.async("nodebuffer");
      if (!raw) continue;
      let img: Buffer | null = null;
      try {
        img = /\.(png|jpe?g)$/i.test(target) ? raw : await sharp(raw).png().toBuffer();
      } catch {
        img = null; // EMF/WMF and other vector formats cannot be drawn here.
      }
      if (!img) continue;
      try {
        doc.image(img, box.x * scale, box.y * scale, { fit: [box.w * scale, box.h * scale], align: "center", valign: "center" });
      } catch {
        /* unreadable picture: skip it */
      }
    }

    let fallbackY = 40;
    for (const sp of kids(slide, "p:sp")) {
      const ph = first(sp, "p:ph");
      const phType = ph?.getAttribute("type") ?? "";
      const isTitle = phType === "title" || phType === "ctrTitle";
      // A title slide's title and subtitle sit centred, without bullets.
      const cover = phType === "ctrTitle" || phType === "subTitle";
      const paras = parasOf(sp, isTitle, cover);
      if (!paras.length) continue;
      const box =
        boxOf(sp) ??
        (phType === "ctrTitle"
          ? { x: 60, y: slideH * 0.3, w: slideW - 120, h: slideH * 0.22 }
          : phType === "subTitle"
            ? { x: 90, y: slideH * 0.56, w: slideW - 180, h: slideH * 0.2 }
            : isTitle
              ? { x: 48, y: 30, w: slideW - 96, h: 80 }
              : { x: 48, y: fallbackY + 90, w: slideW - 96, h: slideH - fallbackY - 130 });
      if (cover) for (const p of paras) p.align = "center";
      fallbackY = Math.max(fallbackY, box.y + box.h);
      let y = box.y * scale + 6;
      const x0 = box.x * scale + 6;
      const width = Math.max(40, box.w * scale - 12);
      for (const p of paras) {
        const size = Math.max(9, Math.min(60, (p.size ?? (phType === "ctrTitle" ? 40 : isTitle ? 32 : p.level ? 16 : 20)) * scale));
        const indent = p.bullet ? 16 * scale + p.level * 22 * scale : 0;
        doc.font(p.bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(isTitle ? "#14204a" : "#1f2937");
        if (p.bullet) doc.circle(x0 + indent - 9 * scale, y + size * 0.55, Math.max(1.6, size * 0.13)).fill("#0d9488").fillColor("#1f2937");
        // Text that would run off the slide is cut short rather than spilling onto a new page.
        if (y > pageH - size - 4) break;
        doc.text(p.text, x0 + indent, y, { width: width - indent, height: pageH - y - 4, ellipsis: true, align: p.align, lineGap: size * 0.18 });
        y = doc.y + size * 0.35;
      }
    }

    doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text(`${i + 1}`, PAGE_W - 40, pageH - 22, { width: 30, align: "right" });
  }

  doc.end();
  return done;
}
