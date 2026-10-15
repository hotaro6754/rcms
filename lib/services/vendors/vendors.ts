import { z } from "zod";
import type { DeliverableStatus, Prisma, VendorStatus, VendorType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { mask } from "@/lib/cms/screen";
import { DOCUMENT_TYPES, IMAGE_TYPES, saveChecked } from "@/lib/storage";
import { nextNumber } from "@/lib/services/commerce/checkout";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";

/**
 * Vendors (blueprint §7, §8.6): profiles, lifecycle, onboarding controls, documents,
 * deliverables, reviews, invoices and settlements, and the vendor portal.
 *
 * Isolation: every portal function takes the vendor from the actor's own memberships, never
 * from the request, so a vendor can only ever reach their own records. Payout details are
 * stored as a provider reference and last four digits only, changed through an approval, and
 * the person who requested or approved a payout change can never approve that vendor's
 * payments.
 */

export const LIFECYCLE: VendorStatus[] = ["PROPOSED", "DUE_DILIGENCE", "DOCUMENTS_PENDING", "UNDER_REVIEW", "APPROVED", "CONTRACTED", "ACTIVE", "PERFORMANCE_REVIEW", "RENEWAL", "OFFBOARDING", "OFFBOARDED"];

export const ONBOARDING = [
  ["identity", "Business identity verified"],
  ["contact", "Authorised contact validated"],
  ["coi", "Conflict-of-interest declaration"],
  ["nda", "Confidentiality agreement signed"],
  ["dataAccess", "Data-access assessment"],
  ["security", "Security questionnaire (where applicable)"],
  ["tax", "Tax documents collected"],
  ["contract", "Contract approved"],
  ["deliverables", "Deliverables defined"],
  ["sla", "Service-level expectations agreed"],
  ["ip", "Content ownership and IP terms"],
  ["payment", "Payment terms"],
  ["compliance", "Compliance acknowledgment"],
  ["expiry", "Access-expiry date set"],
] as const;

const TYPE_VALUES = ["CONTENT_AUTHOR", "SUBJECT_MATTER_EXPERT", "INSTRUCTOR", "VIDEO_PRODUCTION", "ASSESSMENT_DEVELOPER", "TECHNOLOGY", "MARKETING", "PAYMENT_SERVICE", "HOSTING_SUPPORT", "AFFILIATE"] as const;

function log(actor: Actor, action: Parameters<typeof audit>[0]["action"], entity: string, id: string | null, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity, entityId: id, after, before });
}

const optDate = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.date().nullable());

const VendorInput = z.object({
  legalName: z.string().trim().min(2).max(200),
  tradingName: z.string().trim().max(200).optional().nullable(),
  type: z.enum(TYPE_VALUES),
  country: z.string().trim().max(80).optional().nullable(),
  contactName: z.string().trim().max(120).optional().nullable(),
  contactEmail: z.string().trim().email().optional().nullable().or(z.literal("").transform(() => null)),
  services: z.string().trim().max(2000).optional().nullable(),
  commercialModel: z.string().trim().max(200).optional().nullable(),
  riskRating: z.enum(["low", "medium", "high"]).default("medium"),
  complianceClass: z.string().trim().max(120).optional().nullable(),
  dataAccessClass: z.enum(["none", "content_only", "learner_aggregate", "learner_personal"]).default("none"),
  contractStart: optDate.optional(),
  contractEnd: optDate.optional(),
  accessExpiresAt: optDate.optional(),
});

// ---------------------------------------------------------------------------
// Admin side
// ---------------------------------------------------------------------------

export async function createVendor(actor: Actor, input: unknown) {
  await assertCan(actor, "vendor.manage");
  const d = VendorInput.parse(input);
  const v = await prisma.$transaction(async (tx) => tx.vendor.create({ data: { ...d, code: (await nextNumber(tx, "vendor", "VEN")).replace(/^VEN-\d{4}-/, "VEN-"), contractOwnerId: actor.id, status: "PROPOSED", onboardingChecklist: {} } }));
  await log(actor, "create", "Vendor", v.id, { legalName: v.legalName, type: v.type });
  return v;
}

export async function updateVendor(actor: Actor, id: string, input: unknown) {
  await assertCan(actor, "vendor.manage");
  const d = VendorInput.parse(input);
  const before = await prisma.vendor.findUnique({ where: { id } });
  if (!before) throw new ServiceError("That vendor no longer exists.");
  await prisma.vendor.update({ where: { id }, data: d });
  await log(actor, "update", "Vendor", id, { fields: Object.keys(d) });
}

