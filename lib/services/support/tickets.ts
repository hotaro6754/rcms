import { z } from "zod";
import type { Prisma, SupportCategory, SupportPriority, SupportStatus, TicketSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { mask } from "@/lib/cms/screen";
import { getSetting } from "@/lib/settings";
import { nextNumber } from "@/lib/services/commerce/checkout";
import { notifyPermission, notifyUsers, usersWithPermission } from "@/lib/services/people/staff-lookup";
import { DOCUMENT_TYPES, IMAGE_TYPES, saveChecked } from "@/lib/storage";
import type { Permission } from "@/lib/permissions";
import { AUTO_CLOSE_DAYS, bumpPriority, canStaffMove, DONE_STATUSES, higherPriority, matrixPriority, OPEN_STATUSES, REOPEN_WINDOW_DAYS, STATUS_LABEL } from "@/lib/support/states";
import { autoAssign, categorySetting, dueTimes, recordEvent, routeTeam } from "./routing";

/**
 * Learner support (blueprint §6): tickets and chat share one model. A chat is a ticket on the
 * CHAT channel whose pages poll for new messages.
 *
 * A case is routed to a team when it is opened and, if the team assigns automatically, to its
 * least-loaded available member (lib/services/support/routing.ts). Statuses move only along the
 * edges in lib/support/states.ts. First-response and resolution targets come from the priority's
 * SLA policy and the support calendar; a scheduled job warns before and records breaches after.
 * Every move is written to the case history (SupportTicketEvent) and the audit log.
 *
 * Every message is screened before storage: card numbers, SSNs, MBIs, dates of birth and long
 * account numbers are masked, and the sender is told. Internal notes and the case history are
 * staff-only.
 */

export const CATEGORY_LABEL: Record<SupportCategory, string> = {
  ENROLLMENT: "Enrolment and access",
  LOGIN_ACCESS: "Account and login",
  COURSE_NAVIGATION: "Course navigation",
  MODULE_CONTENT: "Course content",
  ASSESSMENT: "Assessment and grading",
  CERTIFICATE: "Certificate and credential",
  SUBSCRIPTION: "Billing and subscription",
  PAYMENT: "Payment",
  REFUND: "Refund",
  TECHNICAL: "Technical issue",
  FACULTY: "Faculty or instructor query",
  COMPLAINT: "Complaint",
  PRIVACY_SECURITY: "Privacy or security concern",
  OTHER: "Other",
};

const CATEGORIES = Object.keys(CATEGORY_LABEL) as [SupportCategory, ...SupportCategory[]];

const ESCALATION: Record<string, { label: string; permission: Permission }> = {
  academic: { label: "Academic team", permission: "content.review.academic" },
  billing: { label: "Finance", permission: "finance.view" },
  technical: { label: "Platform administrators", permission: "settings.view" },
  security: { label: "Security and privacy", permission: "audit.view" },
};

/** Categories as learners see them: configured labels, inactive ones hidden. */
export async function categoryOptions() {
  const settings = await prisma.supportCategorySetting.findMany();
  return CATEGORIES.map((c) => {
    const s = settings.find((x) => x.category === c);
    return { value: c, label: s?.label || CATEGORY_LABEL[c], description: s?.description ?? null, active: s?.active ?? true };
  }).filter((c) => c.active);
}

async function load(id: string) {
  const t = await prisma.supportTicket.findUnique({ where: { id } });
  if (!t) throw new ServiceError("That case no longer exists.");
  return t;
}

async function teamIdsOf(userId: string) {
  return (await prisma.supportTeamMember.findMany({ where: { userId }, select: { teamId: true } })).map((m) => m.teamId);
}

/**
 * Who may see a case: its requester; a manager (view_all); an agent who is assigned to it, or for
 * unassigned cases, a member of its team (or anyone with view_assigned if it has no team).
 */
export async function assertVisible(actor: Actor, t: { id?: string; requesterId: string; assigneeId: string | null; teamId?: string | null }) {
  if (t.requesterId === actor.id) return "requester" as const;
  if (can(actor, "support.view_all")) return "staff" as const;
  if (can(actor, "support.view_assigned")) {
    if (t.assigneeId === actor.id) return "staff" as const;
    if (t.assigneeId === null && (!t.teamId || (await teamIdsOf(actor.id)).includes(t.teamId))) return "staff" as const;
  }
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "deny", entity: "SupportTicket", entityId: t.id ?? null, outcome: "denied" });
  throw new AuthorisationError("You do not have access to this case.", 403);
}

