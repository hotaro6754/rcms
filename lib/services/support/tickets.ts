import { z } from "zod";
import type { Prisma, SupportCategory, SupportPriority, SupportStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { mask } from "@/lib/cms/screen";
import { getSetting } from "@/lib/settings";
import { nextNumber } from "@/lib/services/commerce/checkout";
import { notifyPermission, notifyUsers } from "@/lib/services/people/staff-lookup";
import type { Permission } from "@/lib/permissions";

/**
 * Learner support (blueprint §6): tickets and chat share one model. A chat is a ticket on the
 * CHAT channel whose pages poll for new messages; when nobody is available it simply stays
 * in the queue, which is the blueprint's "offline messaging".
 *
 * Every message is screened before storage: card numbers, SSNs, MBIs, dates of birth and long
 * account numbers are masked, and the sender is told. Internal notes are staff-only.
 * Agents see their own and unassigned cases; managers see everything.
 */

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  ENROLLMENT: "Enrolment",
  LOGIN_ACCESS: "Login or access",
  COURSE_NAVIGATION: "Course navigation",
  MODULE_CONTENT: "Module content",
  ASSESSMENT: "Assessment",
  CERTIFICATE: "Certificate",
  SUBSCRIPTION: "Subscription",
  PAYMENT: "Payment",
  REFUND: "Refund",
  TECHNICAL: "Technical issue",
  FACULTY: "Faculty or instructor query",
  COMPLAINT: "Complaint",
  PRIVACY_SECURITY: "Privacy or security concern",
  OTHER: "Other",
};

const ESCALATION: Record<string, { label: string; permission: Permission }> = {
  academic: { label: "Academic team", permission: "content.review.academic" },
  billing: { label: "Finance", permission: "finance.view" },
  technical: { label: "Platform administrators", permission: "settings.view" },
  security: { label: "Security and privacy", permission: "audit.view" },
};

const CLOSED: SupportStatus[] = ["RESOLVED", "CLOSED"];

function isStaffViewer(actor: Actor) {
  return can(actor, "support.view_all") || can(actor, "support.view_assigned");
}

async function load(id: string) {
  const t = await prisma.supportTicket.findUnique({ where: { id } });
  if (!t) throw new ServiceError("That case no longer exists.");
  return t;
}

/** Who may see a case: its requester, a manager, or the assigned agent (and agents for unassigned cases). */
async function assertVisible(actor: Actor, t: { requesterId: string; assigneeId: string | null }) {
  if (t.requesterId === actor.id) return "requester" as const;
  if (can(actor, "support.view_all")) return "staff" as const;
  if (can(actor, "support.view_assigned") && (t.assigneeId === actor.id || t.assigneeId === null)) return "staff" as const;
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "deny", entity: "SupportTicket", outcome: "denied" });
  throw new AuthorisationError("You do not have access to this case.", 403);
}

const OpenInput = z.object({
  subject: z.string().trim().min(4, "Give your question a short subject.").max(160),
  category: z.enum(Object.keys(CATEGORY_LABEL) as [SupportCategory, ...SupportCategory[]]),
  body: z.string().trim().min(10, "Tell us a little more.").max(5000),
  channel: z.enum(["CHAT", "TICKET"]).default("TICKET"),
});

export async function openTicket(actor: Actor, input: unknown) {
  const d = OpenInput.parse(input);
  const subject = mask(d.subject);
  const body = mask(d.body);
  const urgent = d.category === "PRIVACY_SECURITY";
  const t = await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        reference: await nextNumber(tx, "support", "SUP"),
        requesterId: actor.id,
        subject: subject.text,
        category: d.category,
        channel: d.channel,
        isComplaint: d.category === "COMPLAINT",
        priority: urgent ? "URGENT" : d.category === "COMPLAINT" ? "HIGH" : "NORMAL",
        status: urgent ? "ESCALATED" : "WAITING",
        escalatedTo: urgent ? "security" : null,
      },
    });
    await tx.supportMessage.create({ data: { ticketId: ticket.id, authorId: actor.id, body: body.text, masked: body.masked || subject.masked } });
    return ticket;
  });
  await audit({ actorId: actor.id, action: "create", entity: "SupportTicket", entityId: t.id, after: { reference: t.reference, category: t.category, channel: t.channel, masked: body.masked } });
  await notifyPermission(urgent ? "audit.view" : "support.assign", { kind: "support", title: `${urgent ? "Security concern" : "New support case"} ${t.reference}`, body: t.subject, href: `/admin/support/${t.id}` }, actor.id);
  return { ticket: t, masked: body.masked || subject.masked };
}

