import "dotenv/config";
import type { StaffRole } from "@prisma/client";
import { auth } from "../lib/auth";
import { prisma } from "../lib/db";

/**
 * LOCAL DEVELOPMENT ONLY. Creates verified accounts so every surface can be exercised
 * without an email provider: a learner, a vendor contact, and one account per staff role.
 *
 *   npx tsx scripts/dev-accounts.ts
 *
 * The addresses are on rcmexcel.com so they look like the real ones, but they exist only in
 * this machine's dev database and the password is public (it is in the README). They are never
 * mail-capable accounts. The script therefore refuses to run anywhere that could be the live
 * site: in production mode, against a database that is not on this machine, or when the site's
 * own address is not localhost. (On a single-server deployment the database IS on 127.0.0.1,
 * which is why the database address alone is not enough.)
 *
 * On the live site nobody gets a password from this repository: people sign up with their own
 * and the first Super Administrator is made with `npm run admin:bootstrap`.
 */

const PASSWORD = "Rcms-dev-password-1";

const STAFF: [StaffRole, string][] = [
  ["SUPER_ADMIN", "admin"],
  ["ACADEMY_DIRECTOR", "director"],
  ["CONTENT_ADMIN", "content"],
  ["ACADEMIC_REVIEWER", "academic"],
  ["COMPLIANCE_REVIEWER", "compliance"],
  ["SUBSCRIBER_ADMIN", "subscribers"],
  ["SUPPORT_AGENT", "agent"],
  ["SUPPORT_MANAGER", "supportmgr"],
  ["FINANCE_ADMIN", "finance"],
  ["VENDOR_MANAGER", "vendormgr"],
  ["REPORTING_ANALYST", "analyst"],
  ["AUDITOR", "auditor"],
];

async function ensure(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) await auth.api.signUpEmail({ body: { email, password: PASSWORD, name, acceptTerms: true } as { email: string; password: string; name: string } });
  return prisma.user.update({ where: { email }, data: { emailVerified: true, status: "ACTIVE" } });
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const local = (u: string) => {
    try {
      return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(u).hostname);
    } catch {
      return false;
    }
  };
  const siteUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (process.env.NODE_ENV === "production" || !local(url) || !local(siteUrl)) {
    throw new Error("dev-accounts runs only on a development machine: not in production mode, with a local database, and with the site address set to localhost.");
  }
  await ensure("student@rcmexcel.com", "Test Learner");
  console.log("[dev-accounts] student@rcmexcel.com (learner)");
  for (const [role, slug] of STAFF) {
    const u = await ensure(`${slug}@rcmexcel.com`, `Test ${role.replace(/_/g, " ").toLowerCase()}`);
    await prisma.staffRoleAssignment.upsert({ where: { userId_role: { userId: u.id, role } }, create: { userId: u.id, role }, update: {} });
    console.log(`[dev-accounts] ${slug}@rcmexcel.com (${role})`);
  }
  const vendorUser = await ensure("vendor@rcmexcel.com", "Test Vendor Contact");
  await prisma.user.update({ where: { id: vendorUser.id }, data: { role: "VENDOR" } });
  const vendor = await prisma.vendor.upsert({
    where: { code: "VEN-0001" },
    create: { code: "VEN-0001", legalName: "Synthetic Content Studio LLP", tradingName: "Synthetic Studio", type: "CONTENT_AUTHOR", status: "ACTIVE", country: "India", contactName: "Test Vendor Contact", contactEmail: "vendor@rcmexcel.com", services: "Lesson writing and assessment items", commercialModel: "Fee per module" },
    update: {},
  });
  await prisma.vendorMember.upsert({ where: { vendorId_userId: { vendorId: vendor.id, userId: vendorUser.id } }, create: { vendorId: vendor.id, userId: vendorUser.id }, update: {} });
  console.log("[dev-accounts] vendor@rcmexcel.com (vendor portal, VEN-0001)");
  // A corporate account whose manager can see the test learner's progress and competencies.
  const org = await prisma.organisation.upsert({ where: { slug: "synthetic-billing-partners" }, create: { name: "Synthetic Billing Partners (fictional)", slug: "synthetic-billing-partners", seats: 10 }, update: {} });
  const manager = await ensure("manager@rcmexcel.com", "Test Team Manager");
  const learner = await prisma.user.findUniqueOrThrow({ where: { email: "student@rcmexcel.com" } });
  await prisma.orgMember.upsert({ where: { orgId_userId: { orgId: org.id, userId: manager.id } }, create: { orgId: org.id, userId: manager.id, isManager: true }, update: { isManager: true } });
  await prisma.orgMember.upsert({ where: { orgId_userId: { orgId: org.id, userId: learner.id } }, create: { orgId: org.id, userId: learner.id }, update: {} });
  // Support teams: the agent works general and technical cases; the support manager leads general.
  const teams = await prisma.supportTeam.findMany({ where: { key: { in: ["general", "technical", "academic", "billing"] } } });
  const agent = await prisma.user.findUniqueOrThrow({ where: { email: "agent@rcmexcel.com" } });
  const lead = await prisma.user.findUniqueOrThrow({ where: { email: "supportmgr@rcmexcel.com" } });
  for (const t of teams) {
    if (t.key === "general" || t.key === "technical") await prisma.supportTeamMember.upsert({ where: { teamId_userId: { teamId: t.id, userId: agent.id } }, create: { teamId: t.id, userId: agent.id }, update: {} });
    await prisma.supportTeamMember.upsert({ where: { teamId_userId: { teamId: t.id, userId: lead.id } }, create: { teamId: t.id, userId: lead.id, isLead: true }, update: {} });
  }
  if (teams.length) console.log("[dev-accounts] support teams: agent@ in general and technical; supportmgr@ leads all teams (run db:seed first)");
  console.log("[dev-accounts] manager@rcmexcel.com (corporate manager of Synthetic Billing Partners; student@ is a member)");
  console.log(`[dev-accounts] password for all: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