// ---------------------------------------------------------------------------
// Opening a case
// ---------------------------------------------------------------------------

const level = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1).max(3).optional());
const OpenInput = z.object({
  subject: z.string().trim().min(4, "Give your question a short subject.").max(160),
  category: z.enum(CATEGORIES),
  body: z.string().trim().min(10, "Tell us a little more.").max(5000),
  channel: z.enum(["CHAT", "TICKET"]).default("TICKET"),
  source: z.enum(["WEB_FORM", "CHAT", "ASSISTANT", "COURSE_PAGE", "ACCOUNT", "STAFF"]).default("WEB_FORM"),
  programId: z.preprocess((v) => (v === "" ? undefined : v), z.string().max(40).optional()),
  relatedRef: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(200).optional()),
  pageContext: z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(200).optional()),
  impact: level,
  urgency: level,
});

/** Notify whoever should pick up a case: the assignee, else the team, else the people who assign. */
async function notifyOwners(t: { id: string; reference: string; subject: string; assigneeId: string | null; teamId: string | null }, title: string, exceptUserId?: string) {
  const n = { kind: "support", title, body: t.subject, href: `/admin/support/${t.id}` };
  if (t.assigneeId) return notifyUsers([t.assigneeId].filter((x) => x !== exceptUserId), n);
  if (t.teamId) {
    const members = await prisma.supportTeamMember.findMany({ where: { teamId: t.teamId }, select: { userId: true } });
    if (members.length) return notifyUsers(members.map((m) => m.userId).filter((x) => x !== exceptUserId), n);
  }
  return notifyPermission("support.assign", n, exceptUserId);
}

