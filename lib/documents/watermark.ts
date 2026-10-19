import sharp from "sharp";

/**
 * Burns a visible, repeated watermark into an image: the viewer's name and email and the date.
 * It does not stop a screenshot (nothing on the web can), but it makes any copy traceable to
 * the account it came from, which is the deterrent that works.
 */

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);

export function watermarkText(person: { name?: string | null; email: string }, now = new Date()) {
  const date = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(now);
  return `${(person.name ?? "").slice(0, 60)} · ${person.email.slice(0, 80)} · ${date}`.replace(/^ · /, "");
}

export async function watermarkImage(input: Buffer, text: string, out: "png" | "jpeg" | "webp" = "png"): Promise<Buffer> {
  const img = sharp(input, { animated: false }).rotate();
  const meta = await img.metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 800;
  const size = Math.max(11, Math.round(width / 55));
  const stepX = Math.round(size * 22);
  const stepY = Math.round(size * 7);
  const rows: string[] = [];
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      rows.push(`<text x="${x + ((y / stepY) % 2 ? stepX / 2 : 0)}" y="${y}">${esc(text)}</text>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <g transform="rotate(-24 ${width / 2} ${height / 2})" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" fill="#1a1a1a" fill-opacity="0.13">${rows.join("")}</g>
  </svg>`;
  return img
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .toFormat(out, out === "jpeg" ? { quality: 85 } : {})
    .toBuffer();
}
