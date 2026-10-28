import { z } from "zod";
import type { Prisma, SupportCategory, SupportPriority, TicketEventKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, type Actor } from "@/lib/actor";
import { ServiceError } from "@/lib/errors";
import { addBusinessMinutes, businessMinutesBetween, DEFAULT_CALENDAR, DEFAULT_SLA, type Calendar } from "@/lib/support/sla";
import { DONE_STATUSES, OPEN_STATUSES } from "@/lib/support/states";
import { usersWithPermission } from "@/lib/services/people/staff-lookup";
import { numbers } from "@/lib/json-list";

/**
 * Support routing, assignment and SLA configuration.
 *
 * Routing is deterministic and explainable: the category names a team; if the team assigns
 * automatically, the case goes to the available member with the fewest open cases (ties: who was
 * assigned longest ago, then a stable id order), skipping anyone at their limit. If nobody fits,
 * the case waits unassigned in the team's queue; it is never dropped. Every decision is written
 * to the case history with the reason.
 */

type Tx = Prisma.TransactionClient | typeof prisma;

export async function recordEvent(tx: Tx, ticketId: string, kind: TicketEventKind, e: { actorId?: string | null; from?: string | null; to?: string | null; note?: string | null } = {}) {
  await tx.supportTicketEvent.create({ data: { ticketId, kind, actorId: e.actorId ?? null, from: e.from ?? null, to: e.to ?? null, note: e.note ?? null } });
}

// ---------------------------------------------------------------------------
// SLA
// ---------------------------------------------------------------------------

export async function supportCalendar(tx: Tx = prisma): Promise<Calendar> {
  const c = await tx.supportCalendar.findUnique({ where: { id: "default" } });
  return c ? { utcOffsetMinutes: c.utcOffsetMinutes, workDays: numbers(c.workDays), startMinute: c.startMinute, endMinute: c.endMinute } : DEFAULT_CALENDAR;
}

export async function slaFor(priority: SupportPriority, tx: Tx = prisma) {
  const p = await tx.supportSlaPolicy.findUnique({ where: { priority } });
  return p ?? { priority, ...DEFAULT_SLA[priority] };
}

export async function dueTimes(priority: SupportPriority, from: Date, tx: Tx = prisma) {
  const [cal, sla] = await Promise.all([supportCalendar(tx), slaFor(priority, tx)]);
  return {
    firstResponseDueAt: addBusinessMinutes(from, sla.firstResponseMinutes, cal, sla.businessHours),
    resolutionDueAt: addBusinessMinutes(from, sla.resolutionMinutes, cal, sla.businessHours),
  };
}

// ---------------------------------------------------------------------------
// Categories and teams
// ---------------------------------------------------------------------------

export async function categorySetting(category: SupportCategory, tx: Tx = prisma) {
  return tx.supportCategorySetting.findUnique({ where: { category }, include: { team: true } });
}

/** Choose the owning team for a category: its configured team, else the "general" team. */
export async function routeTeam(category: SupportCategory, tx: Tx = prisma) {
  const setting = await categorySetting(category, tx);
  if (setting?.team?.active) return { team: setting.team, reason: `Category routes to ${setting.team.name}.` };
  const general = await tx.supportTeam.findFirst({ where: { key: "general", active: true } });
  if (general) return { team: general, reason: setting?.team ? `${setting.team.name} is inactive; sent to ${general.name}.` : `No team set for this category; sent to ${general.name}.` };
  const any = await tx.supportTeam.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  return any ? { team: any, reason: `No routing set; sent to ${any.name}.` } : { team: null, reason: "No support team exists; the case waits in the shared queue." };
}

/** The member automatic assignment would choose, with how loaded they are. */
export async function pickAgent(teamId: string, tx: Tx = prisma) {
  const members = await tx.supportTeamMember.findMany({ where: { teamId, available: true }, orderBy: { id: "asc" } });
  if (!members.length) return null;
  const responders = new Set((await usersWithPermission("support.respond")).map((u) => u.id));
  const eligible = members.filter((m) => responders.has(m.userId));
  if (!eligible.length) return null;
  const loads = await tx.supportTicket.groupBy({ by: ["assigneeId"], where: { assigneeId: { in: eligible.map((m) => m.userId) }, status: { in: OPEN_STATUSES } }, _count: { _all: true } });
  const load = (uid: string) => loads.find((l) => l.assigneeId === uid)?._count._all ?? 0;
  const ranked = eligible
    .map((m) => ({ m, load: load(m.userId) }))
    .filter((x) => x.load < x.m.maxOpen)
    .sort((a, b) => a.load - b.load || (a.m.lastAssignedAt?.getTime() ?? 0) - (b.m.lastAssignedAt?.getTime() ?? 0) || a.m.id.localeCompare(b.m.id));
  return ranked[0] ? { userId: ranked[0].m.userId, memberId: ranked[0].m.id, load: ranked[0].load } : null;
}