export async function openTicket(actor: Actor, input: unknown) {
  const d = OpenInput.parse(input);
  const setting = await categorySetting(d.category);
  if (setting && !setting.active) throw new ServiceError("That topic is not available. Choose another, or Other.");
  if (d.programId && !(await prisma.program.findUnique({ where: { id: d.programId }, select: { id: true } }))) throw new ServiceError("That course does not exist.");
  const subject = mask(d.subject);
  const body = mask(d.body);
  const relatedRef = d.relatedRef ? mask(d.relatedRef).text : undefined;
  const security = d.category === "PRIVACY_SECURITY";
  let priority: SupportPriority = higherPriority(matrixPriority(d.impact, d.urgency), setting?.defaultPriority ?? "NORMAL");
  if (d.category === "COMPLAINT") priority = higherPriority(priority, "HIGH");
  if (security) priority = "URGENT";
  const now = new Date();
  const due = await dueTimes(priority, now);
  const route = await routeTeam(d.category);

  const created = await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        reference: await nextNumber(tx, "support", "SUP"),
        requesterId: actor.id,
        subject: subject.text,
        category: d.category,
        channel: d.channel,
        source: d.source as TicketSource,
        programId: d.programId ?? null,
        relatedRef: relatedRef ?? null,
        pageContext: d.pageContext?.split("?")[0] ?? null,
        impact: d.impact ?? null,
        urgency: d.urgency ?? null,
        isComplaint: d.category === "COMPLAINT",
        priority,
        status: security ? "ESCALATED" : "WAITING",
        escalatedTo: security ? "security" : null,
        teamId: route.team?.id ?? null,
        ...due,
      },
    });
    await tx.supportMessage.create({ data: { ticketId: ticket.id, authorId: actor.id, body: body.text, masked: body.masked || subject.masked } });
    await recordEvent(tx, ticket.id, "CREATED", { actorId: actor.id, to: ticket.status, note: `${d.source.toLowerCase().replace("_", " ")} · priority ${priority.toLowerCase()}` });
    await recordEvent(tx, ticket.id, "ROUTED", { to: route.team?.name ?? null, note: route.reason });
    let assigneeId: string | null = null;
    if (route.team && !security) {
      const a = await autoAssign(tx, ticket.id, route.team.id);
      assigneeId = a.assigneeId;
      await recordEvent(tx, ticket.id, a.assigneeId ? "ASSIGNED" : "UNASSIGNED", { to: a.assigneeId, note: a.note });
    }
    return { ...ticket, assigneeId, status: assigneeId ? ("ASSIGNED" as SupportStatus) : ticket.status };
  });

  await audit({ actorId: actor.id, action: "create", entity: "SupportTicket", entityId: created.id, after: { reference: created.reference, category: created.category, source: d.source, priority, teamId: created.teamId, assigneeId: created.assigneeId, masked: body.masked } });
  if (security) await notifyPermission("audit.view", { kind: "support", title: `Security concern ${created.reference}`, body: created.subject, href: `/admin/support/${created.id}` }, actor.id);
  await notifyOwners(created, created.assigneeId ? `${created.reference} assigned to you` : `New support case ${created.reference}`, actor.id);
  await notifyUsers([actor.id], { kind: "support", title: `We received ${created.reference}`, body: created.subject, href: `/support/${created.id}` });
  const assignee = created.assigneeId ? await prisma.user.findUnique({ where: { id: created.assigneeId }, select: { name: true } }) : null;
  return { ticket: created, masked: body.masked || subject.masked, team: route.team?.name ?? null, assigneeName: assignee?.name ?? null };
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export async function addMessage(actor: Actor, ticketId: string, text: string, opts: { internal?: boolean; status?: SupportStatus } = {}) {
  const t = await load(ticketId);
  const as = await assertVisible(actor, t);
  const clean = mask((text ?? "").trim().slice(0, 5000));
  if (clean.text.length < 1) throw new ServiceError("Write a message.");
  if (as === "requester") {
    if (opts.internal) throw new AuthorisationError("Only staff can add internal notes.", 403);
    let status: SupportStatus = t.status;
    let reopen = false;
    if (t.status === "CLOSED") {
      if (!t.closedAt || Date.now() - +t.closedAt > REOPEN_WINDOW_DAYS * 86400_000) throw new ServiceError(`This case was closed more than ${REOPEN_WINDOW_DAYS} days ago. Open a new one and mention ${t.reference}.`);
      status = "REOPENED";
      reopen = true;
    } else if (t.status === "RESOLVED") {
      status = "REOPENED";
      reopen = true;
    } else if (t.status === "PENDING_SUBSCRIBER") status = t.assigneeId ? "IN_PROGRESS" : "WAITING";
    await prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({ data: { ticketId, authorId: actor.id, body: clean.text, masked: clean.masked } });
      await tx.supportTicket.update({ where: { id: ticketId }, data: { status, reopenCount: { increment: reopen ? 1 : 0 }, ...(reopen ? { resolvedAt: null, closedAt: null } : {}) } });
      if (reopen) await recordEvent(tx, ticketId, "REOPENED", { actorId: actor.id, from: t.status, to: status });
      else if (status !== t.status) await recordEvent(tx, ticketId, "STATUS", { actorId: actor.id, from: t.status, to: status, note: "Learner replied" });
    });
    await notifyOwners(t, reopen ? `${t.reference} reopened by the learner` : `Reply on ${t.reference}`, actor.id);
    return { masked: clean.masked, status };
  }
  // Staff.
  await assertCan(actor, "support.respond", { entity: "SupportTicket", id: ticketId });
  if (!can(actor, "support.view_all") && t.assigneeId !== actor.id) throw new ServiceError("Accept the case before replying to it.");
  const next: SupportStatus = opts.internal ? t.status : (opts.status ?? "PENDING_SUBSCRIBER");
  if (!canStaffMove(t.status, next)) throw new ServiceError(`A case that is ${STATUS_LABEL[t.status].toLowerCase()} cannot move to ${STATUS_LABEL[next].toLowerCase()}.`);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.supportMessage.create({ data: { ticketId, authorId: actor.id, body: clean.text, internal: !!opts.internal, masked: clean.masked } });
    await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: next,
        ...(opts.internal || t.firstResponseAt ? {} : { firstResponseAt: now }),
        ...(next === "RESOLVED" ? { resolvedAt: now, resolutionSummary: clean.text } : {}),
        ...(next === "CLOSED" ? { closedAt: now } : {}),
      },
    });
    if (next !== t.status) await recordEvent(tx, ticketId, next === "RESOLVED" ? "RESOLVED" : next === "CLOSED" ? "CLOSED" : "STATUS", { actorId: actor.id, from: t.status, to: next });
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: opts.internal ? "create" : "update", entity: "SupportTicket", entityId: ticketId, after: { message: opts.internal ? "internal_note" : "reply", status: next, masked: clean.masked } });
  if (!opts.internal) await notifyUsers([t.requesterId], { kind: "support", title: next === "RESOLVED" ? `${t.reference} resolved` : `Reply on ${t.reference}: ${t.subject}`, href: `/support/${t.id}` });
  return { masked: clean.masked, status: next };
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

