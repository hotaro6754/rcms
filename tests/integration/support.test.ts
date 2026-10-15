import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorisationError } from "@/lib/errors";
import * as support from "@/lib/services/support/tickets";
import * as routing from "@/lib/services/support/routing";
import { seedSupport } from "../../prisma/seed-support";
import { makeUser, resetDb, staff } from "../helpers";

beforeEach(resetDb);

const team = (key: string) => prisma.supportTeam.findUniqueOrThrow({ where: { key } });
const open = (actor: Awaited<ReturnType<typeof makeUser>>, over: Record<string, unknown> = {}) =>
  support.openTicket(actor, { subject: "Cannot open module 2", category: "TECHNICAL", body: "The page shows an error when I open it.", ...over });

async function setup() {
  await seedSupport(prisma);
  const lead = await staff("SUPPORT_MANAGER");
  const a1 = await staff("SUPPORT_AGENT");
  const a2 = await staff("SUPPORT_AGENT");
  const tech = await team("technical");
  await routing.setTeamMember(lead, tech.id, a1.id, { maxOpen: 2 });
  await routing.setTeamMember(lead, tech.id, a2.id, { maxOpen: 2 });
  return { lead, a1, a2, tech };
}

describe("routing and assignment", () => {
  it("routes by category and assigns the least-loaded available member, then queues when everyone is full", async () => {
    const { a1, a2, tech, lead } = await setup();
    const learner = await makeUser();
    const r1 = await open(learner);
    expect(r1.ticket.teamId).toBe(tech.id);
    const first = r1.ticket.assigneeId;
    expect([a1.id, a2.id]).toContain(first);
    const r2 = await open(learner);
    expect(r2.ticket.assigneeId).not.toBe(first);
    await open(learner);
    await open(learner);
    const r5 = await open(learner);
    expect(r5.ticket.assigneeId).toBeNull();
    expect(r5.ticket.status).toBe("WAITING");
    const events = await prisma.supportTicketEvent.findMany({ where: { ticketId: r5.ticket.id }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.kind)).toEqual(["CREATED", "ROUTED", "UNASSIGNED"]);
    expect(events[2].note).toMatch(/waiting in the team queue/);

    // Unavailable members are skipped.
    await routing.setTeamMember(lead, tech.id, a1.id, { available: false, maxOpen: 10 });
    await routing.setTeamMember(lead, tech.id, a2.id, { maxOpen: 10 });
    expect((await open(learner)).ticket.assigneeId).toBe(a2.id);
  });

  it("keeps a case in the shared queue when no team exists at all", async () => {
    const learner = await makeUser();
    const r = await open(learner);
    expect(r.ticket.teamId).toBeNull();
    expect(r.ticket.assigneeId).toBeNull();
    const mgr = await staff("SUPPORT_MANAGER");
    expect((await support.queue(mgr, { view: "unassigned" })).map((t) => t.id)).toContain(r.ticket.id);
  });

  it("lets only one agent accept an unassigned case when two try at once", async () => {
    const { lead, tech } = await setup();
    await prisma.supportTeam.update({ where: { id: tech.id }, data: { autoAssign: false } });
    const learner = await makeUser();
    const r = await open(learner);
    expect(r.ticket.assigneeId).toBeNull();
    const x = await staff("SUPPORT_AGENT");
    const y = await staff("SUPPORT_AGENT");
    await routing.setTeamMember(lead, tech.id, x.id, {});
    await routing.setTeamMember(lead, tech.id, y.id, {});
    const results = await Promise.allSettled([support.assign(x, r.ticket.id, x.id), support.assign(y, r.ticket.id, y.id)]);
    expect(results.filter((p) => p.status === "fulfilled")).toHaveLength(1);
    const t = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect([x.id, y.id]).toContain(t.assigneeId);
  });

  it("refuses to assign someone who cannot answer support cases", async () => {
    const { lead } = await setup();
    const learner = await makeUser();
    const r = await open(learner);
    await expect(support.assign(lead, r.ticket.id, learner.id)).rejects.toThrow(/cannot answer/);
  });

  it("moves a case between teams and auto-assigns in the new team", async () => {
    const { lead } = await setup();
    const academic = await team("academic");
    const tutor = await staff("SUPPORT_AGENT");
    await routing.setTeamMember(lead, academic.id, tutor.id, {});
    await prisma.supportTeam.update({ where: { key: "technical" }, data: { autoAssign: false } });
    const learner = await makeUser();
    const r = await open(learner);
    await support.setTeam(lead, r.ticket.id, academic.id);
    const t = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect(t.teamId).toBe(academic.id);
    expect(t.assigneeId).toBe(tutor.id);
  });
});