export async function setChecklist(actor: Actor, id: string, items: Record<string, boolean>) {
  await assertCan(actor, "vendor.manage");
  const clean = Object.fromEntries(ONBOARDING.map(([k]) => [k, !!items[k]]));
  await prisma.vendor.update({ where: { id }, data: { onboardingChecklist: clean } });
  await log(actor, "update", "Vendor", id, { onboardingChecklist: clean });
}

/** Lifecycle moves. Approval and later stages need approval authority and a complete onboarding checklist. */
export async function setVendorStatus(actor: Actor, id: string, status: VendorStatus, reason: string) {
  const v = await prisma.vendor.findUnique({ where: { id } });
  if (!v) throw new ServiceError("That vendor no longer exists.");
  const approving = ["APPROVED", "CONTRACTED", "ACTIVE"].includes(status) && LIFECYCLE.indexOf(v.status) < LIFECYCLE.indexOf("ACTIVE");
  await assertCan(actor, approving ? "vendor.approve" : "vendor.manage", { entity: "Vendor", id });
  if (!reason?.trim()) throw new ServiceError("Record the reason for this change.");
  if (approving) {
    const list = (v.onboardingChecklist ?? {}) as Record<string, boolean>;
    const missing = ONBOARDING.filter(([k]) => !list[k] && k !== "security").map(([, l]) => l);
    if (missing.length) throw new ServiceError(`Onboarding is incomplete: ${missing.join(", ")}.`);
    if (!v.accessExpiresAt) throw new ServiceError("Set an access-expiry date before approving.");
  }
  await prisma.vendor.update({ where: { id }, data: { status } });
  if (status === "OFFBOARDED") {
    // Offboarding ends portal access for every member immediately.
    const members = await prisma.vendorMember.findMany({ where: { vendorId: id }, select: { userId: true } });
    await prisma.session.deleteMany({ where: { userId: { in: members.map((m) => m.userId) } } });
  }
  await log(actor, approving ? "approve" : "update", "Vendor", id, { status, reason }, { status: v.status });
}

export async function linkVendorUser(actor: Actor, vendorId: string, email: string) {
  await assertCan(actor, "vendor.manage");
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { staffRoles: true, enrolments: { take: 1 } } });
  if (!user) throw new ServiceError("No account with that email. Ask the vendor contact to create one first.");
  if (user.staffRoles.length || ["OWNER", "ADMIN", "TRAINER"].includes(user.role)) throw new ServiceError("Staff accounts cannot be vendor contacts. Use a separate account.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: "VENDOR" } }),
    prisma.vendorMember.upsert({ where: { vendorId_userId: { vendorId, userId: user.id } }, create: { vendorId, userId: user.id }, update: {} }),
  ]);
  await log(actor, "assign", "VendorMember", vendorId, { userId: user.id });
}

export async function assignDeliverable(actor: Actor, vendorId: string, input: { title: string; description?: string | null; dueDate?: string | null; fee?: number; programId?: string | null }) {
  await assertCan(actor, "vendor.manage");
  const d = z.object({ title: z.string().trim().min(3).max(200), description: z.string().trim().max(4000).optional().nullable(), dueDate: optDate.optional(), fee: z.coerce.number().min(0).default(0), programId: z.string().optional().nullable() }).parse(input);
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { status: true, members: { select: { userId: true } } } });
  if (!vendor || !["CONTRACTED", "ACTIVE", "PERFORMANCE_REVIEW", "RENEWAL"].includes(vendor.status)) throw new ServiceError("Only a contracted, active vendor can be assigned work.");
  const del = await prisma.deliverable.create({ data: { vendorId, title: d.title, description: d.description ?? null, dueDate: d.dueDate ?? null, fee: Math.round(d.fee * 100), programId: d.programId || null } });
  await log(actor, "assign", "Deliverable", del.id, { vendorId, title: del.title, fee: del.fee });
  await notifyUsers(vendor.members.map((m) => m.userId), { kind: "vendor", title: `New deliverable: ${del.title}`, href: `/vendor/deliverables/${del.id}` });
  return del;
}

