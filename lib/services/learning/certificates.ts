import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { eligibility, newSerial, verifyPath } from "@/lib/certificates";
import { notifyUsers } from "@/lib/services/people/staff-lookup";

/**
 * Certificate lifecycle: claim on verified completion, manual issue by authorised staff,
 * revoke with a reason, re-issue as a new record. Revoked certificates are kept so their
 * serial keeps resolving to "revoked" on the public verification page.
 *
 * Level badges are issued automatically once a learner holds a valid certificate for every
 * released course in a level.
 */

async function issue(userId: string, programId: string, actorId: string, basis: "completion" | "manual", actorRoles: string[] = []) {
  const [user, program, active, e] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.program.findUnique({ where: { id: programId }, select: { name: true, level: true } }),
    prisma.certificate.findFirst({ where: { userId, programId, revokedAt: null } }),
    eligibility(userId, programId),
  ]);
  if (!user || !program) throw new ServiceError("That person or course no longer exists.");
  if (active) return { serial: active.serial, created: false };
  const previous = await prisma.certificate.findFirst({ where: { userId, programId }, orderBy: { issuedAt: "desc" }, select: { id: true } });
  const serial = await newSerial(program.level);
  const cert = await prisma.certificate.create({
    data: {
      serial,
      userId,
      programId,
      holderName: user.name,
      programName: program.name,
      courseVersion: e.version,
      evidence: { lessonsDone: e.lessonsDone, lessonsTotal: e.lessonsTotal, quizzesPassed: e.quizzesPassed, quizzesTotal: e.quizzesTotal, attempts: e.passedAttemptIds, eligibleAtIssue: e.eligible },
      issuedById: actorId,
      basis,
      replacesId: previous?.id ?? null,
    },
  });
  await audit({ actorId, actorRoles, action: "issue", entity: "Certificate", entityId: cert.id, after: { serial, userId, programId, basis, courseVersion: e.version } });
  await notifyUsers([userId], { kind: "certificate", title: `Your ${program.name} certificate is ready`, body: `Serial ${serial}. Anyone can verify it from the link on the certificate.`, href: verifyPath(serial) });
  return { serial, created: true };
}

/** A learner claims a certificate. The rule is checked here, never trusted from the page. */
export async function claimCertificate(actor: Actor, programId: string) {
  const enrolment = await prisma.enrolment.findUnique({ where: { userId_programId: { userId: actor.id, programId } }, select: { state: true } });
  if (!enrolment || (enrolment.state !== "ACTIVE" && enrolment.state !== "COMPLETED")) throw new ServiceError("You are not enrolled on this course.");
  const e = await eligibility(actor.id, programId);
  if (!e.eligible) throw new ServiceError("Finish every lesson and pass every assessment first.");
  const res = await issue(actor.id, programId, actor.id, "completion");
  await prisma.enrolment.update({ where: { userId_programId: { userId: actor.id, programId } }, data: { state: "COMPLETED", completedAt: new Date() } });
  await maybeAwardBadge(actor.id, programId);
  return res;
}

/** Staff: issue by hand (corporate cohorts, records from before the platform). Marked "manual" unless the rule is met. */
export async function issueCertificate(actor: Actor, userId: string, programId: string) {
  await assertCan(actor, "certificate.issue", { entity: "Certificate", id: null });
  const e = await eligibility(userId, programId);
  const res = await issue(userId, programId, actor.id, e.eligible ? "completion" : "manual", actor.staffRoles);
  await maybeAwardBadge(userId, programId);
  return res;
}

export async function revokeCertificate(actor: Actor, certificateId: string, reason: string) {
  await assertCan(actor, "certificate.revoke", { entity: "Certificate", id: certificateId });
  if (!reason || reason.trim().length < 5) throw new ServiceError("Say why, in a sentence.");
  const before = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!before) throw new ServiceError("That certificate no longer exists.");
  if (before.revokedAt) throw new ServiceError("That certificate is already revoked.");
  await prisma.certificate.update({ where: { id: certificateId }, data: { revokedAt: new Date(), revokedById: actor.id, revokeReason: reason.trim() } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "revoke", entity: "Certificate", entityId: certificateId, before: { serial: before.serial }, after: { reason: reason.trim() } });
  return before;
}

/** Re-issue after a revocation (a corrected name, say): a new serial, linked to the old record. */
export async function reissueCertificate(actor: Actor, certificateId: string) {
  await assertCan(actor, "certificate.issue", { entity: "Certificate", id: certificateId });
  const old = await prisma.certificate.findUnique({ where: { id: certificateId } });
  if (!old) throw new ServiceError("That certificate no longer exists.");
  if (!old.revokedAt) throw new ServiceError("Revoke the certificate before re-issuing it, with the reason for the change.");
  return issue(old.userId, old.programId, actor.id, old.basis === "manual" ? "manual" : "completion", actor.staffRoles);
}

async function maybeAwardBadge(userId: string, programId: string) {
  const course = await prisma.program.findUnique({ where: { id: programId }, select: { levelId: true } });
  if (!course?.levelId) return null;
  const level = await prisma.learningLevel.findUnique({ where: { id: course.levelId }, include: { courses: { where: { state: "PUBLISHED", publishedVersionId: { not: null } }, select: { id: true } } } });
  if (!level || !level.badgeName || !level.courses.length) return null;
  const held = await prisma.certificate.findMany({ where: { userId, revokedAt: null, programId: { in: level.courses.map((c) => c.id) } }, distinct: ["programId"], select: { programId: true } });
  if (held.length < level.courses.length) return null;
  const exists = await prisma.levelBadge.findUnique({ where: { userId_levelId: { userId, levelId: level.id } } });
  if (exists) return exists;
  const badge = await prisma.levelBadge.create({ data: { userId, levelId: level.id, name: level.badgeName, serial: await newSerial(`B${level.sequence}`) } });
  await audit({ actorId: userId, action: "issue", entity: "LevelBadge", entityId: badge.id, after: { level: level.name, serial: badge.serial } });
  await notifyUsers([userId], { kind: "badge", title: `You earned the ${level.badgeName}`, body: `Every ${level.name} course is complete.`, href: "/certificates" });
  return badge;
}
