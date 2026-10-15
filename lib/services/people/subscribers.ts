import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import type { AccountStatus, EnrolmentState, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { mask } from "@/lib/cms/screen";
import { sendMail } from "@/lib/email";
import { getSetting } from "@/lib/settings";
import { usableExportApproval } from "@/lib/services/approvals";
import { notifyUsers } from "./staff-lookup";

/**
 * Subscriber administration (blueprint §5): directory, profile, status, enrolments, access
 * extensions, complimentary courses, internal notes, invitations, privacy requests and
 * permitted exports. Every action is permission-checked here and audited.
 */

function log(actor: Actor, action: Parameters<typeof audit>[0]["action"], entity: string, entityId: string | null, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity, entityId, after, before });
}

/** Learner accounts: staff hold their authority through role grants on top of the base role. */
const LEARNERS_ONLY = { role: "STUDENT", staffRoles: { none: {} } } satisfies Prisma.UserWhereInput;

export interface DirectoryFilter {
  q?: string;
  status?: AccountStatus;
  courseId?: string;
  page?: number;
}

export async function directory(actor: Actor, f: DirectoryFilter) {
  await assertCan(actor, "subscriber.view");
  const where: Prisma.UserWhereInput = {
    ...LEARNERS_ONLY,
    ...(f.status ? { status: f.status } : {}),
    ...(f.courseId ? { enrolments: { some: { programId: f.courseId } } } : {}),
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }, { id: f.q }] } : {}),
  };
  const page = Math.max(1, f.page ?? 1);
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        country: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true,
        marketingOptIn: true,
        enrolments: { select: { state: true, program: { select: { name: true } } } },
        certificates: { where: { revokedAt: null }, select: { id: true } },
        subscriptions: { where: { status: { in: ["ACTIVE", "TRIALING", "GRACE_PERIOD"] } }, select: { status: true, product: { select: { name: true } } } },
        tickets: { where: { status: { notIn: ["RESOLVED", "CLOSED"] } }, select: { id: true } },
        orders: { where: { state: { in: ["FAILED", "DISPUTED"] } }, select: { id: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / 50)) };
}

export async function profile(actor: Actor, userId: string) {
  await assertCan(actor, "subscriber.view", { entity: "User", id: userId });
  const sensitive = actor.permissions.has("subscriber.view_sensitive");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      enrolments: { include: { program: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" } },
      certificates: { orderBy: { issuedAt: "desc" } },
      badges: true,
      quizAttempts: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, score: true, passed: true, status: true, attemptNo: true, submittedAt: true, quiz: { select: { title: true } } } },
      orders: { orderBy: { createdAt: "desc" }, include: { product: { select: { name: true } }, refunds: true, invoice: true } },
      subscriptions: { include: { product: { select: { name: true } } } },
      tickets: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, reference: true, subject: true, status: true, createdAt: true, category: true } },
      notesAbout: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
      consents: { orderBy: { createdAt: "desc" }, take: 20 },
      notifications: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, kind: true, title: true, createdAt: true, readAt: true } },
      orgMembers: { include: { org: { select: { id: true, name: true } } } },
      privacyRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!user) throw new ServiceError("That person no longer exists.");
  if (sensitive) await log(actor, "download", "User", userId, { viewed: "sensitive_profile" });
  return {
    ...user,
    phone: sensitive ? user.phone : user.phone ? "••••" + user.phone.slice(-2) : null,
    whatsapp: sensitive ? user.whatsapp : user.whatsapp ? "••••" + user.whatsapp.slice(-2) : null,
    lastLoginIp: sensitive ? user.lastLoginIp : null,
    sensitive,
  };
}

const STATUS_CHANGE: AccountStatus[] = ["ACTIVE", "SUSPENDED", "DEACTIVATED", "ARCHIVED", "GRACE_PERIOD", "PAYMENT_FAILED", "PAYMENT_PENDING", "TRIAL", "CANCELLED", "COMPLETED"];

