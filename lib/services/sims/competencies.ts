import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can, type Actor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { CRITERIA } from "@/lib/sim/definition";

/**
 * The competency framework. A competency names an expected behaviour at a proficiency level and
 * says which rubric criteria are its evidence. It is drafted by someone who manages assessments,
 * activated by a reviewer who did not write it, and only active competencies can be linked to a
 * published case. Proficiency is awarded only from scored case attempts, never from lesson
 * completion.
 */

export const PROFICIENCY = ["Foundation", "Guided Practitioner", "Independent Practitioner", "Specialist / Analyst", "Team Lead / Quality Auditor", "Manager / Strategist"] as const;
export const proficiencyName = (n: number) => PROFICIENCY[n - 1] ?? `Level ${n}`;

const Input = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/, "Use 2–20 capital letters, digits or hyphens for the code."),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1000),
  expectedBehavior: z.string().trim().min(10).max(1000),
  proficiencyLevel: z.coerce.number().int().min(1).max(6),
  criteria: z.array(z.enum(CRITERIA)).min(1, "Pick at least one rubric criterion as evidence."),
  threshold: z.coerce.number().int().min(0).max(100),
  reassessMonths: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1).max(60).nullable()),
});

function log(actor: Actor, action: Parameters<typeof audit>[0]["action"], id: string, after?: unknown, before?: unknown) {
  return audit({ actorId: actor.id, actorRoles: actor.staffRoles, action, entity: "Competency", entityId: id, after, before });
}

export async function createCompetency(actor: Actor, input: unknown) {
  await assertCan(actor, "assessment.manage");
  const d = Input.parse(input);
  if (await prisma.competency.findUnique({ where: { code: d.code } })) throw new ServiceError(`A competency with code ${d.code} already exists.`);
  const c = await prisma.competency.create({ data: { ...d, authorId: actor.id } });
  await log(actor, "create", c.id, d);
  return c;
}

/** Editing an active competency sends it back to draft: changed evidence rules need review again. */
export async function updateCompetency(actor: Actor, id: string, input: unknown, lockVersion: number) {
  await assertCan(actor, "assessment.manage", { entity: "Competency", id });
  const d = Input.parse(input);
  const before = await prisma.competency.findUnique({ where: { id } });
  if (!before) throw new ServiceError("That competency no longer exists.");
  if (before.status === "RETIRED") throw new ServiceError("Restore the competency before editing it.");
  if (d.code !== before.code && (await prisma.competency.count({ where: { outcomes: { some: {} }, id } }))) throw new ServiceError("The code cannot change once outcomes have been recorded against it.");
  const res = await prisma.competency.updateMany({ where: { id, lockVersion }, data: { ...d, status: "DRAFT", reviewerId: null, reviewedAt: null, lockVersion: { increment: 1 } } });
  if (!res.count) throw new ServiceError("Someone else saved this competency after you opened it. Reload to see their changes.");
  await log(actor, "update", id, d, { code: before.code, criteria: before.criteria, threshold: before.threshold, status: before.status });
}

export async function activateCompetency(actor: Actor, id: string) {
  if (!can(actor, "content.review.academic")) {
    await audit({ actorId: actor.id, action: "deny", entity: "Competency", entityId: id, outcome: "denied", after: { permission: "content.review.academic" } });
    throw new AuthorisationError("You do not have permission to review competencies.", 403);
  }
  const c = await prisma.competency.findUnique({ where: { id } });
  if (!c || c.status !== "DRAFT") throw new ServiceError("Only a draft competency can be activated.");
  if (c.authorId === actor.id) throw new ServiceError("You wrote this competency. A different reviewer must activate it.");
  const res = await prisma.competency.updateMany({ where: { id, status: "DRAFT", lockVersion: c.lockVersion }, data: { status: "ACTIVE", reviewerId: actor.id, reviewedAt: new Date() } });
  if (!res.count) throw new ServiceError("The competency changed while you were reviewing it. Reload and check again.");
  await log(actor, "approve", id, { code: c.code });
}

export async function setCompetencyRetired(actor: Actor, id: string, retired: boolean) {
  await assertCan(actor, "assessment.manage", { entity: "Competency", id });
  const c = await prisma.competency.findUnique({ where: { id } });
  if (!c) throw new ServiceError("That competency no longer exists.");
  if (retired && c.status === "RETIRED") return;
  if (!retired && c.status !== "RETIRED") return;
  await prisma.competency.update({ where: { id }, data: retired ? { status: "RETIRED" } : { status: "DRAFT", reviewerId: null, reviewedAt: null } });
  await log(actor, retired ? "archive" : "restore", id, { code: c.code });
}

export interface CompetencyStanding {
  competencyId: string;
  code: string;
  name: string;
  proficiencyLevel: number;
  demonstrated: boolean;
  evidenceScore: number;
  attemptId: string;
  at: Date;
  expired: boolean;
}

/**
 * Each competency's standing for some learners: demonstrated if any current (not superseded,
 * not expired) outcome demonstrates it; otherwise the latest outcome, so "not yet" is visible.
 */
export async function standings(userIds: string[], now = new Date()) {
  const rows = await prisma.competencyOutcome.findMany({
    where: { userId: { in: userIds }, supersededAt: null },
    include: { competency: { select: { code: true, name: true, proficiencyLevel: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
  const out = new Map<string, CompetencyStanding[]>();
  for (const uid of userIds) {
    const mine = rows.filter((r) => r.userId === uid && r.competency.status !== "RETIRED");
    const byComp = new Map<string, CompetencyStanding>();
    for (const r of mine) {
      const expired = !!r.expiresAt && r.expiresAt <= now;
      const s: CompetencyStanding = { competencyId: r.competencyId, code: r.competency.code, name: r.competency.name, proficiencyLevel: r.competency.proficiencyLevel, demonstrated: r.demonstrated && !expired, evidenceScore: r.evidenceScore, attemptId: r.attemptId, at: r.createdAt, expired };
      const prev = byComp.get(r.competencyId);
      if (!prev || (!prev.demonstrated && s.demonstrated)) byComp.set(r.competencyId, s);
    }
    out.set(uid, [...byComp.values()].sort((a, b) => a.code.localeCompare(b.code)));
  }
  return out;
}