export async function reviewDeliverable(actor: Actor, id: string, decision: "ACCEPTED" | "CHANGES_REQUESTED" | "REJECTED", comment: string, qualityScore?: number | null) {
  await assertCan(actor, "vendor.manage", { entity: "Deliverable", id });
  const del = await prisma.deliverable.findUnique({ where: { id }, include: { vendor: { select: { members: { select: { userId: true } } } } } });
  if (!del) throw new ServiceError("That deliverable no longer exists.");
  if (del.status !== "SUBMITTED") throw new ServiceError("Only a submitted deliverable can be reviewed.");
  if (!comment?.trim()) throw new ServiceError("Leave a review comment for the vendor.");
  if (qualityScore !== null && qualityScore !== undefined && (!Number.isInteger(qualityScore) || qualityScore < 1 || qualityScore > 5)) throw new ServiceError("Quality is scored 1 to 5.");
  await prisma.$transaction([
    prisma.deliverable.update({
      where: { id },
      data: { status: decision, acceptedAt: decision === "ACCEPTED" ? new Date() : null, reworkCount: decision === "CHANGES_REQUESTED" ? { increment: 1 } : undefined, qualityScore: qualityScore ?? undefined },
    }),
    prisma.deliverableComment.create({ data: { deliverableId: id, authorId: actor.id, body: mask(comment).text } }),
  ]);
  await log(actor, decision === "ACCEPTED" ? "approve" : "reject", "Deliverable", id, { decision, qualityScore });
  await notifyUsers(del.vendor.members.map((m) => m.userId), { kind: "vendor", title: `${del.title}: ${decision.replace("_", " ").toLowerCase()}`, href: `/vendor/deliverables/${id}` });
}

/** Deliverable timeliness, acceptance, rework and quality, from stored records. */
export async function scorecard(vendorId: string) {
  const dels = await prisma.deliverable.findMany({ where: { vendorId }, select: { status: true, dueDate: true, acceptedAt: true, reworkCount: true, qualityScore: true, submissions: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } } } });
  const reviewed = dels.filter((d) => ["ACCEPTED", "REJECTED", "CHANGES_REQUESTED"].includes(d.status));
  const accepted = dels.filter((d) => d.status === "ACCEPTED");
  const dated = dels.filter((d) => d.dueDate && d.submissions[0]);
  const onTime = dated.filter((d) => d.submissions[0].createdAt <= d.dueDate!).length;
  const overdue = dels.filter((d) => d.dueDate && d.dueDate < new Date() && ["ASSIGNED", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(d.status)).length;
  const scores = dels.filter((d) => d.qualityScore).map((d) => d.qualityScore!);
  const invoices = await prisma.vendorInvoice.findMany({ where: { vendorId }, select: { status: true } });
  return {
    deliverables: dels.length,
    timeliness: dated.length ? Math.round((onTime / dated.length) * 100) : null,
    acceptance: reviewed.length ? Math.round((accepted.length / reviewed.length) * 100) : null,
    rework: dels.reduce((n, d) => n + d.reworkCount, 0),
    quality: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
    overdue,
    invoiceAccuracy: invoices.length ? Math.round((invoices.filter((i) => i.status !== "REJECTED").length / invoices.length) * 100) : null,
  };
}

// ---------------------------------------------------------------------------
// Settlements
// ---------------------------------------------------------------------------

export async function validateInvoice(actor: Actor, id: string, ok: boolean, reason?: string) {
  await assertCan(actor, "settlement.validate", { entity: "VendorInvoice", id });
  const inv = await prisma.vendorInvoice.findUnique({ where: { id }, include: { deliverable: { select: { status: true, fee: true } } } });
  if (!inv || inv.status !== "SUBMITTED") throw new ServiceError("Only a submitted invoice can be validated.");
  if (ok && inv.deliverable && inv.deliverable.status !== "ACCEPTED") throw new ServiceError("The deliverable this invoice is for has not been accepted.");
  if (ok && inv.deliverable && inv.amount > inv.deliverable.fee) throw new ServiceError("The invoice exceeds the agreed fee for the deliverable.");
  if (!ok && !reason?.trim()) throw new ServiceError("Say why the invoice is rejected; the vendor sees this.");
  await prisma.vendorInvoice.update({ where: { id }, data: ok ? { status: "VALIDATED", validatedById: actor.id } : { status: "REJECTED", rejectReason: reason!.trim() } });
  await log(actor, ok ? "approve" : "reject", "VendorInvoice", id, { stage: "validation", reason: reason ?? null });
}