/**
 * Assign an unassigned case automatically. Conditional on the case still being unassigned, so a
 * person accepting it at the same moment wins cleanly and nobody ends up with a double owner.
 */
export async function autoAssign(tx: Tx, ticketId: string, teamId: string) {
  const team = await tx.supportTeam.findUnique({ where: { id: teamId } });
  if (!team?.autoAssign) return { assigneeId: null, note: `${team?.name ?? "The team"} assigns by hand; waiting in its queue.` };
  const pick = await pickAgent(teamId, tx);
  if (!pick) return { assigneeId: null, note: `Nobody in ${team.name} is available under their case limit; waiting in the team queue.` };
  const res = await tx.supportTicket.updateMany({ where: { id: ticketId, assigneeId: null }, data: { assigneeId: pick.userId, status: "ASSIGNED" } });
  if (!res.count) return { assigneeId: null, note: "Someone accepted the case first." };
  await tx.supportTeamMember.update({ where: { id: pick.memberId }, data: { lastAssignedAt: new Date() } });
  return { assigneeId: pick.userId, note: `Least-loaded available member of ${team.name} (${pick.load} open).` };
}

// ---------------------------------------------------------------------------
// Configuration (support leads)
// ---------------------------------------------------------------------------

function log(actor: Actor, entity: string, id: string, after: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "update", entity, entityId: id, after, before });
}

const TeamInput = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,30}$/, "Use 2–30 lowercase letters, digits or hyphens for the key."),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional().nullable(),
  active: z.boolean().default(true),
  autoAssign: z.boolean().default(true),
});

export async function saveTeam(actor: Actor, id: string | null, input: unknown) {
  await assertCan(actor, "support.configure");
  const d = TeamInput.parse(input);
  const clash = await prisma.supportTeam.findUnique({ where: { key: d.key } });
  if (clash && clash.id !== id) throw new ServiceError(`A team with key "${d.key}" already exists.`);
  const team = id ? await prisma.supportTeam.update({ where: { id }, data: d }) : await prisma.supportTeam.create({ data: d });
  await log(actor, "SupportTeam", team.id, d);
  return team;
}

const MemberInput = z.object({ isLead: z.boolean().default(false), available: z.boolean().default(true), maxOpen: z.coerce.number().int().min(1).max(500).default(15) });

export async function setTeamMember(actor: Actor, teamId: string, userId: string, input: unknown) {
  await assertCan(actor, "support.configure");
  const d = MemberInput.parse(input);
  const responders = new Set((await usersWithPermission("support.respond")).map((u) => u.id));
  if (!responders.has(userId)) throw new ServiceError("Only people who can answer support cases can join a team.");
  const m = await prisma.supportTeamMember.upsert({ where: { teamId_userId: { teamId, userId } }, create: { teamId, userId, ...d }, update: d });
  await log(actor, "SupportTeamMember", m.id, { teamId, userId, ...d });
}

export async function removeTeamMember(actor: Actor, memberId: string) {
  await assertCan(actor, "support.configure");
  const m = await prisma.supportTeamMember.delete({ where: { id: memberId } });
  await audit({ actorId: actor.id, actorRoles: actor.staffRoles, action: "delete", entity: "SupportTeamMember", entityId: memberId, before: { teamId: m.teamId, userId: m.userId } });
}

/** Members switch their own availability (away, on leave); leads can switch anyone's through setTeamMember. */
export async function setMyAvailability(actor: Actor, available: boolean) {
  await assertCan(actor, "support.respond");
  const res = await prisma.supportTeamMember.updateMany({ where: { userId: actor.id }, data: { available } });
  await log(actor, "SupportTeamMember", actor.id, { available, teams: res.count });
  return res.count;
}

const CategoryInput = z.object({
  label: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable(),
  active: z.boolean(),
  teamId: z.string().optional().nullable(),
  defaultPriority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});

