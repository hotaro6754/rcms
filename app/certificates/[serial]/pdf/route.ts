import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderCertificatePdf } from "@/lib/certificate-pdf";

/**
 * The certificate as a PDF. Public like the verification page: the serial is the credential,
 * and the document shows nothing the verification page does not.
 */
export async function GET(req: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const cert = await prisma.certificate.findUnique({
    where: { serial: serial.toUpperCase() },
    include: { program: { select: { learningLevel: { select: { name: true } } } } },
  });
  if (!cert) return new NextResponse("No certificate has that serial.", { status: 404 });
  const origin = new URL(req.url).origin;
  const pdf = await renderCertificatePdf({
    serial: cert.serial,
    holderName: cert.holderName,
    programName: cert.programName,
    levelName: cert.program.learningLevel?.name ?? null,
    issuedAt: cert.issuedAt,
    courseVersion: cert.courseVersion,
    revokedAt: cert.revokedAt,
    verifyUrl: `${origin}/certificates/${cert.serial}`,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${cert.serial}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
