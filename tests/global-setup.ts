import { execSync } from "node:child_process";

/**
 * Brings the test database's schema up to date once per run with the real migrations, so
 * the tests exercise exactly what production gets (the audit-log triggers come from scripts/db-harden.mjs).
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "mysql://rcms:rcms@127.0.0.1:3306/rcms_test";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url) && process.env.ALLOW_REMOTE_TEST_DB !== "1") {
    throw new Error("TEST_DATABASE_URL must point at a local database. Set ALLOW_REMOTE_TEST_DB=1 to override.");
  }
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  execSync("node scripts/db-harden.mjs --strict", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
