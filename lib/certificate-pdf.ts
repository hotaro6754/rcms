import PDFDocument from "pdfkit";
import { BRAND } from "@/lib/brand";

export interface CertificatePdfInput {
  serial: string;
  holderName: string;
  programName: string;
  levelName: string | null;
  issuedAt: Date;
  courseVersion: number | null;
  revokedAt: Date | null;
  verifyUrl: string;
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * The certificate as a one-page A4 landscape PDF, built from the same record the public
 * verification page shows. It carries the serial and the verification address so anyone can
 * check it is current; a revoked certificate is printed with REVOKED across it.
 * Uses the standard PDF fonts only, so nothing is fetched or embedded from outside.
 */
export function renderCertificatePdf(c: CertificatePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 56, info: { Title: `Certificate ${c.serial}`, Author: BRAND.name, Subject: c.programName } });
    const chunks: Buffer[] = [];
    doc.on("data", (d: Buffer) => chunks.push(d));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { width, height } = doc.page;
    doc.rect(28, 28, width - 56, height - 56).lineWidth(1).strokeColor("#161513").stroke();
    doc.rect(34, 34, width - 68, height - 68).lineWidth(0.5).strokeColor("#8f887e").stroke();

    doc.fillColor("#161513").font("Helvetica-Bold").fontSize(11).text(BRAND.caps, 56, 70, { characterSpacing: 3 });
    doc.font("Helvetica").fontSize(10).fillColor("#57534c").text(c.levelName ? `${c.levelName.toUpperCase()} LEVEL` : "", 56, 70, { align: "right", characterSpacing: 2 });

    doc.moveDown(4);
    doc.font("Times-Roman").fontSize(16).fillColor("#57534c").text("This certifies that", { align: "center" });
    doc.moveDown(0.6);
    doc.font("Times-Bold").fontSize(38).fillColor("#161513").text(c.holderName, { align: "center" });
    doc.moveDown(0.6);
    doc.font("Times-Roman").fontSize(16).fillColor("#57534c").text("completed every lesson and passed every assessment of", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Times-Bold").fontSize(24).fillColor("#161513").text(c.programName, { align: "center" });
    if (c.courseVersion) doc.font("Helvetica").fontSize(10).fillColor("#57534c").text(`Course release ${c.courseVersion}`, { align: "center" });

    const y = height - 150;
    doc.font("Helvetica").fontSize(10).fillColor("#57534c");
    doc.text("ISSUED", 80, y, { characterSpacing: 2 });
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#161513").text(DATE.format(c.issuedAt), 80, y + 16);
    doc.font("Helvetica").fontSize(10).fillColor("#57534c").text("SERIAL", width / 2 - 100, y, { characterSpacing: 2, width: 200, align: "center" });
    doc.font("Courier-Bold").fontSize(13).fillColor("#161513").text(c.serial, width / 2 - 150, y + 16, { width: 300, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor("#57534c").text("VERIFY AT", width - 330, y, { characterSpacing: 2, width: 250, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor("#161513").text(c.verifyUrl, width - 380, y + 16, { width: 300, align: "right" });

    doc.font("Helvetica").fontSize(8.5).fillColor("#6f6a62").text(
      "An Academy certificate of course completion. It is not a professional credential and is not issued, accredited or endorsed by AAPC, AHIMA, HFMA, AAHAM or any government body.",
      80,
      height - 82,
      { width: width - 160, align: "center" },
    );

    if (c.revokedAt) {
      doc.save();
      doc.rotate(-20, { origin: [width / 2, height / 2] });
      doc.font("Helvetica-Bold").fontSize(96).fillColor("#b42318").opacity(0.25).text("REVOKED", 0, height / 2 - 60, { width, align: "center" });
      doc.restore();
      doc.opacity(1).font("Helvetica-Bold").fontSize(11).fillColor("#b42318").text(`Revoked on ${DATE.format(c.revokedAt)}. This certificate is no longer valid.`, 56, 100, { width: width - 112, align: "center" });
    }
    doc.end();
  });
}
