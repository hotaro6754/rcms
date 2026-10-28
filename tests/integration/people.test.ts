import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { loadActor } from "@/lib/actor";
import { AuthorisationError } from "@/lib/errors";
import * as corp from "@/lib/services/people/corporate";
import * as subs from "@/lib/services/people/subscribers";
import { decideApproval, requestApproval } from "@/lib/services/approvals";
import { makeCourseDraft, makeUser, releaseCourse, resetDb, staff } from "../helpers";

beforeEach(resetDb);

describe("corporate accounts", () => {
  it("enforces seats, enrols groups, and limits managers to their own organisation", async () => {
    const admin = await staff("SUBSCRIBER_ADMIN");
    const author = await staff("CONTENT_ADMIN");
    const { course } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await releaseCourse(course.id, author);

    const org = await corp.createOrganisation(admin, { name: "Northgate Billing", seats: 2 });
    const other = await corp.createOrganisation(admin, { name: "Other Co", seats: 5 });
    const [a, b, c] = await Promise.all([makeUser(), makeUser(), makeUser()]);
    const ma = await corp.addMember(admin, org.id, a.email, true);
    const mb = await corp.addMember(admin, org.id, b.email);
    await expect(corp.addMember(admin, org.id, c.email)).rejects.toThrow(/seats are in use/);
    await expect(corp.updateOrganisation(admin, org.id, { name: "Northgate Billing", seats: 1 })).rejects.toThrow(/already hold seats/);

    const group = await corp.createGroup(admin, org.id, "AR team");
    await corp.setGroupMembers(admin, group.id, [ma.id, mb.id]);
    expect(await corp.assignGroupCourse(admin, group.id, course.id)).toBe(2);
    const e = await prisma.enrolment.findUniqueOrThrow({ where: { userId_programId: { userId: b.id, programId: course.id } } });
    expect(e.source).toBe("CORPORATE");
    expect(e.orgId).toBe(org.id);

    const manager = (await loadActor(a.id))!;
    expect(manager.managedOrgIds).toEqual([org.id]);
    const report = await corp.teamReport(manager, org.id);
    expect(report.rows).toHaveLength(2);
    await expect(corp.teamReport(manager, other.id)).rejects.toBeInstanceOf(AuthorisationError);
    await expect(corp.teamReport(b, org.id)).rejects.toBeInstanceOf(AuthorisationError);
    // Managers hold no admin permission.
    await expect(corp.createGroup(manager, org.id, "Mine")).rejects.toBeInstanceOf(AuthorisationError);

    await corp.removeMember(admin, mb.id);
    expect((await prisma.enrolment.findUniqueOrThrow({ where: { id: e.id } })).state).toBe("CANCELLED");
  });
});

describe("subscriber administration", () => {
  it("suspends with a reason, ends sessions, and keeps agents read-only", async () => {
    const admin = await staff("SUBSCRIBER_ADMIN");
    const agent = await staff("SUPPORT_AGENT");
    const learner = await makeUser({ email: "learner-one@example.test" });
    await prisma.session.create({ data: { userId: learner.id, token: "t-1", expiresAt: new Date(Date.now() + 86400_000) } });
    await expect(subs.setStatus(agent, learner.id, "SUSPENDED", "abuse")).rejects.toBeInstanceOf(AuthorisationError);
    await expect(subs.setStatus(admin, learner.id, "SUSPENDED", "")).rejects.toThrow(/reason/);
    await subs.setStatus(admin, learner.id, "SUSPENDED", "Repeated abusive messages to support");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.id } })).status).toBe("SUSPENDED");
    expect(await prisma.session.count({ where: { userId: learner.id } })).toBe(0);
    // A subscriber admin cannot change a staff account's status.
    await expect(subs.setStatus(admin, agent.id, "SUSPENDED", "test")).rejects.toThrow(/Super Administrator/);

    // Agents see a masked phone number; sensitive viewers see it, and that view is audited.
    await prisma.user.update({ where: { id: learner.id }, data: { phone: "+919876543210" } });
    expect((await subs.profile(agent, learner.id)).phone).toBe("••••10");
    expect((await subs.profile(admin, learner.id)).phone).toBe("+919876543210");
    expect(await prisma.auditLog.count({ where: { actorId: admin.id, entity: "User", entityId: learner.id, action: "download" } })).toBe(1);
  });

  it("masks identifiers in internal notes", async () => {
    const admin = await staff("SUBSCRIBER_ADMIN");
    const learner = await makeUser();
    const note = await subs.addNote(admin, learner.id, "Called about card 4111 1111 1111 1111 refund");
    expect(note.body).not.toContain("4111 1111 1111 1111");
  });

  it("requires a second person's approval for exports above the threshold, and neutralises formulas", async () => {
    const admin = await staff("SUBSCRIBER_ADMIN");
    const admin2 = await staff("SUBSCRIBER_ADMIN");
    await prisma.setting.create({ data: { key: "export.approvalThreshold", value: 2 } });
    await makeUser({ name: "=HYPERLINK(\"http://evil\")" });
    await makeUser();
    await makeUser();
    await expect(subs.exportSubscribers(admin, {})).rejects.toThrow(/Request approval/);
    const req = await requestApproval(admin, "DATA_EXPORT", { report: "subscribers", filters: {}, rowCount: 3 }, "Quarterly board reporting");
    await expect(decideApproval(admin, req.id, true)).rejects.toThrow(/different person/);
    await decideApproval(admin2, req.id, true);
    const out = await subs.exportSubscribers(admin, {});
    expect(out.count).toBe(3);
    expect(out.csv).toContain("'=HYPERLINK");
    expect(out.csv).not.toMatch(/phone|\+91/i);
  });

  it("anonymises an account on a completed deletion request", async () => {
    const admin = await staff("SUBSCRIBER_ADMIN");
    const learner = await makeUser({ name: "Asha Example", email: "asha@example.test" });
    const req = await subs.openPrivacyRequest(learner, "DELETION", "Please delete my account");
    await expect(subs.openPrivacyRequest(learner, "DELETION", "again")).rejects.toThrow(/already have an open request/);
    await expect(subs.resolvePrivacyRequest(admin, req.id, "COMPLETED", "")).rejects.toThrow(/Record what was done/);
    await subs.resolvePrivacyRequest(admin, req.id, "COMPLETED", "Identity verified by email reply; anonymised");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: learner.id } });
    expect(u.name).toBe("Deleted learner");
    expect(u.email).not.toContain("asha");
    expect(u.status).toBe("ARCHIVED");
  });
});

describe("self-service deactivation", () => {
  it("needs the confirmation phrase, ends sessions, and is refused for staff", async () => {
    const { deactivateOwnAccount } = await import("@/lib/services/people/account");
    const learner = await makeUser();
    await prisma.session.create({ data: { userId: learner.id, token: "t-self", expiresAt: new Date(Date.now() + 86400_000) } });
    await expect(deactivateOwnAccount(learner, "yes please")).rejects.toThrow(/Type DEACTIVATE/);
    await deactivateOwnAccount(learner, "deactivate");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: learner.id } })).status).toBe("DEACTIVATED");
    expect(await prisma.session.count({ where: { userId: learner.id } })).toBe(0);
    await expect(deactivateOwnAccount(await staff("SUPPORT_AGENT"), "DEACTIVATE")).rejects.toThrow(/administrator/);
  });
});
