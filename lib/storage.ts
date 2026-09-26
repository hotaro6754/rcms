import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Where course materials live.
 *
 * Two kinds of resource share one table:
 *   - a file uploaded in Trainer Studio, stored under storage/materials (outside /public,
 *     so it is never served without the access check in app/api/materials/[id]); its
 *     fileKey is the stored file name;
 *   - a link to a file held elsewhere (Drive, OneDrive, a video host); its fileKey is the
 *     https URL and the download route redirects to it after the same check.
 *
 * The local driver suits one server with a persistent disk. On serverless hosting, swap
 * these three functions for S3 or R2 (same signatures) and nothing else changes.
 */

const ROOT = resolve(process.cwd(), "storage", "materials");

export const MAX_BYTES = 25 * 1024 * 1024;

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
};

export const LINK_TYPE = "text/uri-list";

export const isLink = (fileKey: string) => /^https:\/\//.test(fileKey);

/** Short label for a resource's type: PDF, XLSX, LINK. */
export function typeLabel(mimeType: string) {
  return mimeType === LINK_TYPE ? "LINK" : (ALLOWED_TYPES[mimeType] ?? "FILE");
}

function pathFor(key: string) {
  const p = resolve(ROOT, key);
  // Keys are generated here, but never trust a path that escapes the folder.
  if (!p.startsWith(ROOT + sep)) throw new Error("Invalid file key.");
  return p;
}

export async function saveFile(file: File): Promise<{ fileKey: string; mimeType: string; sizeBytes: number }> {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(-80) || "file";
  const key = `${randomUUID()}-${safe}`;
  await mkdir(ROOT, { recursive: true });
  await writeFile(join(ROOT, key), Buffer.from(await file.arrayBuffer()));
  return { fileKey: key, mimeType: file.type, sizeBytes: file.size };
}

/** Whether a material can actually be opened: a link, or a stored file that exists. Seeded
 *  placeholder records (materials still being written) have neither. */
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