/**
 * Assign or unassign. An agent may accept an unassigned case they can see; reassigning or
 * assigning someone else needs support.assign. Accepting is conditional on the case still being
 * unassigned, so two agents accepting at once cannot both own it.
 */
export async function assign(actor: Actor, ticketId: string, assigneeId: string | null) {
  const t = await load(ticketId);
  const selfAccept = assigneeId === actor.id && !t.assigneeId;
  if (selfAccept) {
    await assertCan(actor, "support.respond", { entity: "SupportTicket", id: ticketId });
    await assertVisible(actor, t);
  } else await assertCan(actor, "support.assign", { entity: "SupportTicket", id: ticketId });
  if (DONE_STATUSES.includes(t.status)) throw new ServiceError("This case is resolved or closed.");
  if (assigneeId && assigneeId !== t.assigneeId) {
    const responders = new Set((await usersWithPermission("support.respond")).map((u) => u.id));
    if (!responders.has(assigneeId)) throw new ServiceError("That person cannot answer support cases.");
  }
  if (assigneeId === t.assigneeId) return;
  const status: SupportStatus = assigneeId ? (t.status === "WAITING" ? "ASSIGNED" : t.status) : t.status === "ASSIGNED" ? "WAITING" : t.status;
  await prisma.$transaction(async (tx) => {
    const res = await tx.supportTicket.updateMany({ where: { id: ticketId, assigneeId: t.assigneeId }, data: { assigneeId, status } });
    if (!res.count) throw new ServiceError(selfAccept ? "Someone else accepted this case first." : "The case changed while you were assigning it. Reload and try again.");
    if (assigneeId && t.teamId) await tx.supportTeamMember.updateMany({ where: { teamId: t.teamId, userId: assigneeId }, data: { lastAssignedAt: new Date() } });
    await recordEvent(tx, ticketId, assigneeId ? "ASSIGNED" : "UNASSIGNED", { actorId: actor.id, from: t.assigneeId, to: assigneeId, note: selfAccept ? "Accepted" : "Assigned by hand" });
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "assign", entity: "SupportTicket", entityId: ticketId, after: { assigneeId }, before: { assigneeId: t.assigneeId } });
  if (assigneeId && assigneeId !== actor.id) await notifyUsers([assigneeId], { kind: "support", title: `${t.reference} assigned to you`, href: `/admin/support/${t.id}` });
  if (t.assigneeId && t.assigneeId !== actor.id && t.assigneeId !== assigneeId) await notifyUsers([t.assigneeId], { kind: "support", title: `${t.reference} was reassigned`, href: `/admin/support/${t.id}` });
}

