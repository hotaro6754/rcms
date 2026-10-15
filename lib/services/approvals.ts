import { z } from "zod";
import type { ApprovalKind, ApprovalRequest, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, loadActor, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { canRequestRole, STAFF_ROLES, type Permission, type StaffRoleName } from "@/lib/permissions";
import { validateSetting } from "@/lib/settings";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";

/**
 * Maker-checker (blueprint §3.4 and §13). One person asks; a different person with the
 * approving authority decides; approval executes the change in the same transaction that
 * records the decision. Neither half can be done by the same person, and the requester can
 * never approve their own request, whatever roles they hold.
 */

type Handler = {
  request: Permission;
  approve: Permission;
  label: string;
  /** Validates the payload at request time and returns the summary shown to approvers. */
  prepare: (actor: Actor, payload: unknown) => Promise<{ payload: Prisma.InputJsonValue; summary: string; targetType: string; targetId: string | null }>;
  /** Checks specific to the approver (beyond the permission). */
  checkApprover?: (approver: Actor, req: ApprovalRequest) => Promise<void>;
  /** Applies the change. Runs inside the decision's transaction. */
  execute?: (tx: Prisma.TransactionClient, req: ApprovalRequest, approver: Actor) => Promise<void>;
  /** Changes that wait for an effective date are executed later by runDueApprovals. */
  dueAt?: (req: ApprovalRequest) => Date | null;
};

const RoleChange = z.object({ userId: z.string().min(1), role: z.enum(STAFF_ROLES), action: z.enum(["grant", "revoke"]) });
const PriceChange = z.object({ productId: z.string().min(1), amount: z.coerce.number().int().min(0).max(100_000_000), effectiveFrom: z.coerce.date() });
const PayoutChange = z.object({
  vendorId: z.string().min(1),
  payoutReference: z.string().trim().min(3, "Enter the payout reference from the payment provider.").max(120),
  payoutLast4: z.string().trim().regex(/^\d{4}$/, "Enter only the last four digits of the account."),
  taxIdLast4: z.string().trim().regex(/^[A-Z0-9]{4}$/i, "Enter only the last four characters of the tax ID.").optional().nullable(),
});
const DataExport = z.object({ report: z.string().min(1), filters: z.record(z.string(), z.string()).default({}), rowCount: z.number().int().min(0) });
const CourseDelete = z.object({ courseId: z.string().min(1) });
const SettingChange = z.object({ key: z.string().min(1), value: z.union([z.string(), z.number()]) });
const ProgressReset = z.object({ userId: z.string().min(1), programId: z.string().min(1) });

export const HANDLERS: Record<ApprovalKind, Handler> = {
  ROLE_CHANGE: {
    request: "roles.request",
    approve: "roles.approve",
    label: "Administrator role change",
    async prepare(actor, raw) {
      const p = RoleChange.parse(raw);
      if (!canRequestRole(actor.staffRoles, p.role as StaffRoleName)) throw new ServiceError("Only a Super Administrator can propose granting Super Administrator.");
      if (p.userId === actor.id) throw new ServiceError("You cannot request a change to your own roles.");
      const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { name: true, email: true, role: true, staffRoles: { select: { role: true } } } });
      if (!user) throw new ServiceError("That person no longer exists.");
      if (user.role === "VENDOR") throw new ServiceError("Vendor accounts cannot hold staff roles.");
      const has = user.staffRoles.some((r) => r.role === p.role);
      if (p.action === "grant" && has) throw new ServiceError("They already hold that role.");
      if (p.action === "revoke" && !has) throw new ServiceError("They do not hold that role as an explicit grant.");
      return { payload: p, summary: `${p.action === "grant" ? "Grant" : "Remove"} ${p.role.replace(/_/g, " ").toLowerCase()} ${p.action === "grant" ? "to" : "from"} ${user.name} (${user.email})`, targetType: "User", targetId: p.userId };
    },
    async checkApprover(approver, req) {
      const p = RoleChange.parse(req.payload);
      if (p.userId === approver.id) throw new ServiceError("You cannot approve a change to your own roles.");
      if (p.role === "SUPER_ADMIN" && !approver.staffRoles.includes("SUPER_ADMIN")) throw new ServiceError("Only a Super Administrator can approve granting Super Administrator.");
    },
    async execute(tx, req, approver) {
      const p = RoleChange.parse(req.payload);
      if (p.action === "grant") {
        await tx.staffRoleAssignment.upsert({
          where: { userId_role: { userId: p.userId, role: p.role } },
          create: { userId: p.userId, role: p.role, grantedById: req.requestedById, approvedById: approver.id },
          update: {},
        });
      } else {
        if (p.role === "SUPER_ADMIN") {
          const others = await tx.user.count({ where: { id: { not: p.userId }, OR: [{ role: "OWNER" }, { staffRoles: { some: { role: "SUPER_ADMIN" } } }] } });
          if (!others) throw new ServiceError("This would leave the platform without a Super Administrator.");
        }
        await tx.staffRoleAssignment.deleteMany({ where: { userId: p.userId, role: p.role } });
      }
      // Ending their sessions makes the new authority take effect on the next sign-in for
      // anything cached client-side; server checks already read roles fresh.
      if (p.action === "revoke") await tx.session.deleteMany({ where: { userId: p.userId } });
    },
  },

  PRICE_CHANGE: {
    request: "price.request",
    approve: "price.approve",
    label: "Price change",
    async prepare(_actor, raw) {
      const p = PriceChange.parse(raw);
      const product = await prisma.product.findUnique({ where: { id: p.productId }, select: { name: true, amount: true } });
      if (!product) throw new ServiceError("That product no longer exists.");
      if (product.amount === p.amount) throw new ServiceError("That is already the price.");
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      if (p.effectiveFrom < day) throw new ServiceError("The effective date cannot be in the past.");
      return {
        payload: { ...p, effectiveFrom: p.effectiveFrom.toISOString(), previous: product.amount },
        summary: `${product.name}: ₹${(product.amount / 100).toLocaleString("en-IN")} → ₹${(p.amount / 100).toLocaleString("en-IN")} from ${p.effectiveFrom.toDateString()}`,
        targetType: "Product",
        targetId: p.productId,
      };
    },
    dueAt: (req) => new Date((req.payload as { effectiveFrom: string }).effectiveFrom),
    async execute(tx, req) {
      const p = PriceChange.parse(req.payload);
      await tx.product.update({ where: { id: p.productId }, data: { amount: p.amount } });
    },
  },

  VENDOR_PAYOUT_CHANGE: {
    request: "vendor.payout.request",
    approve: "vendor.payout.approve",
    label: "Vendor payout details change",
    async prepare(_actor, raw) {
      const p = PayoutChange.parse(raw);
      const vendor = await prisma.vendor.findUnique({ where: { id: p.vendorId }, select: { legalName: true } });
      if (!vendor) throw new ServiceError("That vendor no longer exists.");
      return { payload: p, summary: `${vendor.legalName}: payout reference ending ${p.payoutLast4}`, targetType: "Vendor", targetId: p.vendorId };
    },
    async execute(tx, req) {
      const p = PayoutChange.parse(req.payload);
      await tx.vendor.update({
        where: { id: p.vendorId },
        data: { payoutReference: p.payoutReference, payoutLast4: p.payoutLast4, taxIdLast4: p.taxIdLast4 ?? null, payoutChangedById: req.requestedById, payoutChangedAt: new Date() },
      });
    },
  },

  DATA_EXPORT: {
    request: "subscriber.export",
    approve: "subscriber.privacy",
    label: "Large subscriber export",
    async prepare(_actor, raw) {
      const p = DataExport.parse(raw);
      return { payload: p, summary: `Export ${p.rowCount} rows of ${p.report}`, targetType: "Export", targetId: p.report };
    },
  },

  COURSE_DELETE: {
    request: "content.delete",
    approve: "settings.approve",
    label: "Permanent course deletion",
    async prepare(_actor, raw) {
      const p = CourseDelete.parse(raw);
      const blockers = await courseDeletionBlockers(prisma, p.courseId);
      if (blockers.length) throw new ServiceError(blockers.join(" "));
      const course = await prisma.program.findUniqueOrThrow({ where: { id: p.courseId }, select: { name: true } });
      return { payload: p, summary: `Permanently delete the draft course “${course.name}”`, targetType: "Course", targetId: p.courseId };
    },
    async execute(tx, req) {
      const p = CourseDelete.parse(req.payload);
      const blockers = await courseDeletionBlockers(tx, p.courseId);
      if (blockers.length) throw new ServiceError(blockers.join(" "));
      const lessons = await tx.lesson.findMany({ where: { module: { programId: p.courseId } }, select: { id: true } });
      for (const l of lessons) {
        const quizzes = await tx.quiz.findMany({ where: { lessonId: l.id }, select: { id: true } });
        for (const q of quizzes) {
          await tx.quizQuestion.deleteMany({ where: { quizId: q.id } });
          await tx.quiz.delete({ where: { id: q.id } });
        }
        await tx.contentBlock.deleteMany({ where: { lessonId: l.id } });
        await tx.resource.deleteMany({ where: { lessonId: l.id } });
        await tx.lesson.delete({ where: { id: l.id } });
      }
      await tx.module.deleteMany({ where: { programId: p.courseId } });
      await tx.reviewDecision.deleteMany({ where: { courseId: p.courseId } });
      await tx.product.deleteMany({ where: { programId: p.courseId, orders: { none: {} } } });
      await tx.program.delete({ where: { id: p.courseId } });
    },
  },

  SECURITY_SETTING: {
    request: "settings.request",
    approve: "settings.approve",
    label: "System configuration change",
    async prepare(_actor, raw) {
      const p = SettingChange.parse(raw);
      const v = validateSetting(p.key, p.value);
      if (!v.ok) throw new ServiceError(v.error);
      return { payload: { key: p.key, value: v.value }, summary: `Set ${p.key} to ${v.value}`, targetType: "Setting", targetId: p.key };
    },
    async execute(tx, req) {
      const p = SettingChange.parse(req.payload);
      await tx.setting.upsert({ where: { key: p.key }, create: { key: p.key, value: p.value }, update: { value: p.value } });
    },
  },

  PROGRESS_RESET: {
    request: "subscriber.progress_reset",
    approve: "subscriber.privacy",
    label: "Course progress reset",
    async prepare(_actor, raw) {
      const p = ProgressReset.parse(raw);
      const [user, course] = await Promise.all([
        prisma.user.findUnique({ where: { id: p.userId }, select: { name: true } }),
        prisma.program.findUnique({ where: { id: p.programId }, select: { name: true } }),
      ]);
      if (!user || !course) throw new ServiceError("That person or course no longer exists.");
      return { payload: p, summary: `Reset ${user.name}'s progress in ${course.name}`, targetType: "User", targetId: p.userId };
    },
    async execute(tx, req) {
      const p = ProgressReset.parse(req.payload);
      // Assessment attempts are evidence and are kept; only lesson completion is cleared.
      await tx.progress.deleteMany({ where: { userId: p.userId, lesson: { module: { programId: p.programId } } } });
    },
  },
};

