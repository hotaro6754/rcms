import mammoth from "mammoth";
import { parse, type HTMLElement, type Node } from "node-html-parser";
import type { OutlineBlock } from "./structure";
import { safeHref } from "@/lib/site/fields";

/**
 * Reads a Word (.docx) file into an outline. mammoth maps Word's own heading, list and table
 * structure to HTML; that HTML is only ever parsed here, never shown. Bold, italic and safe
 * links survive as the restricted Markdown the designer uses. Images are handed to `saveImage`
 * (which stores them in the media library) and placed where they appeared.
 */
export async function readDocx(buf: Buffer, saveImage: (bytes: Buffer, contentType: string, index: number) => Promise<{ id: string; alt: string } | null>): Promise<OutlineBlock[]> {
  let n = 0;
  const { value: html } = await mammoth.convertToHtml(
    { buffer: buf },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const bytes = await image.readAsBuffer();
        const saved = await saveImage(bytes, image.contentType, ++n).catch(() => null);
        // mammoth passes the picture's alt text from Word at runtime, though its types omit it.
        return { src: saved ? `media:${saved.id}` : "", alt: (image as { altText?: string }).altText || saved?.alt || "" };
      }),
    },
  );
  const root = parse(html);
  const out: OutlineBlock[] = [];
  for (const el of root.childNodes) walk(el, out);
  return out;
}

const text = (n: Node): string => {
  if (n.nodeType === 3) return n.text.replace(/\s+/g, " ");
  const el = n as HTMLElement;
  const inner = el.childNodes.map(text).join("");
  switch (el.rawTagName?.toLowerCase()) {
    case "strong":
    case "b":
      return inner.trim() ? `**${inner.trim()}**` : "";
    case "em":
    case "i":
      return inner.trim() ? `*${inner.trim()}*` : "";
    case "a": {
      const href = el.getAttribute("href") ?? "";
      return href && safeHref(href) && !href.startsWith("#") ? `[${inner.trim()}](${href})` : inner;
    }
    case "br":
      return " ";
    case "img":
      return "";
    default:
      return inner;
  }
};

function images(el: HTMLElement, out: OutlineBlock[]) {
  for (const img of el.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (src.startsWith("media:")) out.push({ t: "image", mediaId: src.slice(6), alt: img.getAttribute("alt") ?? "" });
  }
}

function walk(n: Node, out: OutlineBlock[]) {
  if (n.nodeType !== 1) return;
  const el = n as HTMLElement;
  const tag = el.rawTagName?.toLowerCase();
  const h = /^h([1-6])$/.exec(tag ?? "");
  if (h) {
    const t = text(el).replace(/\*\*/g, "").trim();
    if (t) out.push({ t: "heading", level: Number(h[1]), text: t });
    images(el, out);
    return;
  }
  if (tag === "p") {
    const t = text(el).trim();
    if (t) out.push({ t: "para", text: t });
    images(el, out);
    return;
  }
  if (tag === "ul" || tag === "ol") {
    const items = el.childNodes
      .filter((c): c is HTMLElement => c.nodeType === 1 && (c as HTMLElement).rawTagName?.toLowerCase() === "li")
      .map((li) =>
        li.childNodes
          .filter((c) => !(c.nodeType === 1 && ["ul", "ol"].includes((c as HTMLElement).rawTagName?.toLowerCase() ?? "")))
          .map(text)
          .join("")
          .trim(),
      )
      .filter(Boolean);
    if (items.length) out.push({ t: "list", ordered: tag === "ol", items });
    // Nested lists follow as their own lists.
    for (const li of el.querySelectorAll("li")) for (const sub of li.childNodes) if (sub.nodeType === 1 && ["ul", "ol"].includes((sub as HTMLElement).rawTagName?.toLowerCase() ?? "")) walk(sub, out);
    images(el, out);
    return;
  }
  if (tag === "table") {
    const rows = el.querySelectorAll("tr").map((tr) => tr.querySelectorAll("th,td").map((c) => text(c).replace(/\*\*/g, "").trim()));
    if (rows.length) out.push({ t: "table", rows });
    images(el, out);
    return;
  }
  for (const c of el.childNodes) walk(c, out);
}
