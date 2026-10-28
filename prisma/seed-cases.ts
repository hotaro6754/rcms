import type { Prisma, PrismaClient } from "@prisma/client";
import { CaseDefinition } from "../lib/sim/definition";
import { SEED_CASES, SEED_COMPETENCIES } from "../lib/sim/seed-cases";

/**
 * Starter competencies and denial cases. Seeded as drafts (competencies) and in review (cases),
 * never active or published: a reviewer must check the content, activate the competencies and
 * approve the cases. Idempotent: existing rows are left alone.
 */

const SEED_AUTHOR = "seed";

export async function seedCases(prisma: PrismaClient) {
  for (const c of SEED_COMPETENCIES) {
    await prisma.competency.upsert({
      where: { code: c.code },
      update: {},
      create: { ...c, criteria: [...c.criteria], authorId: SEED_AUTHOR },
    });
  }
  for (const c of SEED_CASES) {
    const d = CaseDefinition.parse(c.definition);
    await prisma.simCase.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, title: d.title, draft: d as unknown as Prisma.InputJsonValue, status: "IN_REVIEW", authorId: SEED_AUTHOR, submittedById: SEED_AUTHOR },
    });
  }
  console.log(`Seeded ${SEED_COMPETENCIES.length} competencies (draft) and ${SEED_CASES.length} cases (in review).`);
}