async function courseDeletionBlockers(tx: Prisma.TransactionClient | typeof prisma, courseId: string) {
  const c = await tx.program.findUnique({
    where: { id: courseId },
    select: { _count: { select: { versions: true, enrolments: true, certificates: true, deliverables: true } } },
  });
  if (!c) return ["That course no longer exists."];
  const out: string[] = [];
  if (c._count.versions) out.push("It has been released; archive it instead.");
  if (c._count.enrolments) out.push("Learners are or were enrolled; archive it instead.");
  if (c._count.certificates) out.push("Certificates were issued against it; archive it instead.");
  if (c._count.deliverables) out.push("Vendor deliverables reference it.");
  const orders = await tx.order.count({ where: { product: { programId: courseId } } });
  if (orders) out.push("Orders reference it; financial records are retained.");
  return out;
}

export async function requestApproval(actor: Actor, kind: ApprovalKind, payload: unknown, reason: string) {
  const h = HANDLERS[kind];
  await assertCan(actor, h.request, { entity: "ApprovalRequest" });
  if (!reason?.trim() || reason.trim().length < 5) throw new ServiceError("Give a reason the approver can check.");
  const prepared = await h.prepare(actor, payload);
  const dup = await prisma.approvalRequest.findFirst({ where: { kind, status: "PENDING", targetType: prepared.targetType, targetId: prepared.targetId } });
  if (dup && kind !== "DATA_EXPORT") throw new ServiceError("There is already a pending request for this. Decide or cancel it first.");
  const req = await prisma.approvalRequest.create({
    data: { kind, payload: prepared.payload, summary: prepared.summary, targetType: prepared.targetType, targetId: prepared.targetId, reason: reason.trim(), requestedById: actor.id },
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "request", entity: "ApprovalRequest", entityId: req.id, after: { kind, summary: req.summary } });
  await notifyPermission(h.approve, { kind: "approval", title: `${h.label} awaiting approval`, body: req.summary, href: "/admin/approvals" }, actor.id);
  return req;
}