/** Move a case to another team. If it is unassigned and that team assigns automatically, it is assigned. */
export async function setTeam(actor: Actor, ticketId: string, teamId: string) {
  await assertCan(actor, "support.assign", { entity: "SupportTicket", id: ticketId });
  const t = await load(ticketId);
  const team = await prisma.supportTeam.findUnique({ where: { id: teamId } });
  if (!team?.active) throw new ServiceError("Choose an active team.");
  if (team.id === t.teamId) return;
  const from = t.teamId ? (await prisma.supportTeam.findUnique({ where: { id: t.teamId } }))?.name : null;
  const assigned = await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({ where: { id: ticketId }, data: { teamId } });
    await recordEvent(tx, ticketId, "TEAM_CHANGED", { actorId: actor.id, from, to: team.name });
    if (t.assigneeId || DONE_STATUSES.includes(t.status)) return null;
    const a = await autoAssign(tx, ticketId, teamId);
    await recordEvent(tx, ticketId, a.assigneeId ? "ASSIGNED" : "UNASSIGNED", { to: a.assigneeId, note: a.note });
    return a.assigneeId;
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "assign", entity: "SupportTicket", entityId: ticketId, after: { teamId, assigneeId: assigned }, before: { teamId: t.teamId } });
  await notifyOwners({ ...t, teamId, assigneeId: assigned ?? t.assigneeId }, assigned ? `${t.reference} assigned to you` : `${t.reference} moved to ${team.name}`, actor.id);
}

/** An agent declines a case they were given: it goes back to its team's queue. */
export async function decline(actor: Actor, ticketId: string, reason: string) {
  const t = await load(ticketId);
  if (t.assigneeId !== actor.id) throw new ServiceError("This case is not assigned to you.");
  if (!reason?.trim()) throw new ServiceError("Say why, for the support manager.");
  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({ where: { id: ticketId }, data: { assigneeId: null, status: t.status === "ASSIGNED" ? "WAITING" : t.status } });
    await tx.supportMessage.create({ data: { ticketId, authorId: actor.id, body: `Declined: ${mask(reason).text}`, internal: true } });
    await recordEvent(tx, ticketId, "UNASSIGNED", { actorId: actor.id, from: actor.id, note: "Declined" });
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "assign", entity: "SupportTicket", entityId: ticketId, after: { declined: true } });
  await notifyOwners({ ...t, assigneeId: null }, `${t.reference} was declined and needs an owner`, actor.id);
}

// ---------------------------------------------------------------------------
// Triage and status
// ---------------------------------------------------------------------------

const Triage = z.object({
  category: z.enum(CATEGORIES).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  status: z.enum(["WAITING", "ASSIGNED", "IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "ESCALATED", "RESOLVED", "CLOSED", "REOPENED"]).optional(),
  followUpAt: z.coerce.date().optional().nullable(),
  isComplaint: z.boolean().optional(),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(10).optional(),
  resolutionSummary: z.string().trim().max(2000).optional(),
});

export async function triage(actor: Actor, ticketId: string, input: unknown) {
  const t = await load(ticketId);
  await assertVisible(actor, t);
  await assertCan(actor, "support.respond", { entity: "SupportTicket", id: ticketId });
  if (!can(actor, "support.view_all") && t.assigneeId !== actor.id) throw new ServiceError("Accept the case first.");
  const d = Triage.parse(input);
  if (d.status && !canStaffMove(t.status, d.status)) throw new ServiceError(`A case that is ${STATUS_LABEL[t.status].toLowerCase()} cannot move to ${STATUS_LABEL[d.status].toLowerCase()}.`);
  const resolving = d.status === "RESOLVED" && t.status !== "RESOLVED";
  const summary = d.resolutionSummary ? mask(d.resolutionSummary).text : "";
  if (resolving && summary.length < 10) throw new ServiceError("Write a resolution summary for the learner.", "resolutionSummary");
  const now = new Date();
  const { resolutionSummary: _omit, ...rest } = d;
  void _omit;
  const data: Prisma.SupportTicketUpdateInput = { ...rest };
  if (resolving) Object.assign(data, { resolvedAt: now, resolutionSummary: summary });
  if (d.status === "CLOSED" && t.status !== "CLOSED") data.closedAt = now;
  // A priority change re-plans targets not yet met.
  if (d.priority && d.priority !== t.priority) {
    const due = await dueTimes(d.priority, t.createdAt);
    if (!t.firstResponseAt) data.firstResponseDueAt = due.firstResponseDueAt;
    if (!t.resolvedAt) data.resolutionDueAt = due.resolutionDueAt;
  }
  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({ where: { id: ticketId }, data });
    if (d.status && d.status !== t.status) await tx.supportTicketEvent.create({ data: { ticketId, actorId: actor.id, kind: d.status === "RESOLVED" ? "RESOLVED" : d.status === "CLOSED" ? "CLOSED" : "STATUS", from: t.status, to: d.status } });
    if (d.priority && d.priority !== t.priority) await recordEvent(tx, ticketId, "PRIORITY", { actorId: actor.id, from: t.priority, to: d.priority });
    if (resolving) await tx.supportMessage.create({ data: { ticketId, authorId: actor.id, body: `Resolution: ${summary}` } });
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity: "SupportTicket", entityId: ticketId, before: { status: t.status, priority: t.priority, category: t.category }, after: d });
  if (resolving) await notifyUsers([t.requesterId], { kind: "support", title: `${t.reference} resolved. Reply within ${REOPEN_WINDOW_DAYS} days if it is not.`, href: `/support/${t.id}` });
  else if (d.status && d.status !== t.status) await notifyUsers([t.requesterId], { kind: "support", title: `${t.reference}: ${STATUS_LABEL[d.status].toLowerCase()}`, href: `/support/${t.id}` });
}

