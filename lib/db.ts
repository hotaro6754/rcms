import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { mysqlPoolConfig } from "./db-config";

/**
 * Prisma 7 connects through a driver adapter rather than a URL in the schema.
 *
 * The database is MySQL or MariaDB (Hostinger's web hosting runs MariaDB), reached through the
 * MariaDB driver adapter, which serves both.
 *
 * The client is cached on globalThis in development so Next's hot reload does not open a
 * new connection pool on every edit, which would soon exhaust the server's connection limit.
 * DATABASE_POOL_MAX sizes the pool; shared hosting allows few connections per user, so the
 * default is modest.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in before running anything that touches the database.",
    );
  }

  const max = Number(process.env.DATABASE_POOL_MAX ?? 5);

  return new PrismaClient({
    adapter: new PrismaMariaDb(mysqlPoolConfig(connectionString, max)),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