export async function decideApproval(actor: Actor, requestId: string, approve: boolean, note?: string) {
  const req = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new ServiceError("That request no longer exists.");
  const h = HANDLERS[req.kind];
  await assertCan(actor, h.approve, { entity: "ApprovalRequest", id: requestId });
  if (req.status !== "PENDING") throw new ServiceError("That request has already been decided.");
  if (req.requestedById === actor.id) throw new ServiceError("You made this request. A different person must decide it.");
  if (!approve && !note?.trim()) throw new ServiceError("Say why you are rejecting it.");
  if (approve && h.checkApprover) await h.checkApprover(actor, req);

  const due = approve && h.dueAt ? h.dueAt(req) : null;
  const executeNow = approve && (!due || due <= new Date());
  let failure: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.approvalRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: { status: !approve ? "REJECTED" : executeNow ? "EXECUTED" : "APPROVED", decidedById: actor.id, decidedAt: new Date(), decisionNote: note?.trim() || null, executedAt: executeNow ? new Date() : null },
      });
      if (claimed.count === 0) throw new ServiceError("Someone else decided this request first.");
      if (executeNow && h.execute) await h.execute(tx, req, actor);
    });
  } catch (error) {
    if (!(error instanceof ServiceError)) throw error;
    if (error.message.startsWith("Someone else")) throw error;
    failure = error.message;
    await prisma.approvalRequest.update({ where: { id: requestId }, data: { status: "FAILED", decidedById: actor.id, decidedAt: new Date(), failure } });
  }
  await audit({
    actorId: actor.id,
    actorRoles: actor.staffRoles,
    action: approve ? "approve" : "reject",
    entity: "ApprovalRequest",
    entityId: requestId,
    outcome: failure ? "failure" : "success",
    after: { kind: req.kind, summary: req.summary, executed: executeNow && !failure, failure, note: note ?? null },
  });
  await notifyUsers([req.requestedById], { kind: "approval", title: `${h.label} ${failure ? "failed" : approve ? "approved" : "rejected"}`, body: failure ?? note ?? req.summary, href: "/admin/approvals" });
  if (failure) throw new ServiceError(`Approved, but the change could not be applied: ${failure}`);
}