export async function addMessage(actor: Actor, ticketId: string, text: string, opts: { internal?: boolean; status?: SupportStatus } = {}) {
  const t = await load(ticketId);
  const as = await assertVisible(actor, t);
  const clean = mask((text ?? "").trim().slice(0, 5000));
  if (clean.text.length < 1) throw new ServiceError("Write a message.");
  if (as === "requester") {
    if (opts.internal) throw new AuthorisationError("Only staff can add internal notes.", 403);
    let status: SupportStatus = t.status;
    let reopen = 0;
    if (t.status === "CLOSED") {
      const window = 14 * 86400_000;
      if (!t.closedAt || Date.now() - +t.closedAt > window) throw new ServiceError("This case was closed more than 14 days ago. Open a new one and mention its reference.");
      status = "REOPENED";
      reopen = 1;
    } else if (t.status === "RESOLVED") {
      status = "REOPENED";
      reopen = 1;
    } else if (t.status === "PENDING_SUBSCRIBER") status = t.assigneeId ? "IN_PROGRESS" : "WAITING";
    await prisma.$transaction([
      prisma.supportMessage.create({ data: { ticketId, authorId: actor.id, body: clean.text, masked: clean.masked } }),
      prisma.supportTicket.update({ where: { id: ticketId }, data: { status, reopenCount: { increment: reopen }, resolvedAt: reopen ? null : undefined, closedAt: reopen ? null : undefined } }),
    ]);
    if (t.assigneeId) await notifyUsers([t.assigneeId], { kind: "support", title: `Reply on ${t.reference}`, href: `/admin/support/${t.id}` });
    return { masked: clean.masked };
  }
  // Staff.
  await assertCan(actor, "support.respond", { entity: "SupportTicket", id: ticketId });
  if (!can(actor, "support.view_all") && t.assigneeId !== actor.id) throw new ServiceError("Accept the case before replying to it.");
  const next: SupportStatus = opts.internal ? t.status : (opts.status ?? "PENDING_SUBSCRIBER");
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { ticketId, authorId: actor.id, body: clean.text, internal: !!opts.internal, masked: clean.masked } }),
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: next,
        ...(opts.internal || t.firstResponseAt ? {} : { firstResponseAt: new Date() }),
        ...(next === "RESOLVED" ? { resolvedAt: new Date() } : {}),
        ...(next === "CLOSED" ? { closedAt: new Date() } : {}),
      },
    }),
  ]);
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: opts.internal ? "create" : "update", entity: "SupportTicket", entityId: ticketId, after: { message: opts.internal ? "internal_note" : "reply", status: next, masked: clean.masked } });
  if (!opts.internal) await notifyUsers([t.requesterId], { kind: "support", title: `Reply on ${t.reference}: ${t.subject}`, href: `/support/${t.id}` });
  return { masked: clean.masked };
}

export async function assign(actor: Actor, ticketId: string, assigneeId: string | null) {
  const t = await load(ticketId);
  const self = assigneeId === actor.id;
  if (self && !t.assigneeId) await assertCan(actor, "support.respond", { entity: "SupportTicket", id: ticketId });
  else await assertCan(actor, "support.assign", { entity: "SupportTicket", id: ticketId });
  if (assigneeId) {
    const target = await prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true } });
    if (!target) throw new ServiceError("That person no longer exists.");
  }
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { assigneeId, status: assigneeId ? (CLOSED.includes(t.status) ? t.status : t.status === "WAITING" ? "ASSIGNED" : t.status) : "WAITING" } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "assign", entity: "SupportTicket", entityId: ticketId, after: { assigneeId } });
  if (assigneeId && assigneeId !== actor.id) await notifyUsers([assigneeId], { kind: "support", title: `${t.reference} assigned to you`, href: `/admin/support/${t.id}` });
}

