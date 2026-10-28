import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { publicPaths, publicPricing } from "@/lib/services/learning/public-catalog";
import { makeCourseDraft, releaseCourse, resetDb, staff } from "../helpers";

beforeEach(resetDb);

describe("public catalogue", () => {
  it("shows only released courses, with the price checkout charges", async () => {
    const author = await staff("CONTENT_ADMIN");
    const { course: live, level } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    const { course: draft } = await makeCourseDraft(author, { modules: 1, lessons: 1 });
    await prisma.program.update({ where: { id: draft.id }, data: { levelId: level.id } });
    await releaseCourse(live.id, author);
    await prisma.learningLevel.update({ where: { id: level.id }, data: { status: "PUBLISHED" } });
    await prisma.product.createMany({
      data: [
        { sku: "p-live", kind: "PROGRAM", name: "Live course", amount: 349900, programId: live.id, active: true },
        { sku: "p-draft", kind: "PROGRAM", name: "Draft course", amount: 100000, programId: draft.id, active: true },
        { sku: "p-off", kind: "MENTORING", name: "Inactive session", amount: 50000, active: false },
        { sku: "t-both", kind: "TRACK", name: "Track", amount: 400000, includes: [live.slug, draft.slug], active: true },
      ],
    });

    const paths = await publicPaths();
    const lvl = paths.find((l) => l.slug === level.slug)!;
    expect(lvl.courses.map((c) => c.slug)).toEqual([live.slug]);
    expect(lvl.courses[0].price).toBe(349900);

    const pricing = await publicPricing();
    expect(pricing.courses.map((c) => c.sku)).toEqual(["p-live"]);
    expect(pricing.mentoring).toEqual([]);
    // A track is hidden until every course in it is released.
    expect(pricing.tracks).toEqual([]);

    // A price change reaches the public page because there is only one source.
    await prisma.product.update({ where: { sku: "p-live" }, data: { amount: 399900 } });
    expect((await publicPricing()).courses[0].amount).toBe(399900);

    // Archiving removes the course from the public catalogue.
    const { archiveCourse } = await import("@/lib/services/cms/release");
    await archiveCourse(await staff("ACADEMY_DIRECTOR"), live.id, "Retired");
    expect((await publicPaths()).find((l) => l.slug === level.slug)!.courses).toEqual([]);
  });
});
