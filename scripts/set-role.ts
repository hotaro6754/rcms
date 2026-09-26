import "dotenv/config";
import { prisma } from "../lib/db";

/**
 * Change an existing account's role from the command line, for the rare case the
 * owner-by-email rule (OWNER_EMAILS) did not apply, e.g. the account existed first.
 *
 *   npx tsx scripts/set-role.ts someone@example.com ADMIN
 *
 * Roles: STUDENT, TRAINER, ADMIN, OWNER. Written to the audit log.
 */
const ROLES = ["STUDENT", "TRAINER", "ADMIN", "OWNER"] as const;

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error("Usage: npx tsx scripts/set-role.ts <email> <STUDENT|TRAINER|ADMIN|OWNER>");
  }
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error(`No account for ${email}. Ask them to sign up first.`);
  await prisma.user.update({ where: { id: user.id }, data: { role: role as (typeof ROLES)[number] } });
  await prisma.auditLog.create({
    data: { action: "update", entity: "User", entityId: user.id, diff: { before: { role: user.role }, after: { role, via: "scripts/set-role.ts" } } },
  });
  console.log(`[set-role] ${email}: ${user.role} -> ${role}`);
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
