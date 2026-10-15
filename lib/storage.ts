import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Where uploaded files live.
 *
 * Files are stored under storage/<area>/ outside /public, so nothing is ever served without
 * an access check in a route handler. A resource may instead be a link to a file held
 * elsewhere (an https URL), which the download route redirects to after the same check.
 *
 * The browser's declared MIME type is never trusted: `sniff` reads the file's first bytes
 * and the upload is refused unless the content matches an allowed type.
 *
 * The local driver suits one server with a persistent disk. On serverless hosting, swap
 * saveBuffer / readStored / removeStored for S3 or R2 (same signatures).
 */

export type StorageArea = "materials" | "media" | "attempts" | "vendor" | "deliverables";

const BASE = resolve(process.cwd(), "storage");

export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "text/csv": "CSV",
  "text/plain": "TXT",
  "application/zip": "ZIP",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
  "image/gif": "GIF",
  "audio/mpeg": "MP3",
  "audio/mp4": "M4A",
  "audio/ogg": "OGG",
  "audio/wav": "WAV",
};

export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"]);
export const DOCUMENT_TYPES = new Set(Object.keys(ALLOWED_TYPES).filter((t) => !IMAGE_TYPES.has(t) && !AUDIO_TYPES.has(t)));

export const LINK_TYPE = "text/uri-list";

export const isLink = (fileKey: string) => /^https:\/\//.test(fileKey);

/** Short label for a resource's type: PDF, XLSX, LINK. */
export function typeLabel(mimeType: string) {
  return mimeType === LINK_TYPE ? "LINK" : (ALLOWED_TYPES[mimeType] ?? "FILE");
}

const OOXML: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/**
 * The type a file's content actually is, from its leading bytes, or null if it is not one
 * of the allowed types. Office files are zip containers, told apart by the name the author
 * gave them only after the zip signature has been confirmed.
 */
export function sniff(buf: Uint8Array, fileName: string): string | null {
  const b = (i: number) => buf[i];
  const starts = (...bytes: number[]) => bytes.every((v, i) => b(i) === v);
  if (starts(0x25, 0x50, 0x44, 0x46, 0x2d)) return "application/pdf";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (starts(0x52, 0x49, 0x46, 0x46) && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return "image/webp";
  if (starts(0x52, 0x49, 0x46, 0x46) && b(8) === 0x57 && b(9) === 0x41 && b(10) === 0x56 && b(11) === 0x45) return "audio/wav";
  if (starts(0x4f, 0x67, 0x67, 0x53)) return "audio/ogg";
  // MP3: an ID3 tag, or an MPEG audio frame header (11 sync bits set).
  if (starts(0x49, 0x44, 0x33) || (b(0) === 0xff && (b(1) & 0xe0) === 0xe0)) return "audio/mpeg";
  // M4A: an ISO media "ftyp" box with an audio brand.
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) {
    const brand = String.fromCharCode(b(8), b(9), b(10), b(11));
    if (brand === "M4A " || brand === "M4B ") return "audio/mp4";
  }
  if (starts(0x50, 0x4b, 0x03, 0x04)) {
    const ext = fileName.toLowerCase().split(".").pop() ?? "";
    return OOXML[ext] ?? "application/zip";
  }
  // Text: valid UTF-8 with no NUL bytes in the first 8 KB.
  const head = buf.subarray(0, 8192);
  if (head.length && !head.includes(0)) {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(head);
      return fileName.toLowerCase().endsWith(".csv") ? "text/csv" : "text/plain";
    } catch {
      return null;
    }
  }
  return null;
}

function root(area: StorageArea) {
  return join(BASE, area);
}

function pathFor(key: string) {
  // Keys are "<area>/<uuid>-<name>" for new files; legacy material keys have no area.
  const p = key.includes("/") ? resolve(BASE, key) : resolve(BASE, "materials", key);
  // Keys are generated here, but never trust a path that escapes the folder.
  if (!p.startsWith(BASE + sep)) throw new Error("Invalid file key.");
  return p;
}

export function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
}

export async function saveBuffer(area: StorageArea, buf: Uint8Array, fileName: string): Promise<string> {
  const key = `${area}/${randomUUID()}-${safeName(fileName)}`;
  await mkdir(root(area), { recursive: true });
  await writeFile(pathFor(key), buf);
  return key;
}

export interface CheckedUpload {
  fileKey: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

/**
 * Validates and stores an upload. `allowed` limits the sniffed type; the declared type is
 * ignored. Throws an Error with a sentence for the uploader on refusal.
 */
export async function saveChecked(area: StorageArea, file: File, allowed: Set<string> | string[], maxBytes = MAX_BYTES): Promise<CheckedUpload> {
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload.");
  if (file.size > maxBytes) throw new Error(`Files must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`);
  const buf = new Uint8Array(await file.arrayBuffer());
  const type = sniff(buf, file.name);
  const ok = Array.isArray(allowed) ? allowed.includes(type ?? "") : allowed.has(type ?? "");
  if (!type || !ok) throw new Error("That file type is not accepted here, or the file is not what its name says it is.");
  const fileKey = await saveBuffer(area, buf, file.name);
  return { fileKey, mimeType: type, sizeBytes: file.size, fileName: file.name.slice(0, 200) };
}

/** Kept for existing callers: stores a course material after sniffing it. */
export async function saveFile(file: File) {
  const { fileKey, mimeType, sizeBytes } = await saveChecked("materials", file, new Set(Object.keys(ALLOWED_TYPES)));
  return { fileKey, mimeType, sizeBytes };
}

/** Whether a material can actually be opened: a link, or a stored file that exists. */
export function isAvailable(key: string) {
  if (isLink(key)) return true;
  try {
    return existsSync(pathFor(key));
  } catch {
    return false;
  }
}

export async function readStored(key: string): Promise<Buffer> {
  return readFile(pathFor(key));
}

export async function removeStored(key: string): Promise<void> {
  if (isLink(key)) return;
  await rm(pathFor(key), { force: true });
}

export function humanSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Headers for sending a stored file: never sniffed by the browser, never cached publicly. */
export function downloadHeaders(mimeType: string, size: number, name: string, inline = false) {
  return {
    "Content-Type": mimeType,
    "Content-Length": String(size),
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/[^\w\-. ]+/g, "").trim() || "file"}"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  };
}
