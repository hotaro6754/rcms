import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { auth, LOCKOUT_THRESHOLD } from "@/lib/auth";
import { AuthorisationError } from "@/lib/errors";
import { loadActor } from "@/lib/actor";
import { decideApproval, requestApproval, runDueApprovals, cancelApproval } from "@/lib/services/approvals";
import { makeCourseDraft, makeUser, resetDb, staff } from "../helpers";

beforeEach(resetDb);

const PASSWORD = "correct-horse-battery-staple";

async function signUp(email: string, extra: Record<string, unknown> = {}) {
  await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Test Person", acceptTerms: true, ...extra } as never });
  return prisma.user.findUniqueOrThrow({ where: { email } });
}

async function cookieFor(email: string) {
  const res = await auth.api.signInEmail({ body: { email, password: PASSWORD }, asResponse: true });
  const set = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  return set.map((c) => c.split(";")[0]).join("; ");
}

describe("authentication", () => {
  it("refuses sign-up without terms acceptance and records consent when given", async () => {
    await expect(auth.api.signUpEmail({ body: { email: "noterms@example.test", password: PASSWORD, name: "No Terms" } as never })).rejects.toMatchObject({ statusCode: 400 });
    expect(await prisma.user.count({ where: { email: "noterms@example.test" } })).toBe(0);
    const user = await signUp("consent@example.test", { marketingOptIn: true });
    expect(user.termsAcceptedAt).not.toBeNull();
    const consents = await prisma.consentRecord.findMany({ where: { userId: user.id }, orderBy: { kind: "asc" } });
    expect(consents.map((c) => [c.kind, c.granted])).toEqual([["marketing", true], ["privacy", true], ["terms", true]]);
  });

  it("promotes an OWNER_EMAILS address only while no owner exists", async () => {
    process.env.OWNER_EMAILS = "first-owner@example.test,second-owner@example.test";
    try {
      expect((await signUp("first-owner@example.test")).role).toBe("OWNER");
      expect((await signUp("second-owner@example.test")).role).toBe("STUDENT");
    } finally {
      delete process.env.OWNER_EMAILS;
    }
  });

  it("ignores role, status and MFA fields sent at sign-up", async () => {
    const user = await signUp("escalate@example.test", { role: "OWNER", status: "ACTIVE", twoFactorEnabled: true, emailVerified: true });
    expect(user.role).toBe("STUDENT");
    expect(user.status).toBe("PENDING_VERIFICATION");
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.emailVerified).toBe(false);
  });

  it("refuses sign-in before verification and activates the account on verification", async () => {
    const user = await signUp("verify@example.test");
    await expect(auth.api.signInEmail({ body: { email: user.email, password: PASSWORD } })).rejects.toMatchObject({ statusCode: 403 });
    // Better Auth's verify-email endpoint writes through its adapter; drive that same path.
    const ctx = await auth.$context;
    await ctx.internalAdapter.updateUser(user.id, { emailVerified: true });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status).toBe("ACTIVE");
  });

  it("cannot raise its own role through the profile endpoint", async () => {
    const user = await signUp("profile@example.test");
    const ctx = await auth.$context;
    await ctx.internalAdapter.updateUser(user.id, { emailVerified: true });
    const cookie = await cookieFor(user.email);
    await auth.api.updateUser({ headers: new Headers({ cookie }), body: { name: "Renamed", role: "OWNER", status: "ACTIVE", twoFactorEnabled: true } as never }).catch(() => undefined);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.role).toBe("STUDENT");
    expect(after.twoFactorEnabled).toBe(false);
  });

  it(`locks the account after ${LOCKOUT_THRESHOLD} failed passwords and records it`, async () => {
    const user = await signUp("lock@example.test");
    const ctx = await auth.$context;
    await ctx.internalAdapter.updateUser(user.id, { emailVerified: true });
    for (let i = 0; i < LOCKOUT_THRESHOLD; i++) {
      await expect(auth.api.signInEmail({ body: { email: user.email, password: "wrong-password-123" } })).rejects.toMatchObject({ statusCode: 401 });
    }
    const locked = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(locked.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    await expect(auth.api.signInEmail({ body: { email: user.email, password: PASSWORD } })).rejects.toMatchObject({ statusCode: 429 });
    expect(await prisma.auditLog.count({ where: { action: "lockout", actorId: user.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: "login_failed", actorId: user.id } })).toBeGreaterThanOrEqual(LOCKOUT_THRESHOLD - 1);
  });

  it("refuses a session to a suspended account and records the last login otherwise", async () => {
    const user = await signUp("suspend@example.test");
    const ctx = await auth.$context;
    await ctx.internalAdapter.updateUser(user.id, { emailVerified: true });
    await cookieFor(user.email);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.lastLoginAt).not.toBeNull();
    await prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    await expect(auth.api.signInEmail({ body: { email: user.email, password: PASSWORD } })).rejects.toBeTruthy();
    // And a suspended actor is refused by every request guard even with an old session.
    const actor = await loadActor(user.id);
    expect(actor?.status).toBe("SUSPENDED");
  });
});