export async function saveCategorySetting(actor: Actor, category: SupportCategory, input: unknown) {
  await assertCan(actor, "support.configure");
  const d = CategoryInput.parse(input);
  const data = { ...d, label: d.label || null, description: d.description || null, teamId: d.teamId || null };
  if (category === "PRIVACY_SECURITY" && !data.active) throw new ServiceError("Learners must always be able to report a privacy or security concern.");
  const before = await prisma.supportCategorySetting.findUnique({ where: { category } });
  await prisma.supportCategorySetting.upsert({ where: { category }, create: { category, ...data }, update: data });
  await log(actor, "SupportCategorySetting", category, data, before);
}

const SlaInput = z.object({ firstResponseMinutes: z.coerce.number().int().min(5).max(60 * 24 * 30), resolutionMinutes: z.coerce.number().int().min(5).max(60 * 24 * 90), businessHours: z.boolean() });

export async function saveSlaPolicy(actor: Actor, priority: SupportPriority, input: unknown) {
  await assertCan(actor, "support.configure");
  const d = SlaInput.parse(input);
  if (d.resolutionMinutes < d.firstResponseMinutes) throw new ServiceError("The resolution target cannot be shorter than the first-response target.");
  const before = await prisma.supportSlaPolicy.findUnique({ where: { priority } });
  await prisma.supportSlaPolicy.upsert({ where: { priority }, create: { priority, ...d }, update: d });
  await log(actor, "SupportSlaPolicy", priority, d, before);
}

const CalendarInput = z.object({
  utcOffsetMinutes: z.coerce.number().int().min(-720).max(840),
  workDays: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Choose at least one working day."),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function saveCalendar(actor: Actor, input: unknown) {
  await assertCan(actor, "support.configure");
  const d = CalendarInput.parse(input);
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const data = { utcOffsetMinutes: d.utcOffsetMinutes, workDays: [...new Set(d.workDays)].sort(), startMinute: toMin(d.start), endMinute: toMin(d.end) };
  if (data.endMinute <= data.startMinute || data.endMinute > 1440) throw new ServiceError("Support hours must end after they start, on the same day.");
  await prisma.supportCalendar.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
  await log(actor, "SupportCalendar", "default", data);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** Support measures over a window, computed from recorded timestamps only. */
export async function supportMetrics(days = 30, now = new Date()) {
  const since = new Date(now.getTime() - days * 86400_000);
  const cal = await supportCalendar();
  const [created, responded, resolved, reopened, breaches, backlogTeam, backlogAgent, teams] = await Promise.all([
    prisma.supportTicket.count({ where: { createdAt: { gte: since } } }),
    prisma.supportTicket.findMany({ where: { firstResponseAt: { gte: since } }, select: { createdAt: true, firstResponseAt: true } }),
    prisma.supportTicket.findMany({ where: { resolvedAt: { gte: since } }, select: { createdAt: true, resolvedAt: true, reopenCount: true } }),
    prisma.supportTicketEvent.count({ where: { kind: "REOPENED", createdAt: { gte: since } } }),
    prisma.supportTicketEvent.groupBy({ by: ["note"], where: { kind: "SLA_BREACH", createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.supportTicket.groupBy({ by: ["teamId"], where: { status: { in: OPEN_STATUSES } }, _count: { _all: true } }),
    prisma.supportTicket.groupBy({ by: ["assigneeId"], where: { status: { in: OPEN_STATUSES } }, _count: { _all: true } }),
    prisma.supportTeam.findMany({ select: { id: true, name: true } }),
  ]);
  const agents = await prisma.user.findMany({ where: { id: { in: backlogAgent.map((b) => b.assigneeId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  return {
    days,
    created,
    medianFirstResponseMinutes: median(responded.map((t) => businessMinutesBetween(t.createdAt, t.firstResponseAt!, cal))),
    medianResolutionMinutes: median(resolved.map((t) => businessMinutesBetween(t.createdAt, t.resolvedAt!, cal))),
    resolvedCount: resolved.length,
    reopenRate: resolved.length ? Math.round((100 * reopened) / resolved.length) : null,
    breaches: Object.fromEntries(breaches.map((b) => [b.note ?? "unknown", b._count._all])) as Record<string, number>,
    backlogByTeam: backlogTeam.map((b) => ({ team: teams.find((t) => t.id === b.teamId)?.name ?? "No team", open: b._count._all })),
    backlogByAgent: backlogAgent.map((b) => ({ agent: b.assigneeId ? (agents.find((a) => a.id === b.assigneeId)?.name ?? "Unknown") : "Unassigned", open: b._count._all })),
    open: backlogTeam.reduce((n, b) => n + b._count._all, 0),
    doneStatuses: DONE_STATUSES,
  };
}
