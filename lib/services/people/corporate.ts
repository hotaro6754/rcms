import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { slugify } from "@/lib/services/cms/core";
import { notifyUsers } from "./staff-lookup";

/**
 * Corporate accounts (blueprint §5.4): an organisation with a seat allocation, members,
 * managers, groups, and courses assigned to groups. Assigning a course to a group enrols
 * every member of the group (source CORPORATE); people who join the group later are enrolled
 * when they join. Corporate managers see their own organisation's progress only.
 */

function log(actor: Actor, action: Parameters<typeof audit>[0]["action"], entity: string, entityId: string | null, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity, entityId, after, before });
}

const optDate = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.date().nullable());

const OrgInput = z.object({
  name: z.string().trim().min(2).max(160),
  seats: z.coerce.number().int().min(0).max(100_000),
  billingEmail: z.string().trim().email().optional().nullable().or(z.literal("").transform(() => null)),
  gstin: z.string().trim().max(20).optional().nullable(),
  contractStart: optDate.optional(),
  contractEnd: optDate.optional(),
});

export async function createOrganisation(actor: Actor, input: unknown) {
  await assertCan(actor, "org.manage");
  const d = OrgInput.parse(input);
  let slug = slugify(d.name) || "org";
  for (let i = 2; await prisma.organisation.findUnique({ where: { slug } }); i++) slug = `${slugify(d.name)}-${i}`;
  const org = await prisma.organisation.create({ data: { ...d, slug } });
  await log(actor, "create", "Organisation", org.id, { name: org.name, seats: org.seats });
  return org;
}

export async function updateOrganisation(actor: Actor, id: string, input: unknown) {
  await assertCan(actor, "org.manage", { entity: "Organisation", id });
  const d = OrgInput.parse(input);
  const before = await prisma.organisation.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
  if (!before) throw new ServiceError("That organisation no longer exists.");
  if (d.seats < before._count.members) throw new ServiceError(`${before._count.members} people already hold seats. Remove members before reducing seats below that.`);
  await prisma.organisation.update({ where: { id }, data: d });
  await log(actor, "update", "Organisation", id, d, { seats: before.seats, name: before.name });
}

export async function setOrganisationActive(actor: Actor, id: string, active: boolean) {
  await assertCan(actor, "org.manage", { entity: "Organisation", id });
  await prisma.organisation.update({ where: { id }, data: { active } });
  await log(actor, active ? "reactivate" : "suspend", "Organisation", id, { active });
}

/** Adds an existing account by email (others are invited from the invitation form). */
export async function addMember(actor: Actor, orgId: string, email: string, isManager = false) {
  await assertCan(actor, "org.manage", { entity: "Organisation", id: orgId });
  const org = await prisma.organisation.findUnique({ where: { id: orgId }, include: { _count: { select: { members: true } } } });
  if (!org) throw new ServiceError("That organisation no longer exists.");
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, role: true } });
  if (!user) throw new ServiceError("No account with that email. Send an invitation instead.");
  if (user.role === "VENDOR") throw new ServiceError("Vendor accounts cannot hold corporate seats.");
  const existing = await prisma.orgMember.findUnique({ where: { orgId_userId: { orgId, userId: user.id } } });
  if (existing) {
    if (existing.isManager !== isManager) await prisma.orgMember.update({ where: { id: existing.id }, data: { isManager } });
    await log(actor, "update", "OrgMember", existing.id, { isManager });
    return existing;
  }
  if (org._count.members >= org.seats) throw new ServiceError(`All ${org.seats} seats are in use.`);
  const m = await prisma.orgMember.create({ data: { orgId, userId: user.id, isManager } });
  await log(actor, "assign", "OrgMember", m.id, { orgId, userId: user.id, isManager });
  return m;
}

/** Removes a person's seat. Their corporate enrolments end; their own purchases are untouched. */
export async function removeMember(actor: Actor, memberId: string) {
  const m = await prisma.orgMember.findUnique({ where: { id: memberId } });
  if (!m) throw new ServiceError("That member no longer exists.");
  await assertCan(actor, "org.manage", { entity: "Organisation", id: m.orgId });
  await prisma.$transaction([
    prisma.enrolment.updateMany({ where: { userId: m.userId, orgId: m.orgId, source: "CORPORATE", state: "ACTIVE" }, data: { state: "CANCELLED" } }),
    prisma.orgMember.delete({ where: { id: memberId } }),
  ]);
  await log(actor, "delete", "OrgMember", memberId, { orgId: m.orgId, userId: m.userId });
}

export async function createGroup(actor: Actor, orgId: string, name: string) {
  await assertCan(actor, "org.manage", { entity: "Organisation", id: orgId });
  const n = name?.trim();
  if (!n || n.length < 2) throw new ServiceError("Name the group.");
  const g = await prisma.orgGroup.create({ data: { orgId, name: n.slice(0, 80) } }).catch(() => {
    throw new ServiceError("A group with that name already exists.");
  });
  await log(actor, "create", "OrgGroup", g.id, { orgId, name: g.name });
  return g;
}

export async function deleteGroup(actor: Actor, groupId: string) {
  const g = await prisma.orgGroup.findUnique({ where: { id: groupId } });
  if (!g) throw new ServiceError("That group no longer exists.");
  await assertCan(actor, "org.manage", { entity: "Organisation", id: g.orgId });
  // Enrolments already granted stay: removing a group is not a reason to take learning away.
  await prisma.orgGroup.delete({ where: { id: groupId } });
  await log(actor, "delete", "OrgGroup", groupId, { orgId: g.orgId, name: g.name });
}

