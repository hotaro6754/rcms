import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moved the connection URL out of schema.prisma. Migrate reads it from here;
 * the runtime client gets it through a driver adapter in lib/db.ts.
 *
 * "localhost" is replaced by 127.0.0.1: on shared hosting localhost can resolve to IPv6 (::1),
 * which the database user is often not allowed to connect from (Hostinger's own advice).
 */
const url = process.env.DATABASE_URL?.replace(/@localhost(?=[:/])/, "@127.0.0.1");

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url,
  },
});
