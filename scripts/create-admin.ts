import "dotenv/config";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { STAFF_ROLES, type StaffRoleName } from "../lib/permissions";
import { allowCliAccountCreation } from "../lib/launch";

/**
 * Creates a staff account from the server. This is how administrators are made while the site
 * is in pre-launch lockdown (lib/launch.ts), when the website creates no accounts at all.
 *
 *   npm run admin:create -- someone@example.com "Full Name"            first Super Administrator
 *   npm run admin:create -- someone@example.com "Full Name" CONTENT_ADMIN
 *
 * The password is typed at a hidden prompt (or read from ADMIN_PASSWORD for automation) and
 * never stored anywhere but as a hash. The account is created verified and active. A Super
 * Administrator is created only when none exists yet; after that, Super Administrator is granted
 * in the admin, where a second person approves it. Every grant is written to the audit log.
 *
 * On first sign-in the person is sent to set up two-step verification before the admin opens.
 */

function ask(question: string, hidden: boolean): Promise<string> {
  const muted = new Writable({
    write(chunk, _enc, done) {
      if (!hidden) process.stdout.write(chunk);
      done();
    },
  });
  const rl = createInterface({ input: process.stdin, output: muted, terminal: true });
  process.stdout.write(question);
  return new Promise((resolve) =>
    rl.question("", (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    }),
  );
}

async function main() {
  const [rawEmail, rawName, rawRole] = process.argv.slice(2);
  const email = rawEmail?.trim().toLowerCase();
  const name = rawName?.trim();
  const role = (rawRole?.trim().toUpperCase() || "SUPER_ADMIN") as StaffRoleName;
  if (!email || !name) throw new Error('Usage: npm run admin:create -- <email> "<Full Name>" [ROLE]');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That email address does not look right.");
  if (!(STAFF_ROLES as readonly string[]).includes(role)) throw new Error(`Unknown role ${role}. One of: ${STAFF_ROLES.join(", ")}`);

  allowCliAccountCreation();
  const { prisma } = await import("../lib/db");
  const { auth } = await import("../lib/auth");

  try {
    const superAdmins = await prisma.user.count({ where: { OR: [{ role: "OWNER" }, { staffRoles: { some: { role: "SUPER_ADMIN" } } }] } });
    if (role === "SUPER_ADMIN" && superAdmins > 0) {
      throw new Error("A Super Administrator already exists. Grant Super Administrator from Admin › Users and roles, where a second person approves it.");
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const password = process.env.ADMIN_PASSWORD ?? (await ask("Password (10+ characters, hidden): ", true));
      if (password.length < 10) throw new Error("The password must be at least 10 characters.");
      if (!process.env.ADMIN_PASSWORD) {
        const again = await ask("Same password again: ", true);
        if (again !== password) throw new Error("The two passwords do not match.");
      }
      await auth.api.signUpEmail({ body: { email, password, name, acceptTerms: true } as { email: string; password: string; name: string } });
      user = await prisma.user.update({ where: { email }, data: { emailVerified: true, status: "ACTIVE" } });
      console.log(`[admin:create] Account created for ${email}.`);
    } else {
      console.log(`[admin:create] ${email} already has an account; adding the role only.`);
    }

    await prisma.$transaction([
      prisma.staffRoleAssignment.upsert({ where: { userId_role: { userId: user.id, role } }, create: { userId: user.id, role, grantedById: null, approvedById: null }, update: {} }),
      prisma.auditLog.create({ data: { actorId: null, actorRoles: ["SYSTEM"], action: "assign", entity: "User", entityId: user.id, diff: { before: null, after: { role, via: "scripts/create-admin.ts" } } } }),
    ]);
    console.log(`[admin:create] ${email} is now ${role}. Sign in at /sign-in; two-step verification is set up on first sign-in.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
