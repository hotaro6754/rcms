import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { readCache, readStored, writeCache } from "@/lib/storage";
import { allow } from "@/lib/rate-limit";
import { pdfPageCount, renderPdfPage } from "./pdf";
import { watermarkImage, watermarkText } from "./watermark";

/**
 * Serving view-only PDFs as watermarked page images (shared by the lesson document reader and
 * view-only lesson materials). Rendered pages are cached unwatermarked under storage/cache;
 * the watermark naming the reader is added on every request.
 */

const WIDTH = 1400;
const key = (fileKey: string, extra: string) => createHash("sha256").update(`${fileKey}:${extra}`).digest("hex");

export async function pageImageResponse(person: { id: string; name?: string | null; email: string }, fileKey: string, pageNo: number) {
  // Generous for reading, but stops a script from pulling a whole library page by page.
  if (!(await allow(`doc-pages:${person.id}`, 240, 600))) return new NextResponse("Too many pages requested. Wait a few minutes.", { status: 429 });
  const name = `${key(fileKey, `${pageNo}:${WIDTH}`)}.png`;
  let png = await readCache(name);
  if (!png) {
    const pdf = await readStored(fileKey).catch(() => null);
    if (!pdf) return new NextResponse("This document is missing from storage.", { status: 404 });
    try {
      png = (await renderPdfPage(pdf, pageNo, WIDTH)).png;
    } catch {
      return new NextResponse("That page could not be shown.", { status: 404 });
    }
    await writeCache(name, png).catch(() => {});
  }
  const marked = await watermarkImage(png, watermarkText(person), "webp");
  return new NextResponse(new Uint8Array(marked), {
    headers: { "Content-Type": "image/webp", "Content-Length": String(marked.length), "Content-Disposition": "inline", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/** Page count of a stored PDF, cached; 0 if it cannot be read. */
export async function storedPageCount(fileKey: string): Promise<number> {
  const name = `${key(fileKey, "pages")}.txt`;
  const cached = await readCache(name);
  if (cached) return Number(cached.toString()) || 0;
  const pdf = await readStored(fileKey).catch(() => null);
  if (!pdf) return 0;
  const n = await pdfPageCount(pdf).catch(() => 0);
  if (n) await writeCache(name, Buffer.from(String(n))).catch(() => {});
  return n;
}
