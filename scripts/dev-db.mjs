#!/usr/bin/env node
/**
 * Local development database.
 *
 * PGlite is real PostgreSQL compiled to WebAssembly; pglite-socket puts it behind the
 * Postgres wire protocol on a TCP port. That means Prisma, psql and the app all talk to it
 * exactly as they would to a hosted Postgres, with no Docker daemon and no cloud account.
 *
 * Data persists in .pgdata/ (gitignored). Swap DATABASE_URL for Neon or Supabase later and
 * nothing in the application changes.
 *
 *   node scripts/dev-db.mjs          # serve on 55432
 *   node scripts/dev-db.mjs --fresh  # wipe .pgdata first
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { rmSync } from "node:fs";

const PORT = Number(process.env.DEV_DB_PORT ?? 55432);
const DIR = ".pgdata";

if (process.argv.includes("--fresh")) {
  rmSync(DIR, { recursive: true, force: true });
  console.log(`[dev-db] wiped ${DIR}`);
}

const db = await PGlite.create({ dataDir: DIR });
const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });
await server.start();

console.log(`[dev-db] postgres on 127.0.0.1:${PORT}`);
console.log(`[dev-db] DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"`);
console.log("[dev-db] ctrl-c to stop");

const shutdown = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
