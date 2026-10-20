import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorisationError } from "@/lib/errors";
import { addBlock, updateBlock } from "@/lib/services/cms/blocks";
import { importDocument } from "@/lib/services/cms/import";
import { canSeeCourseMedia } from "@/lib/services/learning/media-access";
import { designMediaIds, type Design, type DesignNode } from "@/lib/design/schema";
import { saveBuffer } from "@/lib/storage";
import { addMaterial, setDownloadable } from "@/lib/services/cms/materials";
import { resourceAccess } from "@/lib/services/learning/resource-access";
import { pageImageResponse } from "@/lib/documents/pages";
import { enrol, makeCourseDraft, makeUser, releaseCourse, resetDb, staff } from "../helpers";

beforeEach(resetDb);

function samplePdf(): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const parts: Buffer[] = [];
    doc.on("data", (b) => parts.push(b));
    doc.on("end", () => resolve(Buffer.concat(parts)));
    doc.fontSize(24).text("Denial management basics", 72, 72);
    doc.fontSize(12).text("A denial is a claim the payer refused to pay. This synthetic guide covers the main causes and how to work them.", 72, 120);
    doc.fontSize(16).text("The workflow", 72, 180);
    doc.fontSize(12).text("1. Identify the denial reason.", 72, 210).text("2. Gather the evidence.", 72, 228).text("3. Correct or appeal.", 72, 246).text("4. Track the outcome.", 72, 264);
    doc.addPage().fontSize(16).text("Common causes", 72, 72);
    doc.fontSize(12).text("• Eligibility: the patient was not covered on the date of service.", 72, 100).text("• Authorization: no prior authorization was on file.", 72, 118).text("• Timely filing: the claim reached the payer too late.", 72, 136);
    doc.end();
  });
}

const file = (bytes: Buffer, name: string) => new File([new Uint8Array(bytes)], name);
const all = (d: Design) => {
  const out: DesignNode[] = [];
  const visit = (n: DesignNode) => {
    out.push(n);
    for (const k of ["content", "col1", "col2", "col3", "col4"]) for (const c of (n.props[k] as DesignNode[] | undefined) ?? []) visit(c);
  };
  d.content.forEach(visit);
  return out;
};

describe("importing documents", () => {
  it("turns a Word file into sections, flip cards, process steps, a chart, a callout and a placed image", async () => {
    const author = await staff("CONTENT_ADMIN");
    const r = await importDocument(author, file(fs.readFileSync(path.join(__dirname, "../fixtures/denials-guide.docx")), "denials-guide.docx"));
    const nodes = all(r.design);
    const types = nodes.map((n) => n.type);
    expect(nodes.find((n) => n.type === "Heading" && n.props.level === "1")?.props.text).toBe("Working denials: a field guide");
    expect(nodes.filter((n) => n.type === "Section").length).toBeGreaterThanOrEqual(5);
    const flip = nodes.find((n) => n.type === "FlipCards")!;
    expect((flip.props.items as { front: string }[]).map((i) => i.front)).toEqual(["CARC", "RARC", "Group code"]);
    expect((nodes.find((n) => n.type === "Process")!.props.steps as { title: string }[]).map((s) => s.title)).toEqual(["Identify", "Investigate", "Resolve", "Prevent"]);
    expect((nodes.find((n) => n.type === "BarChart")!.props.items as { value: number }[]).map((i) => i.value)).toEqual([34, 22, 18, 9]);
    expect(types).toContain("Table");
    expect(types).toContain("Columns");
    expect(nodes.some((n) => n.type === "Callout" && n.props.tone === "info")).toBe(true);
    expect(nodes.some((n) => n.type === "Callout" && n.props.title === "Key points")).toBe(true);
    expect(r.images).toBe(1);
    const [imageId] = designMediaIds(r.design);
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: imageId } });
    expect(asset).toMatchObject({ kind: "IMAGE", isPublic: false, mimeType: "image/png" });
    expect(r.pdf).toBeNull();
  });

  it("reads a PDF's headings by size, numbered steps and bullets, and keeps the original for a view-only document", async () => {
    const author = await staff("CONTENT_ADMIN");
    const r = await importDocument(author, file(await samplePdf(), "denials.pdf"));
    const nodes = all(r.design);
    expect(nodes.find((n) => n.type === "Heading" && n.props.level === "1")?.props.text).toBe("Denial management basics");
    expect(nodes.filter((n) => n.type === "Heading" && n.props.level === "2").map((n) => n.props.text)).toEqual(["The workflow", "Common causes"]);
    expect((nodes.find((n) => n.type === "Process")!.props.steps as unknown[]).length).toBe(4);
    expect((nodes.find((n) => n.type === "FlipCards")!.props.items as { front: string }[]).map((i) => i.front)).toEqual(["Eligibility", "Authorization", "Timely filing"]);
    expect(r.pdf?.name).toBe("denials.pdf");
  });

  it("refuses other file types, empty documents, documents with identifiers, and people without authoring rights", async () => {
    const author = await staff("CONTENT_ADMIN");
    await expect(importDocument(author, file(Buffer.from("just text"), "notes.txt"))).rejects.toThrow(/accepts PDF and Word/);
    const learner = await makeUser();
    await expect(importDocument(learner, file(await samplePdf(), "x.pdf"))).rejects.toBeInstanceOf(AuthorisationError);
    const leaky = await new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument();
      const parts: Buffer[] = [];
      doc.on("data", (b) => parts.push(b));
      doc.on("end", () => resolve(Buffer.concat(parts)));
      doc.fontSize(12).text("Patient SSN 123-45-6789 was denied for eligibility reasons on the date of service.", 72, 72);
      doc.end();
    });
    await expect(importDocument(author, file(leaky, "leaky.pdf"))).rejects.toThrow(/Remove it from the document/);
  });
});