export async function escalate(actor: Actor, ticketId: string, to: keyof typeof ESCALATION, note: string) {
  await assertCan(actor, "support.escalate", { entity: "SupportTicket", id: ticketId });
  const t = await load(ticketId);
  await assertVisible(actor, t);
  if (!ESCALATION[to]) throw new ServiceError("Choose who to escalate to.");
  if (!note?.trim()) throw new ServiceError("Say what you need from them.");
  if (t.status !== "ESCALATED" && !canStaffMove(t.status, "ESCALATED")) throw new ServiceError(`A case that is ${STATUS_LABEL[t.status].toLowerCase()} cannot be escalated.`);
  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "ESCALATED", escalatedTo: to, priority: t.priority === "LOW" || t.priority === "NORMAL" ? "HIGH" : t.priority } });
    await tx.supportMessage.create({ data: { ticketId, authorId: actor.id, body: `Escalated to ${ESCALATION[to].label}: ${mask(note).text}`, internal: true } });
    await recordEvent(tx, ticketId, "ESCALATED", { actorId: actor.id, from: t.status, to: ESCALATION[to].label });
  });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "escalate", entity: "SupportTicket", entityId: ticketId, after: { to } });
  await notifyPermission(ESCALATION[to].permission, { kind: "support", title: `${t.reference} escalated to ${ESCALATION[to].label}`, body: t.subject, href: `/admin/support/${t.id}` }, actor.id);
}

export async function rate(actor: Actor, ticketId: string, rating: number, feedback?: string) {
  const t = await load(ticketId);
  if (t.requesterId !== actor.id) throw new ServiceError("Only the person who opened the case can rate it.");
  if (!DONE_STATUSES.includes(t.status)) throw new ServiceError("You can rate a case once it is resolved.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ServiceError("Choose a rating from 1 to 5.");
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { rating, feedback: feedback ? mask(feedback.slice(0, 1000)).text : null } });
  await audit({ actorId: actor.id, action: "update", entity: "SupportTicket", entityId: ticketId, after: { rating } });
}

/** The requester closes their own case (ends a chat, or no longer needs help). */
export async function endChat(actor: Actor, ticketId: string) {
  const t = await load(ticketId);
  if (t.requesterId !== actor.id) throw new ServiceError("That case was not found.");
  if (t.status === "CLOSED") return;
  await prisma.$transaction(async (tx) => {
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "CLOSED", closedAt: new Date() } });
    await recordEvent(tx, ticketId, "CLOSED", { actorId: actor.id, from: t.status, to: "CLOSED", note: "Closed by the learner" });
  });
  await audit({ actorId: actor.id, action: "update", entity: "SupportTicket", entityId: ticketId, after: { status: "CLOSED", by: "requester" } });
  if (t.assigneeId) await notifyUsers([t.assigneeId], { kind: "support", title: `${t.reference} closed by the learner`, href: `/admin/support/${t.id}` });
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export const ATTACHMENT_TYPES = new Set([...IMAGE_TYPES, ...DOCUMENT_TYPES]);
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;

