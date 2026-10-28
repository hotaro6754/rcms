import "dotenv/config";
import { prisma } from "../lib/db";
import { backfillReleases, seedBlocksFromBodies } from "../prisma/seed-academy";

/**
 * Run once after deploying migration 0003 to an existing database: gives every lesson that
 * only had a plain-text body its first content block, and every course that was already
 * live its first release, so learners keep seeing what they saw before.
 *
 *   npm run db:backfill
 */
async function main() {
  await seedBlocksFromBodies(prisma);
  await backfillReleases(prisma);
  console.log("[backfill] done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
