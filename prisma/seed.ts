import "dotenv/config";
import { PrismaClient, PublishState, ProductKind } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { LEVELS, PROGRAMS, BUNDLES, MENTORING } from "../lib/data/catalog";
import { FOUNDATION_LESSONS } from "../lib/data/curriculum";
import { CLIENT, METRICS, DENIALS, PODS } from "../lib/data/telemetry";
import { AGENDA, ESCALATIONS, RCA, RISKS, ACTIONS } from "../lib/data/governance";
import { NORTHGATE } from "../lib/data/scenarios";

/**
 * Seeds the database from the modules that already drive the site, so there is exactly one
 * definition of a program, a price or a metric. Idempotent: every write is an upsert keyed
 * on a natural identifier, so running it twice changes nothing.
 *
 * Money is stored in paise. Rupees only exist at the presentation layer.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env before seeding.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const toPaise = (rupees: number) => Math.round(rupees * 100);

async function seedPrograms() {
  for (const [i, p] of PROGRAMS.entries()) {
    const level = LEVELS.find((l) => l.n === p.level)!;

    const program = await prisma.program.upsert({
      where: { slug: p.id },
      update: {
        tier: p.tier,
        name: p.name,
        level: p.level,
        who: p.who,
        artefact: p.artefact,
        weeks: p.weeks,
        flag: p.flag ?? null,
        outcomes: p.outcomes,
        sortOrder: i,
      },
      create: {
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
      },
    });

    // The level's curriculum becomes this program's modules. Foundation additionally gets
    // real lessons so Phase 2 exercises the player against something worth reading; the
    // other four are authored in Trainer Studio.
    for (const [m, title] of level.modules.entries()) {
      const existing = await prisma.module.findFirst({
        where: { programId: program.id, sortOrder: m },
      });
      const mod = existing
        ? await prisma.module.update({ where: { id: existing.id }, data: { title } })
        : await prisma.module.create({
            data: { programId: program.id, title, sortOrder: m },
          });

      if (p.id !== "foundation") continue;

      const lessons = FOUNDATION_LESSONS[title] ?? [];
      for (const [l, lesson] of lessons.entries()) {
        const found = await prisma.lesson.findFirst({
          where: { moduleId: mod.id, sortOrder: l },
        });
        const data = {
          title: lesson.title,
          body: lesson.body,
          durationSec: lesson.minutes * 60,
          state: PublishState.PUBLISHED,
        };
        const row = found
          ? await prisma.lesson.update({ where: { id: found.id }, data })
          : await prisma.lesson.create({
              data: { ...data, moduleId: mod.id, sortOrder: l },
            });

        for (const r of lesson.resources ?? []) {
          const key = `foundation/${mod.sortOrder}-${l}-${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          const existingRes = await prisma.resource.findFirst({
            where: { lessonId: row.id, fileKey: key },
          });
          if (!existingRes) {
            await prisma.resource.create({
              data: { lessonId: row.id, title: r.title, fileKey: key, mimeType: r.kind },
            });
          }
        }
      }
    }

    await prisma.product.upsert({
      where: { sku: `program-${p.id}` },
      update: { name: p.name, amount: toPaise(p.price), programId: program.id },
      create: {
        sku: `program-${p.id}`,
        kind: ProductKind.PROGRAM,
        name: p.name,
        amount: toPaise(p.price),
        programId: program.id,
      },
    });
  }
  const lessonCount = await prisma.lesson.count();
  const resourceCount = await prisma.resource.count();
  console.log(
    `  programs: ${PROGRAMS.length}, products: ${PROGRAMS.length}, lessons: ${lessonCount}, resources: ${resourceCount}`,
  );
}

async function seedTracksAndMentoring() {
  for (const b of BUNDLES) {
    await prisma.product.upsert({
      where: { sku: `track-${b.id}` },
      update: { name: b.name, amount: toPaise(b.price) },
      create: {
        sku: `track-${b.id}`,
        kind: ProductKind.TRACK,
        name: b.name,
        amount: toPaise(b.price),
      },
    });
  }
  for (const m of MENTORING) {
    await prisma.product.upsert({
      where: { sku: `mentoring-${m.id}` },
      update: { name: `${m.name} (${m.minutes} min)`, amount: toPaise(m.price) },
      create: {
        sku: `mentoring-${m.id}`,
        kind: ProductKind.MENTORING,
        name: `${m.name} (${m.minutes} min)`,
        amount: toPaise(m.price),
      },
    });
  }
  console.log(`  tracks: ${BUNDLES.length}, mentoring products: ${MENTORING.length}`);
}

async function seedScenario() {
  /**
   * The whole Meridian engagement becomes one Governance Lab scenario. Storing the
   * telemetry as JSON means a graded attempt keeps the numbers it was graded against, even
   * if the teaching data is edited afterwards.
   */
  const telemetry = {
    client: CLIENT,
    metrics: METRICS,
    denials: DENIALS,
    pods: PODS,
    agenda: AGENDA,
    escalations: ESCALATIONS,
    rca: RCA,
    risks: RISKS,
    actions: ACTIONS,
  };

  await prisma.scenario.upsert({
    where: { slug: "meridian-cardiology-sep-2026" },
    update: { telemetry: telemetry as never },
    create: {
      slug: "meridian-cardiology-sep-2026",
      clientName: CLIENT.name,
      specialty: CLIENT.specialty,
      providers: CLIENT.providers,
      reviewPeriod: CLIENT.reviewPeriod,
      telemetry: telemetry as never,
      state: PublishState.PUBLISHED,
    },
  });
  // A second, assessed scenario with a different failure mode. Its presence is what makes
  // the lab engine data-driven rather than one hard-coded engagement.
  await prisma.scenario.upsert({
    where: { slug: NORTHGATE.slug },
    update: { telemetry: NORTHGATE as never },
    create: {
      slug: NORTHGATE.slug,
      clientName: NORTHGATE.clientName,
      specialty: NORTHGATE.specialty,
      providers: NORTHGATE.providers,
      reviewPeriod: NORTHGATE.reviewPeriod,
      telemetry: NORTHGATE as never,
      state: PublishState.PUBLISHED,
    },
  });

  const count = await prisma.scenario.count();
  console.log(`  scenarios: ${count} (meridian worked example, northgate assessed)`);
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

  const settings = [
    { key: "refund_window_days", value: 7 },
    { key: "refund_max_access_percent", value: 20 },
    { key: "mentoring_cancel_hours", value: 24 },
    { key: "currency", value: "INR" },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value as never },
      create: { key: s.key, value: s.value as never },
    });
  }
  console.log(`  feature flags: ${flags.length}, settings: ${settings.length}`);
}

async function main() {
  console.log("Seeding RCMS Operations Academy…");
  await seedPrograms();
  await seedTracksAndMentoring();
  await seedScenario();
  await seedChannels();
  await seedPlatform();
  console.log("Done. Re-running this is safe: every write is an upsert.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