export async function setStatus(actor: Actor, userId: string, status: AccountStatus, reason: string) {
  await assertCan(actor, "subscriber.suspend", { entity: "User", id: userId });
  if (!STATUS_CHANGE.includes(status)) throw new ServiceError("That status cannot be set by hand.");
  if (!reason?.trim()) throw new ServiceError("Give a reason; it is recorded.");
  if (userId === actor.id) throw new ServiceError("You cannot change your own account status.");
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, role: true, emailVerified: true, _count: { select: { staffRoles: true } } } });
  if (!before) throw new ServiceError("That person no longer exists.");
  if ((before.role !== "STUDENT" || before._count.staffRoles > 0) && !actor.staffRoles.includes("SUPER_ADMIN")) throw new ServiceError("Only a Super Administrator can change the status of staff or vendor accounts.");
  if (status === "ACTIVE" && !before.emailVerified) throw new ServiceError("This person has not verified their email yet.");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status } });
    // A blocked account loses every session at once.
    if (["SUSPENDED", "DEACTIVATED", "ARCHIVED"].includes(status)) await tx.session.deleteMany({ where: { userId } });
  });
  await log(actor, status === "SUSPENDED" ? "suspend" : status === "ACTIVE" ? "reactivate" : "update", "User", userId, { status, reason }, { status: before.status });
}

const ProfileEdit = z.object({
  name: z.string().trim().min(2).max(120),
  country: z.string().trim().max(80).optional().nullable(),
  timezone: z.string().trim().max(60).optional().nullable(),
  currentRole: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
});

export async function editProfile(actor: Actor, userId: string, input: unknown) {
  await assertCan(actor, "subscriber.edit", { entity: "User", id: userId });
  const data = ProfileEdit.parse(input);
  if (!actor.permissions.has("subscriber.view_sensitive")) delete data.phone;
  const before = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, country: true, timezone: true, currentRole: true } });
  await prisma.user.update({ where: { id: userId }, data });
  await log(actor, "update", "User", userId, { fields: Object.keys(data) }, before);
}

export async function grantEnrolment(actor: Actor, userId: string, programId: string, opts: { complimentary?: boolean; expiresAt?: Date | null } = {}) {
  await assertCan(actor, "subscriber.enrol", { entity: "User", id: userId });
  const program = await prisma.program.findUnique({ where: { id: programId }, select: { name: true, state: true } });
  if (!program) throw new ServiceError("That course no longer exists.");
  const existing = await prisma.enrolment.findUnique({ where: { userId_programId: { userId, programId } } });
  const source = opts.complimentary ? "COMPLIMENTARY" : "ADMIN";
  if (existing && (existing.state === "ACTIVE" || existing.state === "COMPLETED")) throw new ServiceError("That person is already enrolled on this course.");
  const e = existing
    ? await prisma.enrolment.update({ where: { id: existing.id }, data: { state: "ACTIVE", source, expiresAt: opts.expiresAt ?? null } })
    : await prisma.enrolment.create({ data: { userId, programId, source, expiresAt: opts.expiresAt ?? null } });
  await log(actor, "enrol", "Enrolment", e.id, { userId, programId, source, expiresAt: opts.expiresAt ?? null });
  await notifyUsers([userId], { kind: "enrolment", title: `You have access to ${program.name}`, body: "It is in your academy now.", href: "/academy" });
  return e;
}

export async function setEnrolmentState(actor: Actor, enrolmentId: string, state: EnrolmentState, reason: string) {
  await assertCan(actor, "subscriber.enrol", { entity: "Enrolment", id: enrolmentId });
  if (!reason?.trim()) throw new ServiceError("Give a reason; it is recorded.");
  if (!["ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"].includes(state)) throw new ServiceError("That state is set by the system.");
  const before = await prisma.enrolment.findUnique({ where: { id: enrolmentId } });
  if (!before) throw new ServiceError("That enrolment no longer exists.");
  await prisma.enrolment.update({ where: { id: enrolmentId }, data: { state } });
  await log(actor, state === "SUSPENDED" ? "suspend" : "update", "Enrolment", enrolmentId, { state, reason }, { state: before.state });
}