/** An agent declines a case they were offered: it goes back to the queue. */
export async function decline(actor: Actor, ticketId: string, reason: string) {
  const t = await load(ticketId);
  if (t.assigneeId !== actor.id) throw new ServiceError("This case is not assigned to you.");
  if (!reason?.trim()) throw new ServiceError("Say why, for the support manager.");
  await prisma.$transaction([
    prisma.supportTicket.update({ where: { id: ticketId }, data: { assigneeId: null, status: "WAITING" } }),
    prisma.supportMessage.create({ data: { ticketId, authorId: actor.id, body: `Declined: ${mask(reason).text}`, internal: true } }),
  ]);
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "assign", entity: "SupportTicket", entityId: ticketId, after: { declined: true } });
}

const Triage = z.object({
  category: z.enum(Object.keys(CATEGORY_LABEL) as [SupportCategory, ...SupportCategory[]]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  status: z.enum(["WAITING", "ASSIGNED", "IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "ESCALATED", "RESOLVED", "CLOSED", "REOPENED"]).optional(),
  followUpAt: z.coerce.date().optional().nullable(),
  isComplaint: z.boolean().optional(),
});

export async function triage(actor: Actor, ticketId: string, input: unknown) {
  const t = await load(ticketId);
  await assertVisible(actor, t);
  await assertCan(actor, "support.respond", { entity: "SupportTicket", id: ticketId });
  if (!can(actor, "support.view_all") && t.assigneeId !== actor.id) throw new ServiceError("Accept the case first.");
  const d = Triage.parse(input);
  const data: Prisma.SupportTicketUpdateInput = { ...d };
  if (d.status === "RESOLVED" && t.status !== "RESOLVED") data.resolvedAt = new Date();
  if (d.status === "CLOSED" && t.status !== "CLOSED") data.closedAt = new Date();
  await prisma.supportTicket.update({ where: { id: ticketId }, data });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "SupportTicket", entityId: ticketId, before: { status: t.status, priority: t.priority, category: t.category }, after: d });
  if (d.status === "RESOLVED") await notifyUsers([t.requesterId], { kind: "support", title: `${t.reference} resolved — how did we do?`, href: `/support/${t.id}` });
}

export async function escalate(actor: Actor, ticketId: string, to: keyof typeof ESCALATION, note: string) {
  await assertCan(actor, "support.escalate", { entity: "SupportTicket", id: ticketId });
  const t = await load(ticketId);
  await assertVisible(actor, t);
  if (!ESCALATION[to]) throw new ServiceError("Choose who to escalate to.");
  if (!note?.trim()) throw new ServiceError("Say what you need from them.");
  await prisma.$transaction([
    prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "ESCALATED", escalatedTo: to, priority: t.priority === "LOW" || t.priority === "NORMAL" ? "HIGH" : t.priority } }),
    prisma.supportMessage.create({ data: { ticketId, authorId: actor.id, body: `Escalated to ${ESCALATION[to].label}: ${mask(note).text}`, internal: true } }),
  ]);
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "escalate", entity: "SupportTicket", entityId: ticketId, after: { to } });
  await notifyPermission(ESCALATION[to].permission, { kind: "support", title: `${t.reference} escalated to ${ESCALATION[to].label}`, body: t.subject, href: `/admin/support/${t.id}` }, actor.id);
}

export async function rate(actor: Actor, ticketId: string, rating: number, feedback?: string) {
  const t = await load(ticketId);
  if (t.requesterId !== actor.id) throw new ServiceError("Only the person who opened the case can rate it.");
  if (!CLOSED.includes(t.status)) throw new ServiceError("You can rate a case once it is resolved.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ServiceError("Choose a rating from 1 to 5.");
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { rating, feedback: feedback ? mask(feedback.slice(0, 1000)).text : null } });
  await audit({ actorId: actor.id, action: "update", entity: "SupportTicket", entityId: ticketId, after: { rating } });
}

