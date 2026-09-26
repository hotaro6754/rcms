import "dotenv/config";
import { auth } from "../lib/auth";
import { prisma } from "../lib/db";

/**
 * LOCAL DEVELOPMENT ONLY. Creates three verified accounts so the portal, studio and admin
 * can be exercised without an email provider:
 *
 *   student@rcms.test   STUDENT
 *   trainer@rcms.test   TRAINER
 *   admin@rcms.test     OWNER
 *
 * Refuses to run against anything but a local database. The passwords below are test
 * values for this machine's dev database and nothing else.
 *
 *   npx tsx scripts/dev-accounts.ts
 */

const ACCOUNTS = [
  { email: "student@rcms.test", name: "Test Student", role: "STUDENT", password: "Rcms-7LBJbG7LoTk-dev" },
  { email: "trainer@rcms.test", name: "Test Trainer", role: "TRAINER", password: "Rcms-BRn2nuMKfmE-dev" },
  { email: "admin@rcms.test", name: "Test Admin", role: "OWNER", password: "Rcms-czd65N6VC6I-dev" },
] as const;

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.NODE_ENV === "production" || !/@(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error("dev-accounts runs only against a local development database.");
  }
  for (const a of ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (!existing) {
      await auth.api.signUpEmail({ body: { email: a.email, password: a.password, name: a.name } });
    }
    await prisma.user.update({ where: { email: a.email }, data: { emailVerified: true, role: a.role } });
    console.log(`[dev-accounts] ${a.email} ready (${a.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
