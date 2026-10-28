#!/usr/bin/env node
/**
 * Makes the audit log append-only at the database level: two triggers refuse any UPDATE or
 * DELETE of an AuditLog row, whoever sends it (the application never does).
 *
 *   node scripts/db-harden.mjs            create the triggers if they are missing; warn and
 *                                         carry on if the database user may not create triggers
 *   node scripts/db-harden.mjs --strict   fail instead (used by the tests)
 *
 * It runs after `prisma migrate deploy` in `npm run build:deploy` and `npm run db:deploy`.
 * It is not a migration because shared hosting can refuse CREATE TRIGGER (for example when
 * binary logging is on and the user lacks SUPER), and a refused migration would stop every
 * deploy. The application itself only ever inserts audit rows, so the site stays correct
 * without the triggers; they are a second line of defence.
 */
import "dotenv/config";
import mariadb from "mariadb";

const strict = process.argv.includes("--strict");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db-harden] DATABASE_URL is not set.");
  process.exit(1);
}
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
});

const TRIGGERS = [
  ["audit_log_no_update", "UPDATE"],
  ["audit_log_no_delete", "DELETE"],
];

let failed = 0;
try {
  for (const [name, op] of TRIGGERS) {
    const [exists] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?", [name]);
    if (Number(exists.n) > 0) continue;
    try {
      await conn.query(
        `CREATE TRIGGER \`${name}\` BEFORE ${op} ON \`AuditLog\` FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AuditLog is append-only: ${op} is not permitted'`,
      );
      console.log(`[db-harden] created ${name}`);
    } catch (e) {
      failed++;
      console.warn(`[db-harden] could not create ${name}: ${e.message}`);
    }
  }
} finally {
  await conn.end();
}
if (failed) {
  console.warn("[db-harden] The audit log is still append-only in the application, but not enforced by the database. Ask the host to allow triggers, or run this script as a user that may create them.");
  if (strict) process.exit(1);
} else {
  console.log("[db-harden] audit log is append-only at the database level");
}
