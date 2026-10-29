#!/usr/bin/env node
/**
 * Grants a staff role from the server, for when the in-app approval cannot run. Roles are
 * normally granted in Admin › Users and roles, where one administrator requests and a
 * different one approves; with a single administrator nobody can approve, so the second
 * administrator (or the first reviewers) are added here instead.
 *
 *   npm run staff:grant -- someone@example.com SUPER_ADMIN
 *   node scripts/grant-staff-role.mjs someone@example.com ACADEMIC_REVIEWER
 *
 * Whoever can run this already holds the database credentials, so it gives no authority the
 * server did not already have; like scripts/bootstrap-admin.ts it is not reachable from the
 * web. The account must exist and be verified (the person signs up themselves; nobody else
 * handles their password), and every grant is written to the audit log. Running it again for
 * a role the person already holds changes nothing.
 *
 * Plain Node with the MariaDB driver (no tsx, no Prisma client), so it runs wherever the
 * app's node_modules are, including a database reached over Hostinger's Remote MySQL
 * (DATABASE_URL=mysql://user:password@host:3306/db?ssl=true).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import mariadb from "mariadb";

/** Keep in step with STAFF_ROLES in lib/permissions.ts (tests/unit/grant-staff-role.test.ts checks). */
export const GRANTABLE_ROLES = [
  "SUPER_ADMIN",
  "ACADEMY_DIRECTOR",
  "CONTENT_ADMIN",
  "ACADEMIC_REVIEWER",
  "COMPLIANCE_REVIEWER",
  "SUBSCRIBER_ADMIN",
  "SUPPORT_AGENT",
  "SUPPORT_MANAGER",
  "FINANCE_ADMIN",
  "VENDOR_MANAGER",
  "REPORTING_ANALYST",
  "AUDITOR",
];

/** Statuses that cannot use the platform (BLOCKED_STATUSES in lib/actor.ts). */
const BLOCKED = ["SUSPENDED", "DEACTIVATED", "ARCHIVED"];

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const role = process.argv[3]?.trim().toUpperCase();
  if (!email || !role) throw new Error("Usage: npm run staff:grant -- <email> <ROLE>\nRoles: " + GRANTABLE_ROLES.join(", "));
  if (!GRANTABLE_ROLES.includes(role)) throw new Error(`Unknown role ${role}. Roles: ${GRANTABLE_ROLES.join(", ")}`);
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const u = new URL(url);
  const ssl = ["true", "1", "required"].includes((u.searchParams.get("ssl") ?? "").toLowerCase());
  const conn = await mariadb.createConnection({
    // localhost can resolve to IPv6 (::1), which the database user may not be allowed from.
    host: u.hostname === "localhost" ? "127.0.0.1" : u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
    allowPublicKeyRetrieval: u.searchParams.get("allowPublicKeyRetrieval") === "true",
    ...(ssl ? { ssl: { rejectUnauthorized: true } } : {}),
    // The tables' collation; see lib/db-config.ts (without it Hostinger refuses comparisons).
    initSql: "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
  });
  try {
    const [user] = await conn.query("SELECT `id`, `emailVerified`, `status` FROM `User` WHERE `email` = ?", [email]);
    if (!user) throw new Error(`No account for ${email}. Ask them to sign up first.`);
    if (!user.emailVerified) throw new Error(`${email} has not verified their email address yet.`);
    if (BLOCKED.includes(user.status)) throw new Error(`${email} is ${user.status.toLowerCase()}; reactivate the account first.`);

    const [held] = await conn.query("SELECT `id` FROM `StaffRoleAssignment` WHERE `userId` = ? AND `role` = ?", [user.id, role]);
    if (held) {
      console.log(`[staff-grant] ${email} already holds ${role}. Nothing changed.`);
      return;
    }
    await conn.beginTransaction();
    try {
      await conn.query("INSERT INTO `StaffRoleAssignment` (`id`, `userId`, `role`, `grantedById`, `approvedById`) VALUES (?, ?, ?, NULL, NULL)", [randomUUID(), user.id, role]);
      await conn.query("INSERT INTO `AuditLog` (`id`, `actorId`, `action`, `entity`, `entityId`, `diff`, `actorRoles`) VALUES (?, NULL, 'assign', 'User', ?, ?, ?)", [
        randomUUID(),
        user.id,
        JSON.stringify({ before: null, after: { role, via: "scripts/grant-staff-role.mjs" } }),
        JSON.stringify(["SYSTEM"]),
      ]);
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }
    console.log(`[staff-grant] ${email} now holds ${role}. It applies on their next page load; in production they need two-step verification to open the admin area.`);
  } finally {
    await conn.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`[staff-grant] ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
  });
}
