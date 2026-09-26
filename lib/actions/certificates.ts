"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin, requireUser } from "@/lib/rbac";
import { eligibility, newSerial, verifyPath } from "@/lib/certificates";

export type CertificateResult = { ok: true; serial: string } | { ok: false; error: string };

async function issue(
  userId: string,
  programId: string,
  actorId: string,
  basis: "completion" | "manual",
): Promise<CertificateResult> {
  const [user, program, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.program.findUnique({ where: { id: programId }, select: { name: true, level: true } }),
    prisma.certificate.findUnique({ where: { userId_programId: { userId, programId } } }),
  ]);
  if (!user || !program) return { ok: false, error: "That person or program no longer exists." };
  if (existing && !existing.revokedAt) return { ok: true, serial: existing.serial };

  const serial = await newSerial(program.level);
  const data = {
    serial,
    holderName: user.name,
    programName: program.name,
    issuedAt: new Date(),
    issuedById: actorId,
    basis,
    revokedAt: null,
    revokeReason: null,
  };
  const cert = existing
    ? await prisma.certificate.update({ where: { id: existing.id }, data })
    : await prisma.certificate.create({ data: { ...data, userId, programId } });

  await audit({
    actorId,
    action: "issue",
    entity: "Certificate",
    entityId: cert.id,
    after: { serial, userId, programId, basis },
  });
  await prisma.notification.create({
    data: {
      userId,
      kind: "certificate",
      title: `Your ${program.name} certificate is ready`,
      body: `Serial ${serial}. Anyone can verify it from the link on the certificate.`,
      href: verifyPath(serial),
    },
  });
  revalidatePath("/certificates");
  revalidatePath("/admin/certificates");
  revalidatePath("/academy");
  return { ok: true, serial };
}

/** A student claims a certificate they have earned. The rule is checked here, never trusted from the page. */
export async function claimCertificate(programId: string): Promise<CertificateResult> {
  const user = await requireUser();
  const enrolment = await prisma.enrolment.findUnique({
    where: { userId_programId: { userId: user.id, programId } },
    select: { state: true },
  });
  if (!enrolment || (enrolment.state !== "ACTIVE" && enrolment.state !== "COMPLETED")) {
    return { ok: false, error: "You are not enrolled on this program." };
  }
  const e = await eligibility(user.id, programId);
  if (!e.eligible) return { ok: false, error: "Finish every lesson and pass every quiz first." };

  const res = await issue(user.id, programId, user.id, "completion");
  if (res.ok) {
    await prisma.enrolment.update({
      where: { userId_programId: { userId: user.id, programId } },
      data: { state: "COMPLETED", completedAt: new Date() },
    });
  }
  return res;
}

const IssueInput = z.object({ userId: z.string().min(1), programId: z.string().min(1) });

/** Admin: issue by hand, for corporate cohorts and records from before the platform. */
export async function issueCertificate(formData: FormData): Promise<CertificateResult> {
  const admin = await requireAdmin();
  const parsed = IssueInput.safeParse({ userId: formData.get("userId"), programId: formData.get("programId") });
  if (!parsed.success) return { ok: false, error: "Choose a person and a program." };
  const e = await eligibility(parsed.data.userId, parsed.data.programId);
  return issue(parsed.data.userId, parsed.data.programId, admin.id, e.eligible ? "completion" : "manual");
}

const RevokeInput = z.object({ reason: z.string().trim().min(5, "Say why, in a sentence.").max(300) });

/** Admin: revoke. The serial keeps resolving, and its verification page says it was revoked. */
export async function revokeCertificate(
  certificateId: string,
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const parsed = RevokeInput.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const before = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!before) return { ok: false, error: "That certificate no longer exists." };
  await prisma.certificate.update({
    where: { id: certificateId },
    data: { revokedAt: new Date(), revokeReason: parsed.data.reason },
  });
  await audit({
    actorId: admin.id,
    action: "revoke",
    entity: "Certificate",
    entityId: certificateId,
    before: { serial: before.serial },
    after: { reason: parsed.data.reason },
  });
  revalidatePath("/admin/certificates");
  revalidatePath(verifyPath(before.serial));
  return { ok: true };
}