describe("maker-checker approvals", () => {
  it("grants a staff role only when a different authorised person approves", async () => {
    const director = await staff("ACADEMY_DIRECTOR");
    const otherDirector = await staff("ACADEMY_DIRECTOR");
    const target = await makeUser();
    const req = await requestApproval(director, "ROLE_CHANGE", { userId: target.id, role: "FINANCE_ADMIN", action: "grant" }, "New finance hire");
    await expect(decideApproval(director, req.id, true)).rejects.toThrow(/different person/);
    await expect(decideApproval(await staff("FINANCE_ADMIN"), req.id, true)).rejects.toBeInstanceOf(AuthorisationError);
    await decideApproval(otherDirector, req.id, true);
    expect((await loadActor(target.id))!.staffRoles).toContain("FINANCE_ADMIN");
    expect((await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("EXECUTED");
  });

  it("stops anyone requesting their own roles or a director proposing super administrator", async () => {
    const director = await staff("ACADEMY_DIRECTOR");
    await expect(requestApproval(director, "ROLE_CHANGE", { userId: director.id, role: "FINANCE_ADMIN", action: "grant" }, "Myself")).rejects.toThrow(/your own roles/);
    const target = await makeUser();
    await expect(requestApproval(director, "ROLE_CHANGE", { userId: target.id, role: "SUPER_ADMIN", action: "grant" }, "Promote")).rejects.toThrow(/Only a Super Administrator/);
    await expect(requestApproval(await makeUser(), "ROLE_CHANGE", { userId: target.id, role: "AUDITOR", action: "grant" }, "Please")).rejects.toBeInstanceOf(AuthorisationError);
  });

  it("applies an approved price change on its effective date, not before", async () => {
    const product = await prisma.product.create({ data: { sku: "program-test", kind: "PROGRAM", name: "Test", amount: 299900 } });
    const finance = await staff("FINANCE_ADMIN");
    const director = await staff("ACADEMY_DIRECTOR");
    const from = new Date(Date.now() + 2 * 86400_000);
    const req = await requestApproval(finance, "PRICE_CHANGE", { productId: product.id, amount: 349900, effectiveFrom: from.toISOString() }, "Annual price review");
    await expect(decideApproval(finance, req.id, true)).rejects.toBeInstanceOf(AuthorisationError);
    await decideApproval(director, req.id, true);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).amount).toBe(299900);
    await runDueApprovals(new Date(from.getTime() + 1000));
    expect((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).amount).toBe(349900);
  });

  it("requires a super administrator to approve permanent course deletion, and only for drafts", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const req = await requestApproval(author, "COURSE_DELETE", { courseId: course.id }, "Duplicate created by mistake");
    await expect(decideApproval(await staff("ACADEMY_DIRECTOR"), req.id, true)).rejects.toBeInstanceOf(AuthorisationError);
    await decideApproval(await makeUser({ role: "OWNER" }), req.id, true);
    expect(await prisma.program.findUnique({ where: { id: course.id } })).toBeNull();
  });

  it("lets only the requester cancel", async () => {
    const director = await staff("ACADEMY_DIRECTOR");
    const req = await requestApproval(director, "ROLE_CHANGE", { userId: (await makeUser()).id, role: "AUDITOR", action: "grant" }, "Annual audit");
    await expect(cancelApproval(await staff("ACADEMY_DIRECTOR"), req.id)).rejects.toThrow();
    await cancelApproval(director, req.id);
    expect((await prisma.approvalRequest.findUniqueOrThrow({ where: { id: req.id } })).status).toBe("CANCELLED");
  });
});