export async function addAttachment(actor: Actor, ticketId: string, file: File) {
  const t = await load(ticketId);
  const as = await assertVisible(actor, t);
  if (as === "staff") {
    await assertCan(actor, "support.respond", { entity: "SupportTicket", id: ticketId });
    if (!can(actor, "support.view_all") && t.assigneeId !== actor.id) throw new ServiceError("Accept the case first.");
  }
  if (t.status === "CLOSED") throw new ServiceError("This case is closed.");
  if ((await prisma.supportAttachment.count({ where: { ticketId } })) >= MAX_ATTACHMENTS) throw new ServiceError(`A case can have up to ${MAX_ATTACHMENTS} files.`);
  let saved;
  try {
    saved = await saveChecked("support", file, ATTACHMENT_TYPES, ATTACHMENT_MAX_BYTES);
  } catch (e) {
    throw new ServiceError((e as Error).message);
  }
  const a = await prisma.supportAttachment.create({ data: { ticketId, uploaderId: actor.id, ...saved } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "create", entity: "SupportAttachment", entityId: a.id, after: { ticketId, fileName: a.fileName, mimeType: a.mimeType, sizeBytes: a.sizeBytes } });
  return a;
}

/** An attachment, if this actor may see its case. */
export async function attachmentFor(actor: Actor, id: string) {
  const a = await prisma.supportAttachment.findUnique({ where: { id }, include: { ticket: true } });
  if (!a) throw new ServiceError("That file does not exist.");
  await assertVisible(actor, a.ticket);
  return a;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** A case and its messages, as the viewer may see them (internal notes and history only for staff). */
export async function viewTicket(actor: Actor, ticketId: string) {
  const t = await load(ticketId);
  const as = await assertVisible(actor, t);
  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      program: { select: { id: true, name: true, slug: true } },
      messages: { where: as === "staff" ? {} : { internal: false }, orderBy: { createdAt: "asc" } },
      attachments: { orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, mimeType: true, sizeBytes: true, uploaderId: true, createdAt: true } },
      events: as === "staff" ? { orderBy: { createdAt: "asc" } } : false,
    },
  });
  const ids = new Set([...ticket.messages.map((m) => m.authorId), ...(ticket.events ?? []).flatMap((e) => [e.actorId, e.from, e.to])].filter(Boolean) as string[]);
  const authors = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true } });
  if (as === "staff") await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "download", entity: "SupportTranscript", entityId: ticketId });
  const names: Record<string, string> = Object.fromEntries(authors.map((a) => [a.id, a.name]));
  return { ticket, as, names };
}

export type QueueView = "mine" | "team" | "unassigned" | "high" | "overdue" | "waiting_learner" | "all";

export async function queue(actor: Actor, f: { view?: QueueView; status?: SupportStatus; category?: SupportCategory; priority?: SupportPriority; teamId?: string; q?: string; mine?: boolean; unassigned?: boolean }) {
  if (!can(actor, "support.view_all")) await assertCan(actor, "support.view_assigned");
  const myTeams = await teamIdsOf(actor.id);
  const scope: Prisma.SupportTicketWhereInput = can(actor, "support.view_all") ? {} : { OR: [{ assigneeId: actor.id }, { assigneeId: null, OR: [{ teamId: null }, { teamId: { in: myTeams } }] }] };
  const now = new Date();
  const view = f.view ?? (f.mine ? "mine" : f.unassigned ? "unassigned" : "all");
  const views: Record<QueueView, Prisma.SupportTicketWhereInput> = {
    mine: { assigneeId: actor.id },
    team: { teamId: { in: myTeams } },
    unassigned: { assigneeId: null },
    high: { priority: { in: ["HIGH", "URGENT"] } },
    overdue: { OR: [{ firstResponseAt: null, firstResponseDueAt: { lt: now } }, { resolutionDueAt: { lt: now } }] },
    waiting_learner: { status: "PENDING_SUBSCRIBER" },
    all: {},
  };
  const q = f.q?.trim();
  return prisma.supportTicket.findMany({
    where: {
      AND: [
        scope,
        views[view],
        f.status ? { status: f.status } : { status: { in: OPEN_STATUSES } },
        f.category ? { category: f.category } : {},
        f.priority ? { priority: f.priority } : {},
        f.teamId ? { teamId: f.teamId } : {},
        q ? { OR: [{ reference: { contains: q } }, { subject: { contains: q } }, { requester: { email: { contains: q } } }, { requester: { name: { contains: q } } }, { tags: { array_contains: [q.toLowerCase()] } }] } : {},
      ],
    },
    orderBy: [{ priority: "desc" }, { firstResponseDueAt: "asc" }, { createdAt: "asc" }],
    take: 200,
    include: { requester: { select: { name: true } }, assignee: { select: { name: true } }, team: { select: { name: true } }, _count: { select: { messages: true } } },
  });
}