/** Maker-checker on payments, plus the separation between payout changes and payment approval. */
export async function approveSettlement(actor: Actor, id: string) {
  await assertCan(actor, "settlement.approve", { entity: "VendorInvoice", id });
  const inv = await prisma.vendorInvoice.findUnique({ where: { id }, include: { vendor: true } });
  if (!inv || inv.status !== "VALIDATED") throw new ServiceError("Only a validated invoice can be approved.");
  if (inv.validatedById === actor.id) throw new ServiceError("You validated this invoice. A different person must approve the payment.");
  const payoutChange = await prisma.approvalRequest.findFirst({ where: { kind: "VENDOR_PAYOUT_CHANGE", targetId: inv.vendorId, status: "EXECUTED" }, orderBy: { executedAt: "desc" } });
  if (inv.vendor.payoutChangedById === actor.id || payoutChange?.requestedById === actor.id || payoutChange?.decidedById === actor.id) {
    await log(actor, "deny", "VendorInvoice", id, { reason: "payout_change_separation" });
    throw new ServiceError("You requested or approved this vendor's payout details, so you cannot approve its payments.");
  }
  if (!inv.vendor.payoutReference) throw new ServiceError("This vendor has no approved payout details yet.");
  await prisma.vendorInvoice.update({ where: { id }, data: { status: "APPROVED", approvedById: actor.id } });
  await log(actor, "approve", "VendorInvoice", id, { stage: "payment_approval", amount: inv.amount });
  await notifyPermission("settlement.pay", { kind: "settlement", title: `Vendor payment approved: ${inv.vendor.legalName}`, href: "/admin/finance/settlements" }, actor.id);
}

export async function recordSettlementPayment(actor: Actor, id: string, paymentRef: string) {
  await assertCan(actor, "settlement.pay", { entity: "VendorInvoice", id });
  const inv = await prisma.vendorInvoice.findUnique({ where: { id }, include: { vendor: { select: { members: { select: { userId: true } } } } } });
  if (!inv || !["APPROVED", "PAYMENT_INITIATED"].includes(inv.status)) throw new ServiceError("Only an approved invoice can be paid.");
  if (inv.approvedById === actor.id) throw new ServiceError("You approved this payment. A different person must record that it was made.");
  if (!/^[A-Za-z0-9_\-/.]{4,80}$/.test(paymentRef ?? "")) throw new ServiceError("Enter the bank or payout transaction reference.");
  await prisma.vendorInvoice.update({ where: { id }, data: { status: "PAID", paidById: actor.id, paidAt: new Date(), paymentRef } });
  await log(actor, "payment", "VendorInvoice", id, { paymentRef });
  await notifyUsers(inv.vendor.members.map((m) => m.userId), { kind: "vendor", title: `Invoice ${inv.number} paid`, href: "/vendor/invoices" });
}

export async function reconcileSettlement(actor: Actor, id: string) {
  await assertCan(actor, "payment.reconcile", { entity: "VendorInvoice", id });
  const res = await prisma.vendorInvoice.updateMany({ where: { id, status: "PAID" }, data: { status: "RECONCILED" } });
  if (!res.count) throw new ServiceError("Only a paid invoice can be reconciled.");
  await log(actor, "reconcile", "VendorInvoice", id);
}

// ---------------------------------------------------------------------------
// Vendor portal (members only, scoped by membership)
// ---------------------------------------------------------------------------

async function portalVendor(actor: Actor, vendorId?: string) {
  const id = vendorId ?? actor.vendorIds[0];
  if (!id || !actor.vendorIds.includes(id)) throw new AuthorisationError("You are not a contact for this vendor.", 403);
  const v = await prisma.vendor.findUnique({ where: { id } });
  if (!v || v.status === "OFFBOARDED" || (v.accessExpiresAt && v.accessExpiresAt < new Date())) throw new AuthorisationError("Vendor portal access has ended. Contact your vendor manager.", 403);
  return v;
}

async function portalDeliverableOf(actor: Actor, deliverableId: string) {
  const del = await prisma.deliverable.findUnique({ where: { id: deliverableId } });
  if (!del || !actor.vendorIds.includes(del.vendorId)) {
    await audit({ actorId: actor.id, action: "deny", entity: "Deliverable", entityId: deliverableId, outcome: "denied" });
    throw new AuthorisationError("That deliverable was not found.", 403);
  }
  await portalVendor(actor, del.vendorId);
  return del;
}

