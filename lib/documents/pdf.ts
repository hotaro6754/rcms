import path from "node:path";
import { createRequire } from "node:module";

/**
 * Reading PDFs on the server with pdf.js: page counts, text with its layout (for importing a
 * document into a lesson design), embedded images, and rendering a page to a PNG (for the
 * view-only document reader, so the file itself is never sent to the browser).
 *
 * Server-only. pdf.js runs without its worker and without eval; fonts come from its own
 * package folder.
 */

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
const STANDARD_FONTS = path.join(pdfjsRoot, "standard_fonts") + path.sep;

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let lib: Promise<PdfJs> | null = null;
const pdfjs = () => (lib ??= import("pdfjs-dist/legacy/build/pdf.mjs"));

export const MAX_PDF_PAGES = 500;

/** Opens a PDF; call `close()` when done to free pdf.js's memory. */
export async function openPdf(data: Uint8Array | Buffer) {
  const { getDocument } = await pdfjs();
  // pdf.js takes ownership of the array it is given; pass a copy so the caller's buffer survives.
  const task = getDocument({ data: new Uint8Array(data), disableFontFace: true, useSystemFonts: false, standardFontDataUrl: STANDARD_FONTS, verbosity: 0 });
  try {
    const doc = await task.promise;
    return Object.assign(doc, { close: () => task.destroy() });
  } catch {
    await task.destroy().catch(() => {});
    throw new PdfError("That file could not be read as a PDF. If it is password-protected, remove the password and upload it again.");
  }
}

export class PdfError extends Error {}

export async function pdfPageCount(data: Uint8Array | Buffer) {
  const doc = await openPdf(data);
  try {
    return doc.numPages;
  } finally {
    await doc.close();
  }
}

/** Renders one page (1-based) to PNG at the given width in pixels. */
export async function renderPdfPage(data: Uint8Array | Buffer, pageNo: number, width = 1200): Promise<{ png: Buffer; width: number; height: number }> {
  const { createCanvas } = await import("@napi-rs/canvas");
  const doc = await openPdf(data);
  try {
    if (pageNo < 1 || pageNo > doc.numPages) throw new PdfError("That page does not exist.");
    const page = await doc.getPage(pageNo);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(4, width / base.width) });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas: canvas as never, canvasContext: ctx as never, viewport }).promise;
    return { png: canvas.toBuffer("image/png"), width: canvas.width, height: canvas.height };
  } finally {
    await doc.close();
  }
}