// ---------------------------------------------------------------------------
// Scheduled: SLA warnings, breaches and escalation; closing resolved cases
// ---------------------------------------------------------------------------

const WARN_MINUTES = 60;

/**
 * Run by the cron route. Warns owners an hour before a first-response target; records breaches
 * of either target once, raises the case one priority step and tells the team leads and the
 * people who assign; closes cases resolved more than AUTO_CLOSE_DAYS ago.
 */
export async function runSupportSla(now = new Date()) {
  const soon = new Date(now.getTime() + WARN_MINUTES * 60_000);
  const warn = await prisma.supportTicket.findMany({ where: { status: { in: OPEN_STATUSES }, firstResponseAt: null, slaWarnedAt: null, firstResponseDueAt: { gt: now, lte: soon } } });
  for (const t of warn) {
    const res = await prisma.supportTicket.updateMany({ where: { id: t.id, slaWarnedAt: null }, data: { slaWarnedAt: now } });
    if (!res.count) continue;
    await recordEvent(prisma, t.id, "SLA_WARNING", { note: "first response due within the hour" });
    await notifyOwners(t, `${t.reference}: first response due within the hour`);
  }

  const breached: { id: string; target: string }[] = [];
  const firstLate = await prisma.supportTicket.findMany({ where: { status: { in: OPEN_STATUSES }, firstResponseAt: null, firstResponseBreachedAt: null, firstResponseDueAt: { lte: now } } });
  const resolveLate = await prisma.supportTicket.findMany({ where: { status: { in: OPEN_STATUSES }, resolutionBreachedAt: null, resolutionDueAt: { lte: now } } });
  for (const [list, target, field] of [
    [firstLate, "first response", "firstResponseBreachedAt"],
    [resolveLate, "resolution", "resolutionBreachedAt"],
  ] as const) {
    for (const t of list) {
      const res = await prisma.supportTicket.updateMany({ where: { id: t.id, [field]: null }, data: { [field]: now, priority: bumpPriority(t.priority) } });
      if (!res.count) continue;
      await recordEvent(prisma, t.id, "SLA_BREACH", { from: t.priority, to: bumpPriority(t.priority), note: target });
      const leads = t.teamId ? (await prisma.supportTeamMember.findMany({ where: { teamId: t.teamId, isLead: true }, select: { userId: true } })).map((m) => m.userId) : [];
      const n = { kind: "support", title: `${t.reference}: ${target} target missed`, body: t.subject, href: `/admin/support/${t.id}` };
      if (leads.length) await notifyUsers(leads, n);
      await notifyPermission("support.assign", n);
      if (t.assigneeId) await notifyUsers([t.assigneeId], n);
      breached.push({ id: t.id, target });
    }
  }

  const stale = await prisma.supportTicket.findMany({ where: { status: "RESOLVED", resolvedAt: { lt: new Date(now.getTime() - AUTO_CLOSE_DAYS * 86400_000) } }, select: { id: true } });
  for (const t of stale) {
    const res = await prisma.supportTicket.updateMany({ where: { id: t.id, status: "RESOLVED" }, data: { status: "CLOSED", closedAt: now } });
    if (res.count) await recordEvent(prisma, t.id, "CLOSED", { from: "RESOLVED", to: "CLOSED", note: `No reply within ${AUTO_CLOSE_DAYS} days of resolution` });
  }
  return { warned: warn.length, breached, closed: stale.length };
}

// ---------------------------------------------------------------------------
// Approved responses
// ---------------------------------------------------------------------------

const TemplateInput = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(4000),
  category: z.enum(CATEGORIES).optional().nullable(),
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