export async function portalOverview(actor: Actor) {
  const v = await portalVendor(actor);
  const [deliverables, invoices, documents] = await Promise.all([
    prisma.deliverable.findMany({ where: { vendorId: v.id }, orderBy: [{ status: "asc" }, { dueDate: "asc" }], select: { id: true, title: true, status: true, dueDate: true, fee: true, program: { select: { name: true } } } }),
    prisma.vendorInvoice.findMany({ where: { vendorId: v.id }, orderBy: { createdAt: "desc" }, select: { id: true, number: true, amount: true, status: true, createdAt: true, paidAt: true, rejectReason: true, deliverable: { select: { title: true } } } }),
    prisma.vendorDocument.findMany({ where: { vendorId: v.id, visibleToVendor: true }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, kind: true, expiresAt: true, createdAt: true } }),
  ]);
  return { vendor: { id: v.id, code: v.code, legalName: v.legalName, tradingName: v.tradingName, status: v.status, contactName: v.contactName, contactEmail: v.contactEmail, services: v.services, contractStart: v.contractStart, contractEnd: v.contractEnd, payoutLast4: v.payoutLast4 }, deliverables, invoices, documents };
}

export async function portalDeliverable(actor: Actor, id: string) {
  await portalDeliverableOf(actor, id);
  const del = await prisma.deliverable.findUniqueOrThrow({
    where: { id },
    include: { program: { select: { name: true } }, submissions: { orderBy: { createdAt: "desc" } }, comments: { orderBy: { createdAt: "asc" } } },
  });
  const authors = await prisma.user.findMany({ where: { id: { in: del.comments.map((c) => c.authorId) } }, select: { id: true, name: true } });
  return { del, names: Object.fromEntries(authors.map((a) => [a.id, a.name])) as Record<string, string> };
}