describe("state machine and conversation", () => {
  it("rejects undefined moves, requires a resolution summary, and reopens on a learner reply", async () => {
    const { a1, a2 } = await setup();
    const learner = await makeUser();
    const r = await open(learner);
    const agent = r.ticket.assigneeId === a1.id ? a1 : a2;
    await expect(support.triage(agent, r.ticket.id, { status: "CLOSED" })).rejects.toThrow(/cannot move/);
    await support.addMessage(agent, r.ticket.id, "Please try clearing the cache.", {});
    let t = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect(t.status).toBe("PENDING_SUBSCRIBER");
    expect(t.firstResponseAt).not.toBeNull();
    await support.addMessage(learner, r.ticket.id, "Still broken.");
    t = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect(t.status).toBe("IN_PROGRESS");
    await expect(support.triage(agent, r.ticket.id, { status: "RESOLVED" })).rejects.toThrow(/resolution summary/);
    await support.triage(agent, r.ticket.id, { status: "RESOLVED", resolutionSummary: "Fixed a broken link in module 2." });
    t = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect(t.resolutionSummary).toMatch(/broken link/);
    await support.addMessage(learner, r.ticket.id, "It happens again on module 3.");
    t = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect(t.status).toBe("REOPENED");
    expect(t.reopenCount).toBe(1);
    expect(await prisma.supportTicketEvent.count({ where: { ticketId: t.id, kind: "REOPENED" } })).toBe(1);
  });

  it("does not let a learner reopen a case closed more than 14 days ago", async () => {
    await setup();
    const learner = await makeUser();
    const r = await open(learner);
    await prisma.supportTicket.update({ where: { id: r.ticket.id }, data: { status: "CLOSED", closedAt: new Date(Date.now() - 15 * 86400_000) } });
    await expect(support.addMessage(learner, r.ticket.id, "Again?")).rejects.toThrow(/more than 14 days/);
  });

  it("hides internal notes and history from the learner, and other people's cases from agents outside the team", async () => {
    const { a1, a2 } = await setup();
    const learner = await makeUser();
    const r = await open(learner);
    const agent = r.ticket.assigneeId === a1.id ? a1 : a2;
    await support.addMessage(agent, r.ticket.id, "Internal: check the CDN logs.", { internal: true });
    const view = await support.viewTicket(learner, r.ticket.id);
    expect(view.ticket.messages.some((m) => m.internal)).toBe(false);
    expect(view.ticket.events).toBeUndefined();
    const outsider = await staff("SUPPORT_AGENT");
    await expect(support.viewTicket(outsider, r.ticket.id)).rejects.toBeInstanceOf(AuthorisationError);
    const other = await makeUser();
    await expect(support.viewTicket(other, r.ticket.id)).rejects.toBeInstanceOf(AuthorisationError);
  });

  it("raises priority from impact and urgency, and routes security reports as urgent and escalated", async () => {
    await setup();
    const learner = await makeUser();
    const r = await open(learner, { impact: 3, urgency: 3 });
    expect(r.ticket.priority).toBe("URGENT");
    const s = await open(learner, { category: "PRIVACY_SECURITY", subject: "Saw another learner's data" });
    expect(s.ticket.status).toBe("ESCALATED");
    expect(s.ticket.assigneeId).toBeNull();
  });
});

describe("SLA", () => {
  it("sets due times, records a breach once, raises priority, and closes stale resolved cases", async () => {
    const { a1, a2 } = await setup();
    const learner = await makeUser();
    const r = await open(learner);
    const t0 = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect(t0.firstResponseDueAt!.getTime()).toBeGreaterThan(t0.createdAt.getTime());
    expect(t0.resolutionDueAt!.getTime()).toBeGreaterThan(t0.firstResponseDueAt!.getTime());

    const later = new Date(t0.firstResponseDueAt!.getTime() + 60_000);
    const run1 = await support.runSupportSla(later);
    expect(run1.breached.map((b) => b.target)).toEqual(["first response"]);
    const t1 = await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } });
    expect(t1.priority).toBe("HIGH");
    expect(t1.firstResponseBreachedAt).not.toBeNull();
    expect((await support.runSupportSla(later)).breached).toEqual([]);

    const agent = r.ticket.assigneeId === a1.id ? a1 : a2;
    await support.triage(agent, r.ticket.id, { status: "IN_PROGRESS" });
    await support.triage(agent, r.ticket.id, { status: "RESOLVED", resolutionSummary: "Fixed and confirmed with the learner." });
    await prisma.supportTicket.update({ where: { id: r.ticket.id }, data: { resolvedAt: new Date(Date.now() - 8 * 86400_000) } });
    expect((await support.runSupportSla()).closed).toBe(1);
    expect((await prisma.supportTicket.findUniqueOrThrow({ where: { id: r.ticket.id } })).status).toBe("CLOSED");

    const m = await routing.supportMetrics(30);
    expect(m.created).toBe(1);
    expect(m.resolvedCount).toBe(1);
    expect(m.breaches["first response"]).toBe(1);
  });

  it("only support leads change routing and targets", async () => {
    await setup();
    const agent = await staff("SUPPORT_AGENT");
    await expect(routing.saveSlaPolicy(agent, "NORMAL", { firstResponseMinutes: 60, resolutionMinutes: 600, businessHours: true })).rejects.toBeInstanceOf(AuthorisationError);
    const lead = await staff("SUPPORT_MANAGER");
    await expect(routing.saveSlaPolicy(lead, "NORMAL", { firstResponseMinutes: 600, resolutionMinutes: 60, businessHours: true })).rejects.toThrow(/cannot be shorter/);
    await expect(routing.saveCategorySetting(lead, "PRIVACY_SECURITY", { active: false, defaultPriority: "URGENT" })).rejects.toThrow(/always be able/);
  });
});