export async function extendAccess(actor: Actor, enrolmentId: string, until: Date | null, reason: string) {
  await assertCan(actor, "subscriber.enrol", { entity: "Enrolment", id: enrolmentId });
  if (!reason?.trim()) throw new ServiceError("Give a reason; it is recorded.");
  if (until && until < new Date()) throw new ServiceError("Choose a date in the future, or clear it for no expiry.");
  const before = await prisma.enrolment.findUnique({ where: { id: enrolmentId } });
  if (!before) throw new ServiceError("That enrolment no longer exists.");
  await prisma.enrolment.update({ where: { id: enrolmentId }, data: { expiresAt: until, ...(before.state === "EXPIRED" ? { state: "ACTIVE" } : {}) } });
  await log(actor, "update", "Enrolment", enrolmentId, { expiresAt: until?.toISOString() ?? null, reason, override: "access_extension" }, { expiresAt: before.expiresAt });
}

export async function addNote(actor: Actor, userId: string, body: string) {
  await assertCan(actor, "subscriber.notes", { entity: "User", id: userId });
  const text = body?.trim();
  if (!text || text.length < 3) throw new ServiceError("Write the note.");
  const clean = mask(text.slice(0, 4000));
  const note = await prisma.adminNote.create({ data: { subjectId: userId, authorId: actor.id, body: clean.text } });
  await log(actor, "create", "AdminNote", note.id, { subjectId: userId, masked: clean.masked });
  return note;
}

export async function resetAuthentication(actor: Actor, userId: string, reason: string) {
  await assertCan(actor, "subscriber.suspend", { entity: "User", id: userId });
  if (!reason?.trim()) throw new ServiceError("Give a reason; it is recorded.");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, role: true, _count: { select: { staffRoles: true } } } });
  if (!user) throw new ServiceError("That person no longer exists.");
  if (user.role !== "STUDENT" || user._count.staffRoles > 0) throw new ServiceError("Staff and vendor authentication is reset by a Super Administrator from Users and roles.");
  await prisma.$transaction([
    prisma.session.deleteMany({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } }),
  ]);
  // Lazy import: auth pulls in the Better Auth runtime, which tests of this module do not need.
  const { auth } = await import("@/lib/auth");
  await auth.api.requestPasswordReset({ body: { email: user.email, redirectTo: "/reset-password" } }).catch(() => undefined);
  await log(actor, "update", "User", userId, { resetAuthentication: true, reason });
}

export async function resendVerification(actor: Actor, userId: string) {
  await assertCan(actor, "subscriber.edit", { entity: "User", id: userId });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true } });
  if (!user) throw new ServiceError("That person no longer exists.");
  if (user.emailVerified) throw new ServiceError("This address is already verified.");
  const { auth } = await import("@/lib/auth");
  await auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: "/academy" } });
  await log(actor, "update", "User", userId, { verificationResent: true });
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function invite(actor: Actor, emails: string[], orgId: string | null) {
  await assertCan(actor, orgId ? "org.manage" : "subscriber.edit");
  const clean = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => z.string().email().safeParse(e).success))];
  if (!clean.length) throw new ServiceError("Enter at least one valid email address.");
  if (clean.length > 200) throw new ServiceError("Invite at most 200 people at a time.");
  let org: { name: string; seats: number; _count: { members: number } } | null = null;
  if (orgId) {
    org = await prisma.organisation.findUnique({ where: { id: orgId }, select: { name: true, seats: true, _count: { select: { members: true } } } });
    if (!org) throw new ServiceError("That organisation no longer exists.");
    const pending = await prisma.invitation.count({ where: { orgId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } });
    if (org._count.members + pending + clean.length > org.seats) throw new ServiceError(`That would exceed the ${org.seats} seats this account has.`);
  }
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  for (const email of clean) {
    const token = randomBytes(24).toString("base64url");
    await prisma.invitation.create({ data: { email, orgId, tokenHash: hashToken(token), invitedById: actor.id, expiresAt: new Date(Date.now() + 14 * 86400_000) } });
    await sendMail({
      to: email,
      subject: org ? `${org.name} has invited you to RCMS Operations Academy` : "You are invited to RCMS Operations Academy",
      text: [`You have been invited to RCMS Operations Academy${org ? ` by ${org.name}` : ""}.`, "", "Create your account (or sign in) from this link within 14 days:", "", `${base}/invite/${token}`].join("\n"),
    });
  }
  await log(actor, "create", "Invitation", orgId, { count: clean.length, orgId });
  return clean.length;
}

