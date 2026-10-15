import "dotenv/config";
import { prisma } from "../lib/db";

/**
 * The first Super Administrator. There is deliberately no web route for this.
 *
 *   npm run admin:bootstrap -- someone@example.com
 *
 * The account must already exist and be verified (sign up through the site first; the
 * person sets their own password, nobody else ever handles it). This refuses to run once
 * any Super Administrator exists: from then on, roles are granted in the Admin Control
 * Center through a maker-checker approval.
 *
 * OWNER_EMAILS remains as an alternative: an address listed there becomes OWNER (which
 * implies Super Administrator) at sign-up.
 */
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: npm run admin:bootstrap -- <email>");
  const existing = await prisma.user.count({ where: { OR: [{ role: "OWNER" }, { staffRoles: { some: { role: "SUPER_ADMIN" } } }] } });
  if (existing > 0) {
    throw new Error("A Super Administrator already exists. Grant roles from Admin › Users and roles, where a second person approves them.");
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account for ${email}. Ask them to sign up first.`);
  if (!user.emailVerified) throw new Error(`${email} has not verified their email address yet.`);
  await prisma.$transaction([
    prisma.staffRoleAssignment.create({ data: { userId: user.id, role: "SUPER_ADMIN", grantedById: null, approvedById: null } }),
    prisma.auditLog.create({ data: { actorId: null, actorRoles: ["SYSTEM"], action: "assign", entity: "User", entityId: user.id, diff: { before: null, after: { role: "SUPER_ADMIN", via: "scripts/bootstrap-admin.ts" } } } }),
  ]);
  console.log(`[bootstrap-admin] ${email} is now Super Administrator. Set up MFA on first sign-in at /account/security.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
