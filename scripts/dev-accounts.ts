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
 * Refuses to run against anything but a local database. The password is a test value for
 * this machine's dev database and nothing else.
 */

const PASSWORD = "Rcms-dev-password-1";

const STAFF: [StaffRole, string][] = [
  ["SUPER_ADMIN", "super"],
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
  if (!existing) await auth.api.signUpEmail({ body: { email, password: PASSWORD, name } });
  return prisma.user.update({ where: { email }, data: { emailVerified: true, status: "ACTIVE" } });
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production" || !/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error("dev-accounts runs only against a local development database.");
  }
  await ensure("student@rcms.test", "Test Learner");
  console.log("[dev-accounts] student@rcms.test (learner)");
  for (const [role, slug] of STAFF) {
    const u = await ensure(`${slug}@rcms.test`, `Test ${role.replace(/_/g, " ").toLowerCase()}`);
    await prisma.staffRoleAssignment.upsert({ where: { userId_role: { userId: u.id, role } }, create: { userId: u.id, role }, update: {} });
    console.log(`[dev-accounts] ${slug}@rcms.test (${role})`);
  }
  const vendorUser = await ensure("vendor@rcms.test", "Test Vendor Contact");
  await prisma.user.update({ where: { id: vendorUser.id }, data: { role: "VENDOR" } });
  const vendor = await prisma.vendor.upsert({
    where: { code: "VEN-0001" },
    create: { code: "VEN-0001", legalName: "Synthetic Content Studio LLP", tradingName: "Synthetic Studio", type: "CONTENT_AUTHOR", status: "ACTIVE", country: "India", contactName: "Test Vendor Contact", contactEmail: "vendor@rcms.test", services: "Lesson writing and assessment items", commercialModel: "Fee per module" },
    update: {},
  });
  await prisma.vendorMember.upsert({ where: { vendorId_userId: { vendorId: vendor.id, userId: vendorUser.id } }, create: { vendorId: vendor.id, userId: vendorUser.id }, update: {} });
  console.log("[dev-accounts] vendor@rcms.test (vendor portal, VEN-0001)");
  console.log(`[dev-accounts] password for all: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