export async function endChat(actor: Actor, ticketId: string) {
  const t = await load(ticketId);
  if (t.requesterId !== actor.id) throw new ServiceError("That case was not found.");
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: "CLOSED", closedAt: new Date() } });
  await audit({ actorId: actor.id, action: "update", entity: "SupportTicket", entityId: ticketId, after: { status: "CLOSED", by: "requester" } });
}

/** A case and its messages, as the viewer may see them (internal notes only for staff). */
export async function viewTicket(actor: Actor, ticketId: string) {
  const t = await load(ticketId);
  const as = await assertVisible(actor, t);
  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      messages: { where: as === "staff" ? {} : { internal: false }, orderBy: { createdAt: "asc" } },
    },
  });
  const authors = await prisma.user.findMany({ where: { id: { in: ticket.messages.map((m) => m.authorId) } }, select: { id: true, name: true } });
  if (as === "staff") await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "download", entity: "SupportTranscript", entityId: ticketId });
  const names: Record<string, string> = Object.fromEntries(authors.map((a) => [a.id, a.name]));
  return { ticket, as, names };
}

export async function queue(actor: Actor, f: { status?: SupportStatus; category?: SupportCategory; mine?: boolean; unassigned?: boolean; priority?: SupportPriority }) {
  if (!isStaffViewer(actor)) await assertCan(actor, "support.view_assigned");
  const scope: Prisma.SupportTicketWhereInput = can(actor, "support.view_all") ? {} : { OR: [{ assigneeId: actor.id }, { assigneeId: null }] };
  return prisma.supportTicket.findMany({
    where: {
      AND: [
        scope,
        f.status ? { status: f.status } : { status: { notIn: CLOSED } },
        f.category ? { category: f.category } : {},
        f.priority ? { priority: f.priority } : {},
        f.mine ? { assigneeId: actor.id } : {},
        f.unassigned ? { assigneeId: null } : {},
      ],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 200,
    include: { requester: { select: { name: true } }, assignee: { select: { name: true } }, _count: { select: { messages: true } } },
  });
}

// ---------------------------------------------------------------------------
// Approved responses
// ---------------------------------------------------------------------------

const TemplateInput = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(4000),
  category: z.enum(Object.keys(CATEGORY_LABEL) as [SupportCategory, ...SupportCategory[]]).optional().nullable(),
});

export async function saveTemplate(actor: Actor, id: string | null, input: unknown) {
  await assertCan(actor, "support.templates.manage");
  const d = TemplateInput.parse(input);
  const clean = { ...d, body: mask(d.body).text };
  // Any edit sends the response back for approval.
  const t = id ? await prisma.responseTemplate.update({ where: { id }, data: { ...clean, approved: false, approvedById: null } }) : await prisma.responseTemplate.create({ data: clean });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: id ? "update" : "create", entity: "ResponseTemplate", entityId: t.id, after: { title: t.title } });
  return t;
}

export async function approveTemplate(actor: Actor, id: string, approve: boolean) {
  await assertCan(actor, "support.templates.approve");
  await prisma.responseTemplate.update({ where: { id }, data: approve ? { approved: true, approvedById: actor.id } : { archivedAt: new Date() } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: approve ? "approve" : "archive", entity: "ResponseTemplate", entityId: id });
}

/** Retention: messages of cases closed longer ago than the policy are deleted; the case row stays. */
export async function purgeTranscripts(now = new Date()) {
  const days = Number(await getSetting("transcript.retentionDays"));
  const cutoff = new Date(now.getTime() - days * 86400_000);
  const old = await prisma.supportTicket.findMany({ where: { status: "CLOSED", closedAt: { lt: cutoff }, messages: { some: {} } }, select: { id: true } });
  if (!old.length) return 0;
  const res = await prisma.supportMessage.deleteMany({ where: { ticketId: { in: old.map((o) => o.id) } } });
  await audit({ action: "delete", entity: "SupportMessage", after: { retentionDays: days, cases: old.length, messages: res.count } });
  return res.count;
}

export { ESCALATION };