/** Called once the invited person is signed in with the invited address. */
export async function acceptInvitation(actor: Actor, token: string) {
  const inv = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!inv || inv.revokedAt || inv.acceptedAt || inv.expiresAt < new Date()) throw new ServiceError("This invitation is no longer valid. Ask for a new one.");
  if (inv.email !== actor.email.toLowerCase()) throw new ServiceError(`This invitation was sent to ${inv.email}. Sign in with that address to accept it.`);
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.invitation.updateMany({ where: { id: inv.id, acceptedAt: null }, data: { acceptedAt: new Date() } });
    if (!claimed.count) throw new ServiceError("This invitation has already been used.");
    if (inv.orgId) {
      await tx.orgMember.upsert({ where: { orgId_userId: { orgId: inv.orgId, userId: actor.id } }, create: { orgId: inv.orgId, userId: actor.id }, update: {} });
      const groups = await tx.orgGroup.findMany({ where: { orgId: inv.orgId, members: { some: { member: { userId: actor.id } } } }, select: { courses: { select: { programId: true } } } });
      for (const g of groups) for (const c of g.courses) await tx.enrolment.upsert({ where: { userId_programId: { userId: actor.id, programId: c.programId } }, create: { userId: actor.id, programId: c.programId, source: "CORPORATE", orgId: inv.orgId }, update: {} });
    }
  });
  await audit({ actorId: actor.id, action: "update", entity: "Invitation", entityId: inv.id, after: { accepted: true, orgId: inv.orgId } });
  return inv.orgId;
}

// ---------------------------------------------------------------------------
// Privacy requests (access, correction, deletion)
// ---------------------------------------------------------------------------

export async function openPrivacyRequest(actor: Actor, kind: "ACCESS" | "DELETION" | "CORRECTION", detail: string) {
  const open = await prisma.privacyRequest.count({ where: { userId: actor.id, kind, status: { in: ["OPEN", "IN_REVIEW"] } } });
  if (open) throw new ServiceError("You already have an open request of this kind.");
  const req = await prisma.privacyRequest.create({ data: { userId: actor.id, kind, detail: mask(detail?.slice(0, 2000) ?? "").text || null } });
  await audit({ actorId: actor.id, action: "request", entity: "PrivacyRequest", entityId: req.id, after: { kind } });
  return req;
}

/** Everything the platform holds about one person, as JSON, for an access request. */
export async function personalDataExport(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, createdAt: true, country: true, timezone: true, phone: true, whatsapp: true, currentRole: true, experience: true, marketingOptIn: true, termsAcceptedAt: true, status: true, lastLoginAt: true,
      enrolments: { select: { programId: true, state: true, source: true, startedAt: true, completedAt: true, expiresAt: true } },
      progress: { select: { lessonId: true, startedAt: true, completedAt: true } },
      quizAttempts: { select: { quizId: true, attemptNo: true, score: true, passed: true, submittedAt: true, answers: true } },
      certificates: { select: { serial: true, programName: true, issuedAt: true, revokedAt: true } },
      orders: { select: { id: true, number: true, amount: true, currency: true, state: true, createdAt: true } },
      tickets: { select: { reference: true, subject: true, createdAt: true, messages: { where: { internal: false }, select: { body: true, createdAt: true } } } },
      consents: { select: { kind: true, granted: true, version: true, createdAt: true } },
      notifications: { select: { title: true, createdAt: true } },
    },
  });
  return { generatedAt: new Date().toISOString(), note: "Internal administrative notes and security logs are excluded under the Academy's retention policy.", user };
}

