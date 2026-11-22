import "dotenv/config";
import { PrismaClient, PublishState, ProductKind } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { mysqlPoolConfig } from "../lib/db-config";
import { LEVELS, PROGRAMS, BUNDLES } from "../lib/data/catalog";
import { FOUNDATION_LESSONS } from "../lib/data/curriculum";
import { backfillReleases, seedBlocksFromBodies, seedFoundationAssessment, seedLevels, seedPlans } from "./seed-academy";
import { seedLibrary } from "./seed-library";
import { seedSpecCurriculum } from "./seed-curriculum";
import { seedSupport } from "./seed-support";
import { strings } from "../lib/json-list";

/**
 * Seeds a fresh database from the modules that drive the marketing site. Idempotent and
 * non-destructive: academy content and prices are created only when missing, because after
 * that the Admin CMS (and approved price changes) own them. Running it twice changes nothing.
 *
 * Money is stored in paise. Rupees only exist at the presentation layer.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env before seeding.");
}
const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mysqlPoolConfig(connectionString, 2)) });

const toPaise = (rupees: number) => Math.round(rupees * 100);

async function seedPrograms() {
  for (const [i, p] of PROGRAMS.entries()) {
    const level = LEVELS.find((l) => l.n === p.level)!;

    // Create-if-missing: once a course exists, the Admin CMS owns it. Marketing fields are
    // still refreshed from the catalogue module for courses nobody has touched in the CMS.
    const existing = await prisma.program.findUnique({ where: { slug: p.id }, select: { id: true, status: true } });
    const program = existing
      ? await prisma.program.findUniqueOrThrow({ where: { slug: p.id } })
      : await prisma.program.create({
          data: {
            slug: p.id,
            tier: p.tier,
            name: p.name,
            level: p.level,
            who: p.who,
            artefact: p.artefact,
            weeks: p.weeks,
            flag: p.flag ?? null,
            outcomes: p.outcomes,
            sortOrder: i,
            state: PublishState.PUBLISHED,
            status: "PUBLISHED",
            disclaimer: null,
          },
        });

    if (!existing) {
      // The level's curriculum becomes this course's modules. Foundation additionally gets
      // real lessons; the other courses are authored in the Admin CMS.
      for (const [m, title] of level.modules.entries()) {
        const mod = await prisma.module.create({ data: { programId: program.id, title, sortOrder: m, state: PublishState.PUBLISHED } });
        if (p.id !== "foundation") continue;
        const lessons = FOUNDATION_LESSONS[title] ?? [];
        for (const [l, lesson] of lessons.entries()) {
          const row = await prisma.lesson.create({
            data: { moduleId: mod.id, title: lesson.title, durationSec: lesson.minutes * 60, state: PublishState.PUBLISHED, sortOrder: l },
          });
          await prisma.contentBlock.create({ data: { lessonId: row.id, kind: "TEXT", data: { text: lesson.body }, sortOrder: 0 } });
          for (const r of lesson.resources ?? []) {
            const key = `foundation/${mod.sortOrder}-${l}-${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            await prisma.resource.create({ data: { lessonId: row.id, title: r.title, fileKey: key, mimeType: r.kind } });
          }
        }
      }
    }

    // Prices change through an approved price-change request afterwards, never by re-seeding.
    const product = await prisma.product.findUnique({ where: { sku: `program-${p.id}` } });
    if (!product) {
      await prisma.product.create({ data: { sku: `program-${p.id}`, kind: ProductKind.PROGRAM, name: p.name, amount: toPaise(p.price), programId: program.id } });
    }
  }
  const lessonCount = await prisma.lesson.count();
  const resourceCount = await prisma.resource.count();
  console.log(`  programs: ${PROGRAMS.length}, lessons: ${lessonCount}, resources: ${resourceCount}`);
}

async function seedTracks() {
  for (const b of BUNDLES) {
    const found = await prisma.product.findUnique({ where: { sku: `track-${b.id}` } });
    if (!found) {
      await prisma.product.create({ data: { sku: `track-${b.id}`, kind: ProductKind.TRACK, name: b.name, amount: toPaise(b.price), includes: b.includes, description: b.who } });
    } else if (!strings(found.includes).length) {
      await prisma.product.update({ where: { id: found.id }, data: { includes: b.includes } });
    }
  }
  console.log(`  tracks: ${BUNDLES.length}`);
}

async function seedChannels() {
  const channels = [
    { slug: "denials", name: "#denials", description: "CARC and RARC interpretation, appeal strategy, payer policy changes.", houseRule: "Post the code, the payer and what you already tried." },
    { slug: "ar", name: "#ar", description: "Aging strategy, payer behaviour, timely filing, worklist prioritisation.", houseRule: "Bring the aging cut, not just the frustration." },
    { slug: "leadership", name: "#leadership", description: "Capacity models, QA disputes, appraisals, escalation handling.", houseRule: "Anonymise your team before you post about them." },
    { slug: "governance", name: "#governance", description: "Review decks, SLA construction, corrective action plans.", houseRule: "Templates get shared here. Improve them rather than only taking them." },
    { slug: "career", name: "#career", description: "Role transitions, interview preparation, what a level actually requires.", houseRule: "Name the role you are targeting. Advice without a target is noise." },
  ];
  for (const c of channels) {
    await prisma.channel.upsert({ where: { slug: c.slug }, update: c, create: c });
  }
  console.log(`  channels: ${channels.length}`);
}

async function seedPlatform() {
  const flags = [
    { key: "community", enabled: false, description: "Phase 8. Channels and threads." },
    { key: "mentoring_booking", enabled: false, description: "Phase 7. In-platform scheduling." },
    { key: "governance_labs", enabled: false, description: "Phase 4. Assessed lab attempts." },
    { key: "trainer_studio", enabled: false, description: "Phase 3. Course authoring." },
    { key: "crm", enabled: false, description: "Phase 5. Pipeline and lead scoring." },
  ];
  for (const f of flags) {
    await prisma.featureFlag.upsert({ where: { key: f.key }, update: f, create: f });
  }

  // Operational settings have defaults in lib/settings.ts and change through approvals.
  console.log(`  feature flags: ${flags.length}`);
}

async function main() {
  // --if-empty (used by the deploy build): seed only a brand-new database, so a later deploy
  // never re-adds starter content the team has since changed or removed.
  if (process.argv.includes("--if-empty") && (await prisma.program.count()) > 0) {
    console.log("Starter content already present; nothing to seed.");
    return;
  }
  console.log("Seeding RCMExcel…");
  // The demonstration courses (text lessons, sample prices) are test fixtures for the browser
  // journeys, not Academy content: seed them only when asked (SEED_DEMO=1).
  const demo = process.env.SEED_DEMO === "1";
  if (demo) await seedPrograms();
  await seedLevels(prisma);
  await seedSpecCurriculum(prisma);
  if (demo) {
    await seedBlocksFromBodies(prisma);
    await seedFoundationAssessment(prisma);
    await backfillReleases(prisma);
    await seedTracks();
  }
  await seedPlans(prisma);
  await seedLibrary(prisma);
  await seedSupport(prisma);
  await seedChannels();
  await seedPlatform();
  console.log("Done. Re-running this is safe: existing records are never overwritten.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