export async function cancelApproval(actor: Actor, requestId: string) {
  const req = await prisma.approvalRequest.findUnique({ where: { id: requestId } });
  if (!req || req.requestedById !== actor.id) throw new ServiceError("Only the person who made a request can cancel it.");
  const res = await prisma.approvalRequest.updateMany({ where: { id: requestId, status: "PENDING" }, data: { status: "CANCELLED", decidedAt: new Date() } });
  if (!res.count) throw new ServiceError("That request has already been decided.");
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "ApprovalRequest", entityId: requestId, after: { status: "CANCELLED" } });
}

/** Executes approved changes whose effective date has arrived (scheduled price changes). */
export async function runDueApprovals(now = new Date()) {
  const pending = await prisma.approvalRequest.findMany({ where: { status: "APPROVED" } });
  for (const req of pending) {
    const h = HANDLERS[req.kind];
    const due = h.dueAt?.(req);
    if (!h.execute || (due && due > now)) continue;
    const approver = req.decidedById ? await loadActor(req.decidedById) : null;
    if (!approver) continue;
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.approvalRequest.updateMany({ where: { id: req.id, status: "APPROVED" }, data: { status: "EXECUTED", executedAt: now } });
        if (claimed.count) await h.execute!(tx, req, approver);
      });
      await audit({ action: "update", entity: "ApprovalRequest", entityId: req.id, after: { executed: true, via: "schedule", kind: req.kind } });
    } catch (error) {
      await prisma.approvalRequest.update({ where: { id: req.id }, data: { status: "FAILED", failure: error instanceof Error ? error.message : String(error) } });
    }
  }
}

/** An executed export approval the requester may still use (24 hours). */
export async function usableExportApproval(actorId: string, report: string) {
  return prisma.approvalRequest.findFirst({
    where: { kind: "DATA_EXPORT", status: "EXECUTED", requestedById: actorId, targetId: report, executedAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
    orderBy: { executedAt: "desc" },
  });
}

export const APPROVAL_LABEL = Object.fromEntries(Object.entries(HANDLERS).map(([k, h]) => [k, h.label])) as Record<ApprovalKind, string>;