/**
 * Deletion: the account is anonymised rather than removed. Financial records are retained
 * for statutory periods and the audit trail is append-only, so both keep pointing at an
 * account that no longer carries the person's identity.
 */
async function anonymise(userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.twoFactor.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.adminNote.deleteMany({ where: { subjectId: userId } });
    await tx.user.update({
      where: { id: userId },
      data: { name: "Deleted learner", email: `deleted-${userId}@deleted.invalid`, phone: null, whatsapp: null, currentRole: null, country: null, timezone: null, image: null, lastLoginIp: null, marketingOptIn: false, status: "ARCHIVED", emailVerified: false },
    });
    await tx.certificate.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: "Holder requested deletion of their account" } });
  });
}

export async function resolvePrivacyRequest(actor: Actor, requestId: string, outcome: "COMPLETED" | "REJECTED" | "IN_REVIEW", resolution: string) {
  await assertCan(actor, "subscriber.privacy", { entity: "PrivacyRequest", id: requestId });
  const req = await prisma.privacyRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new ServiceError("That request no longer exists.");
  if (req.status === "COMPLETED" || req.status === "REJECTED") throw new ServiceError("That request is closed.");
  if (outcome !== "IN_REVIEW" && !resolution?.trim()) throw new ServiceError("Record what was done.");
  if (outcome === "COMPLETED" && req.kind === "DELETION") {
    const openOrders = await prisma.order.count({ where: { userId: req.userId, state: { in: ["PENDING", "DISPUTED"] } } });
    if (openOrders) throw new ServiceError("Resolve the person's open or disputed orders before deleting the account.");
    await anonymise(req.userId);
  }
  await prisma.privacyRequest.update({ where: { id: requestId }, data: { status: outcome, handledById: actor.id, resolution: resolution?.trim() || null, closedAt: outcome === "IN_REVIEW" ? null : new Date() } });
  await log(actor, outcome === "COMPLETED" ? "approve" : outcome === "REJECTED" ? "reject" : "update", "PrivacyRequest", requestId, { kind: req.kind, outcome });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

function csvCell(v: unknown) {
  const s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const head = Object.keys(rows[0]);
  return [head.join(","), ...rows.map((r) => head.map((h) => csvCell(r[h])).join(","))].join("\n");
}

/**
 * The permitted subscriber export: minimum necessary fields, no phone numbers or IPs. Exports
 * above the approval threshold need an approved DATA_EXPORT request from someone else.
 */
export async function exportSubscribers(actor: Actor, f: DirectoryFilter) {
  await assertCan(actor, "subscriber.export");
  const where: Prisma.UserWhereInput = {
    ...LEARNERS_ONLY,
    ...(f.status ? { status: f.status } : {}),
    ...(f.courseId ? { enrolments: { some: { programId: f.courseId } } } : {}),
    ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }] } : {}),
  };
  const count = await prisma.user.count({ where });
  const threshold = Number(await getSetting("export.approvalThreshold"));
  if (count > threshold && !(await usableExportApproval(actor.id, "subscribers"))) {
    throw new ServiceError(`This export has ${count} rows, above the ${threshold}-row limit. Request approval for a large export first.`);
  }
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, status: true, country: true, createdAt: true, lastLoginAt: true, marketingOptIn: true, _count: { select: { enrolments: true, certificates: true } } },
  });
  await log(actor, "export", "User", null, { report: "subscribers", rows: users.length, filters: f });
  return {
    count: users.length,
    csv: toCsv(users.map((u) => ({ id: u.id, name: u.name, email: u.email, status: u.status, country: u.country, registered: u.createdAt, lastLogin: u.lastLoginAt, marketingOptIn: u.marketingOptIn, enrolments: u._count.enrolments, certificates: u._count.certificates }))),
  };
}
