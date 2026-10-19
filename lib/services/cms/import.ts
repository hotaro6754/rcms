import sharp from "sharp";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { MAX_BYTES, saveBuffer, sniff } from "@/lib/storage";
import { refusalFor } from "@/lib/cms/screen";
import { designText, validateDesign, type Design } from "@/lib/design/schema";
import { outlineToDesign, type OutlineBlock } from "@/lib/design/import/structure";
import { readDocx } from "@/lib/design/import/docx";
import { readPdf } from "@/lib/design/import/pdf";
import { PdfError } from "@/lib/documents/pdf";

/**
 * Turns an uploaded PDF or Word file into a lesson design (lib/design/import). Everything runs
 * on this server; no document text is sent anywhere. Pictures in the file are saved to the
 * media library as private images and placed where they appeared. The design is checked like
 * any other, including the screen for identifiers that must never be published.
 */

export const IMPORT_TYPES = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const MAX_IMAGES = 40;

export async function importDocument(actor: Actor, file: File): Promise<{ design: Design; title: string; images: number; pdf: { bytes: Uint8Array; name: string } | null }> {
  await assertCan(actor, "content.edit");
  if (!(file instanceof File) || file.size === 0) throw new ServiceError("Choose a PDF or Word file to import.");
  if (file.size > MAX_BYTES) throw new ServiceError(`Files must be ${Math.round(MAX_BYTES / (1024 * 1024))} MB or smaller.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes, file.name);
  if (!type || !IMPORT_TYPES.has(type)) throw new ServiceError("Import accepts PDF and Word (.docx) files. Older .doc files: save them as .docx first.");

  const title = (file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Imported document").slice(0, 160);
  let saved = 0;
  const saveImage = async (raw: Buffer, _contentType: string, index: number) => {
    if (saved >= MAX_IMAGES) return null;
    // Re-encode: drops metadata (camera, location, author) and anything that is not a picture.
    const img = sharp(raw, { failOn: "error" }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true });
    const png = await img.png({ compressionLevel: 9 }).toBuffer();
    const fileKey = await saveBuffer("media", png, `${title}-image-${index}.png`);
    const asset = await prisma.mediaAsset.create({
      data: { kind: "IMAGE", title: `${title}: image ${index}`.slice(0, 200), altText: null, fileKey, mimeType: "image/png", sizeBytes: png.length, isPublic: false, uploadedById: actor.id },
    });
    saved++;
    return { id: asset.id, alt: `Figure ${index} from ${title}` };
  };

  let outline: OutlineBlock[];
  try {
    outline = type === "application/pdf" ? await readPdf(Buffer.from(bytes), saveImage) : await readDocx(Buffer.from(bytes), saveImage);
  } catch (e) {
    if (e instanceof PdfError) throw new ServiceError(e.message);
    console.error("[import] could not read document", e);
    throw new ServiceError("That file could not be read. Check it opens normally, then try again.");
  }
  const words = outline.reduce((n, b) => n + (b.t === "para" ? b.text.split(/\s+/).length : 0), 0);
  if (words < 5) throw new ServiceError("No text was found in that file. If it is a scanned PDF, add it as a view-only document instead.");

  const draft = outlineToDesign(outline, title);
  const checked = validateDesign(draft);
  if (!checked.ok) throw new ServiceError(`The document was read, but the design could not be built: ${checked.error}`);
  const refusal = refusalFor(designText(checked.design));
  if (refusal) throw new ServiceError(`${refusal} Remove it from the document and import it again.`);

  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "DocumentImport", after: { file: file.name.slice(0, 200), type, images: saved, components: draft.content.length } });
  // Name the design after the document's own title when it has one.
  return { design: checked.design, title: checked.design.root.props.title || title, images: saved, pdf: type === "application/pdf" ? { bytes, name: file.name } : null };
}