export async function submitDeliverable(actor: Actor, id: string, input: { note?: string; link?: string }, file?: File | null) {
  const del = await portalDeliverableOf(actor, id);
  if (!["ASSIGNED", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(del.status)) throw new ServiceError("This deliverable is not open for submission.");
  const link = input.link?.trim() || null;
  if (link && !link.startsWith("https://")) throw new ServiceError("Links must start with https://.");
  let stored: { fileKey: string; fileName: string; mimeType: string } | null = null;
  if (file && file.size) {
    try {
      stored = await saveChecked("deliverables", file, new Set([...DOCUMENT_TYPES, ...IMAGE_TYPES]));
    } catch (e) {
      throw new ServiceError(e instanceof Error ? e.message : "That upload was refused.");
    }
  }
  if (!stored && !link && !input.note?.trim()) throw new ServiceError("Attach a file, a link or a note.");
  await prisma.$transaction([
    prisma.deliverableSubmission.create({ data: { deliverableId: id, submittedById: actor.id, note: input.note ? mask(input.note).text : null, link, fileKey: stored?.fileKey ?? null, fileName: stored?.fileName ?? null, mimeType: stored?.mimeType ?? null } }),
    prisma.deliverable.update({ where: { id }, data: { status: "SUBMITTED" } }),
  ]);
  await audit({ actorId: actor.id, action: "submit", entity: "Deliverable", entityId: id, after: { file: !!stored, link: !!link } });
  await notifyPermission("vendor.manage", { kind: "vendor", title: `Deliverable submitted: ${del.title}`, href: `/admin/vendors/${del.vendorId}` }, actor.id);
}

export async function commentDeliverable(actor: Actor, id: string, body: string) {
  const isStaff = can(actor, "vendor.manage");
  if (!isStaff) await portalDeliverableOf(actor, id);
  if (!body?.trim()) throw new ServiceError("Write a comment.");
  await prisma.deliverableComment.create({ data: { deliverableId: id, authorId: actor.id, body: mask(body.slice(0, 4000)).text } });
  await audit({ actorId: actor.id, action: "create", entity: "DeliverableComment", entityId: id });
}

export async function submitInvoice(actor: Actor, input: { number: string; amount: number; deliverableId?: string | null; note?: string | null }) {
  const v = await portalVendor(actor);
  const d = z.object({ number: z.string().trim().min(2).max(60), amount: z.coerce.number().min(1), deliverableId: z.string().optional().nullable(), note: z.string().max(1000).optional().nullable() }).parse(input);
  if (d.deliverableId) {
    const del = await portalDeliverableOf(actor, d.deliverableId);
    if (del.status !== "ACCEPTED") throw new ServiceError("Invoice a deliverable after it has been accepted.");
  }
  const inv = await prisma.vendorInvoice
    .create({ data: { vendorId: v.id, number: d.number, amount: Math.round(d.amount * 100), deliverableId: d.deliverableId || null, note: d.note ? mask(d.note).text : null, submittedById: actor.id } })
    .catch(() => {
      throw new ServiceError("You have already submitted an invoice with that number.");
    });
  await audit({ actorId: actor.id, action: "create", entity: "VendorInvoice", entityId: inv.id, after: { amount: inv.amount } });
  await notifyPermission("settlement.validate", { kind: "settlement", title: `Vendor invoice ${inv.number} submitted`, href: "/admin/finance/settlements" }, actor.id);
  return inv;
}

export async function updatePortalProfile(actor: Actor, input: { contactName?: string; contactEmail?: string; services?: string }) {
  const v = await portalVendor(actor);
  const d = z.object({ contactName: z.string().trim().min(2).max(120), contactEmail: z.string().trim().email(), services: z.string().trim().max(2000).optional() }).parse(input);
  await prisma.vendor.update({ where: { id: v.id }, data: d });
  await audit({ actorId: actor.id, action: "update", entity: "Vendor", entityId: v.id, after: { fields: Object.keys(d), via: "portal" } });
}

/** A vendor asks to change payout details; an independent finance reviewer must approve it. */
export async function requestPayoutChangeAsVendor(actor: Actor, input: { payoutReference: string; payoutLast4: string; taxIdLast4?: string | null; reason: string }) {
  const v = await portalVendor(actor);
  const p = z.object({ payoutReference: z.string().trim().min(3).max(120), payoutLast4: z.string().regex(/^\d{4}$/, "Enter only the last four digits."), taxIdLast4: z.string().regex(/^[A-Za-z0-9]{4}$/).optional().nullable(), reason: z.string().trim().min(5) }).parse(input);
  const pending = await prisma.approvalRequest.findFirst({ where: { kind: "VENDOR_PAYOUT_CHANGE", targetId: v.id, status: "PENDING" } });
  if (pending) throw new ServiceError("A payout change is already waiting for approval.");
  const req = await prisma.approvalRequest.create({
    data: { kind: "VENDOR_PAYOUT_CHANGE", targetType: "Vendor", targetId: v.id, summary: `${v.legalName}: payout reference ending ${p.payoutLast4} (requested by the vendor)`, payload: { vendorId: v.id, payoutReference: p.payoutReference, payoutLast4: p.payoutLast4, taxIdLast4: p.taxIdLast4 ?? null }, reason: p.reason, requestedById: actor.id },
  });
  await audit({ actorId: actor.id, action: "request", entity: "ApprovalRequest", entityId: req.id, after: { kind: "VENDOR_PAYOUT_CHANGE", vendorId: v.id } });
  await notifyPermission("vendor.payout.approve", { kind: "approval", title: "Vendor payout change awaiting approval", body: req.summary, href: "/admin/approvals" }, actor.id);
}

export async function uploadVendorDocument(actor: Actor, vendorId: string, input: { title: string; kind: string; expiresAt?: string | null; visibleToVendor?: boolean }, file: File) {
  const staff = can(actor, "vendor.manage");
  if (!staff) await portalVendor(actor, vendorId);
  const d = z.object({ title: z.string().trim().min(2).max(160), kind: z.enum(["contract", "nda", "tax", "insurance", "security", "coi", "other"]), expiresAt: optDate.optional() }).parse(input);
  let stored;
  try {
    stored = await saveChecked("vendor", file, new Set([...DOCUMENT_TYPES, ...IMAGE_TYPES]));
  } catch (e) {
    throw new ServiceError(e instanceof Error ? e.message : "That upload was refused.");
  }
  const doc = await prisma.vendorDocument.create({ data: { vendorId, title: d.title, kind: d.kind, expiresAt: d.expiresAt ?? null, fileKey: stored.fileKey, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes, uploadedById: actor.id, visibleToVendor: staff ? input.visibleToVendor !== false : true } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "VendorDocument", entityId: doc.id, after: { vendorId, kind: d.kind } });
  return doc;
}

/** Download check for vendor documents and deliverable files. */
export async function canReadVendorFile(actor: Actor, vendorId: string, visibleToVendor = true) {
  if (can(actor, "vendor.view")) return true;
  return visibleToVendor && actor.vendorIds.includes(vendorId);
}

export const VENDOR_TYPES = TYPE_VALUES as readonly VendorType[];
export type { DeliverableStatus, Prisma };
