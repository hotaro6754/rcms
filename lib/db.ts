import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 connects through a driver adapter rather than a URL in the schema.
 *
 * The client is cached on globalThis in development so Next's hot reload does not open a
 * new connection pool on every edit — the classic way to exhaust a Postgres connection
 * limit locally.
 *
 * DATABASE_POOL_MAX exists because the local PGlite dev database (scripts/dev-db.mjs)
 * serves exactly one connection at a time; a pool larger than 1 against it produces
 * "Server has closed the connection" the moment two queries overlap. Hosted Postgres wants
 * a real pool, so this is a setting rather than a hardcoded 1.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in before running anything that touches the database.",
    );
  }

  const max = Number(process.env.DATABASE_POOL_MAX ?? 10);

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