async function enrolInGroupCourses(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], orgId: string, userIds: string[], programIds: string[]) {
  let granted = 0;
  for (const userId of userIds) {
    for (const programId of programIds) {
      const e = await tx.enrolment.findUnique({ where: { userId_programId: { userId, programId } } });
      if (e && (e.state === "ACTIVE" || e.state === "COMPLETED")) continue;
      if (e) await tx.enrolment.update({ where: { id: e.id }, data: { state: "ACTIVE", source: "CORPORATE", orgId } });
      else await tx.enrolment.create({ data: { userId, programId, source: "CORPORATE", orgId } });
      granted++;
    }
  }
  return granted;
}

export async function setGroupMembers(actor: Actor, groupId: string, memberIds: string[]) {
  const g = await prisma.orgGroup.findUnique({ where: { id: groupId }, include: { courses: true } });
  if (!g) throw new ServiceError("That group no longer exists.");
  await assertCan(actor, "org.manage", { entity: "Organisation", id: g.orgId });
  const members = await prisma.orgMember.findMany({ where: { id: { in: memberIds }, orgId: g.orgId } });
  if (members.length !== new Set(memberIds).size) throw new ServiceError("Everyone in a group must hold a seat in this organisation.");
  const granted = await prisma.$transaction(async (tx) => {
    const before = await tx.orgGroupMember.findMany({ where: { groupId }, select: { memberId: true } });
    await tx.orgGroupMember.deleteMany({ where: { groupId, memberId: { notIn: memberIds } } });
    const added = members.filter((m) => !before.some((b) => b.memberId === m.id));
    for (const m of added) await tx.orgGroupMember.create({ data: { groupId, memberId: m.id } });
    return enrolInGroupCourses(tx, g.orgId, added.map((m) => m.userId), g.courses.map((c) => c.programId));
  });
  await log(actor, "update", "OrgGroup", groupId, { members: memberIds.length, enrolmentsGranted: granted });
  return granted;
}

/** Assigns a released course to a group and enrols every member who is not already enrolled. */
export async function assignGroupCourse(actor: Actor, groupId: string, programId: string) {
  const g = await prisma.orgGroup.findUnique({ where: { id: groupId }, include: { members: { include: { member: true } }, org: true } });
  if (!g) throw new ServiceError("That group no longer exists.");
  await assertCan(actor, "org.manage", { entity: "Organisation", id: g.orgId });
  if (!g.org.active) throw new ServiceError("This organisation is inactive.");
  const course = await prisma.program.findUnique({ where: { id: programId }, select: { name: true, publishedVersionId: true, status: true } });
  if (!course || !course.publishedVersionId || course.status === "ARCHIVED") throw new ServiceError("Only a published course can be assigned.");
  const granted = await prisma.$transaction(async (tx) => {
    await tx.orgGroupCourse.upsert({ where: { groupId_programId: { groupId, programId } }, create: { groupId, programId }, update: {} });
    return enrolInGroupCourses(tx, g.orgId, g.members.map((m) => m.member.userId), [programId]);
  });
  await log(actor, "enrol", "OrgGroup", groupId, { programId, enrolmentsGranted: granted });
  await notifyUsers(g.members.map((m) => m.member.userId), { kind: "enrolment", title: `${g.org.name} assigned you ${course.name}`, href: "/academy" });
  return granted;
}

export async function unassignGroupCourse(actor: Actor, groupId: string, programId: string) {
  const g = await prisma.orgGroup.findUnique({ where: { id: groupId } });
  if (!g) throw new ServiceError("That group no longer exists.");
  await assertCan(actor, "org.manage", { entity: "Organisation", id: g.orgId });
  await prisma.orgGroupCourse.deleteMany({ where: { groupId, programId } });
  await log(actor, "update", "OrgGroup", groupId, { unassigned: programId });
}

/**
 * Progress for an organisation: staff with org.manage, or a manager of that organisation.
 * Shows course progress and certificates only, never billing or support content.
 */
export async function teamReport(actor: Actor, orgId: string) {
  if (!can(actor, "org.manage") && !actor.managedOrgIds.includes(orgId)) {
    await audit({ actorId: actor.id, action: "deny", entity: "Organisation", entityId: orgId, outcome: "denied" });
    throw new AuthorisationError("You do not manage this organisation.", 403);
  }
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    include: {
      groups: { include: { courses: { include: { program: { select: { id: true, name: true } } } }, members: { select: { memberId: true } } }, orderBy: { name: "asc" } },
      members: { include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } }, orderBy: { createdAt: "asc" } },
      invitations: { where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, expiresAt: true } },
    },
  });
  if (!org) throw new ServiceError("That organisation no longer exists.");
  const userIds = org.members.map((m) => m.userId);
  const [enrolments, certificates, totals] = await Promise.all([
    prisma.enrolment.findMany({ where: { userId: { in: userIds } }, select: { userId: true, programId: true, state: true, completedAt: true, source: true, program: { select: { name: true } } } }),
    prisma.certificate.findMany({ where: { userId: { in: userIds }, revokedAt: null }, select: { userId: true, programId: true, serial: true } }),
    prisma.progress.groupBy({ by: ["userId"], where: { userId: { in: userIds }, completedAt: { not: null } }, _count: { _all: true } }),
  ]);
  return {
    org,
    rows: org.members.map((m) => ({
      member: m,
      enrolments: enrolments.filter((e) => e.userId === m.userId),
      certificates: certificates.filter((c) => c.userId === m.userId),
      lessonsCompleted: totals.find((t) => t.userId === m.userId)?._count._all ?? 0,
      groups: org.groups.filter((g) => g.members.some((gm) => gm.memberId === m.id)).map((g) => g.name),
    })),
  };
}