describe("design and document blocks", () => {
  it("checks designs, lists their images in the release so enrolled learners can see them, and nobody else", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const lesson = modules[0].lessons[0];
    const img = await prisma.mediaAsset.create({ data: { kind: "IMAGE", title: "Diagram", fileKey: await saveBuffer("media", new Uint8Array([1]), "d.png"), mimeType: "image/png", sizeBytes: 1 } });
    const design = { root: { props: {} }, content: [{ type: "Section", props: { id: "s1", content: [{ type: "Image", props: { id: "i1", mediaId: img.id, alt: "A diagram" } }, { type: "Heading", props: { id: "h1", text: "Hello", level: "2", style: { color: "javascript:alert(1)" } } }] } }] };
    const block = await addBlock(author, lesson.id, "DESIGN", { title: "Intro", design });
    const stored = (await prisma.contentBlock.findUniqueOrThrow({ where: { id: block.id } })).data as { design: Design };
    const heading = (stored.design.content[0].props.content as DesignNode[])[1];
    expect((heading.props.style as { color: string }).color).toBe("");

    await expect(updateBlock(author, block.id, { design: { root: { props: {} }, content: [{ type: "Script", props: { id: "x" } }] } })).rejects.toThrow(/not a component the designer offers/);
    await expect(updateBlock(author, block.id, { design: { root: { props: {} }, content: [{ type: "Button", props: { id: "b", label: "Go", href: "javascript:alert(1)" } }] } })).rejects.toThrow(/Links must start/);

    await releaseCourse(course.id, author);
    const learner = await makeUser();
    expect(await canSeeCourseMedia(learner, img.id, course.id)).toBe(false);
    await enrol(learner.id, course.id);
    expect(await canSeeCourseMedia(learner, img.id, course.id)).toBe(true);
    const other = await prisma.mediaAsset.create({ data: { kind: "IMAGE", title: "Unrelated", fileKey: "media/x.png", mimeType: "image/png", sizeBytes: 1 } });
    expect(await canSeeCourseMedia(learner, other.id, course.id)).toBe(false);
  });

  it("records a document's page count from the file and refuses anything that is not a PDF", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const pdf = await prisma.mediaAsset.create({ data: { kind: "DOCUMENT", title: "Guide", fileKey: await saveBuffer("media", await samplePdf(), "g.pdf"), mimeType: "application/pdf", sizeBytes: 1 } });
    const b = await addBlock(author, modules[0].lessons[0].id, "DOCUMENT", { mediaId: pdf.id, title: "The guide", pages: 999 });
    expect(((await prisma.contentBlock.findUniqueOrThrow({ where: { id: b.id } })).data as { pages: number }).pages).toBe(2);
    const sheet = await prisma.mediaAsset.create({ data: { kind: "DOCUMENT", title: "Sheet", fileKey: "media/s.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", sizeBytes: 1 } });
    await expect(addBlock(author, modules[0].lessons[0].id, "DOCUMENT", { mediaId: sheet.id, title: "Sheet" })).rejects.toThrow(/Choose a PDF/);
  });
});

describe("view-only materials", () => {
  it("are view-only unless the course team allows downloading, and are read as page images", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course, modules } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const res = await addMaterial(author, modules[0].lessons[0].id, { title: "Remittance walkthrough" }, file(await samplePdf(), "walkthrough.pdf"));
    expect(res.downloadable).toBe(false);
    await releaseCourse(course.id, author);

    const learner = await makeUser({ name: "Asha Learner" });
    expect((await resourceAccess(learner, res.id)).ok).toBe(false);
    await enrol(learner.id, course.id);
    const access = await resourceAccess(learner, res.id);
    expect(access.ok && !access.staff && !access.res.downloadable).toBe(true);

    await expect(setDownloadable(learner, res.id, true)).rejects.toBeInstanceOf(AuthorisationError);
    await setDownloadable(author, res.id, true);
    const again = await resourceAccess(learner, res.id);
    expect(again.ok && again.res.downloadable).toBe(true);

    // Page images carry no watermark: two readers get the same image of the same page.
    const other = await makeUser({ name: "Ben Learner" });
    const a = await pageImageResponse(learner, again.ok ? again.res.fileKey : "", 1);
    const b = await pageImageResponse(other, again.ok ? again.res.fileKey : "", 1);
    expect(a.status).toBe(200);
    expect(a.headers.get("content-type")).toBe("image/png");
    expect(a.headers.get("cache-control")).toContain("no-store");
    const [ab, bb] = [Buffer.from(await a.arrayBuffer()), Buffer.from(await b.arrayBuffer())];
    expect(ab.length).toBeGreaterThan(1000);
    expect(ab.equals(bb)).toBe(true);
    expect((await pageImageResponse(learner, again.ok ? again.res.fileKey : "", 9)).status).toBe(404);
  });
});
