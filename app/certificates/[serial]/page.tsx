import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CertificateSheet } from "@/components/certificates/CertificateSheet";
import { PrintButton } from "@/components/certificates/PrintButton";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

async function load(serial: string) {
  return prisma.certificate.findUnique({
    where: { serial: serial.toUpperCase() },
    include: { program: { select: { level: true, slug: true, learningLevel: { select: { name: true } } } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ serial: string }> }): Promise<Metadata> {
  const { serial } = await params;
  const cert = await load(serial);
  if (!cert) return { title: "Certificate not found · RCMS Operations Academy" };
  return {
    title: `${cert.holderName} · ${cert.programName} · RCMS Operations Academy`,
    description: `Certificate ${cert.serial}, issued ${DATE.format(cert.issuedAt)}.`,
    robots: { index: false },
  };
}

/**
 * Public verification. Anyone holding a serial (an employer, a recruiter) can open this
 * page and see whether the certificate is genuine and current. No sign-in: the serial is
 * the credential, and the page shows only what is printed on the certificate itself.
 */
export default async function CertificatePage({ params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const cert = await load(serial);
  if (!cert) notFound();

  const head = await headers();
  const origin = `${head.get("x-forwarded-proto") ?? "https"}://${head.get("host") ?? "rcms.academy"}`;
  const revoked = !!cert.revokedAt;

  return (
    <div className="editorial min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-6 px-6">
          <Link href="/" className="flex items-baseline gap-2.5">
            <span className="text-data text-[13px] font-semibold tracking-[0.18em]">RCMS</span>
            <span className="font-serif-display hidden text-[17px] leading-none sm:inline">Operations Academy</span>
          </Link>
          <p className="text-data text-[11px] tracking-[0.12em] text-subtle">CERTIFICATE VERIFICATION</p>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <CertificateSheet
            origin={origin}
            cert={{
              serial: cert.serial,
              holderName: cert.holderName,
              programName: cert.programName,
              level: cert.program.level,
              issuedAt: cert.issuedAt,
              revokedAt: cert.revokedAt,
            }}
          />

          <aside className="flex flex-col gap-8">
            <div className={revoked ? "border-t-2 border-danger pt-5" : "border-t-2 border-foreground pt-5"}>
              <p className={`text-data text-[11px] tracking-[0.14em] ${revoked ? "text-danger" : "text-brand"}`}>
                {revoked ? "REVOKED" : "VERIFIED"}
              </p>
              <p className="font-serif-display mt-3 text-[1.6rem] leading-snug">
                {revoked
                  ? "This certificate was issued and has since been revoked."
                  : "This certificate is genuine and current."}
              </p>
              {revoked && cert.revokeReason && (
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{cert.revokeReason}</p>
              )}
            </div>

            <dl className="text-[14px]">
              {[
                ["Holder", cert.holderName],
                ["Program", cert.programName],
                ...(cert.program.learningLevel ? [["Level", cert.program.learningLevel.name]] : []),
                ["Issued", DATE.format(cert.issuedAt)],
                ...(revoked && cert.revokedAt ? [["Revoked", DATE.format(cert.revokedAt)]] : []),
                ["Serial", cert.serial],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 border-b border-border py-3">
                  <dt className="text-data pt-0.5 text-[10.5px] tracking-[0.12em] text-subtle">{k.toUpperCase()}</dt>
                  <dd className={k === "Serial" ? "text-data tracking-[0.04em]" : undefined}>{v}</dd>
                </div>
              ))}
            </dl>

            <a href={`/certificates/${cert.serial}/pdf`} className="inline-flex min-h-11 w-fit items-center rounded-[3px] border border-input px-5 text-[14px] font-medium transition-colors hover:bg-secondary">
              Download PDF
            </a>
            {!revoked && (
              <PrintButton className="inline-flex min-h-11 w-fit items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover" />
            )}

            <p className="text-[13px] leading-relaxed text-subtle">
              Certificates are issued when every lesson of a program is complete and every
              assessment is passed. Questions about a certificate:{" "}
              <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">
                write to the Academy
              </Link>
              .
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
