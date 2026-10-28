import { prisma } from "@/lib/db";
import { listPublishedCourses, listPublishedLevels } from "./catalog";
import { strings } from "@/lib/json-list";

/**
 * What the public site shows about levels, courses and prices. Everything comes from published
 * levels, released course snapshots and active products, so the marketing pages can never
 * advertise a course that is not released or a price checkout would not charge.
 */

export interface PublicCourse {
  slug: string;
  name: string;
  description: string | null;
  minutes: number;
  lessons: number;
  isFree: boolean;
  includedInSubscription: boolean;
  /** Paise, from the active course product; null when the course is not sold on its own. */
  price: number | null;
  sku: string | null;
}

export interface PublicLevel {
  slug: string;
  sequence: number;
  name: string;
  displayTitle: string;
  shortDescription: string;
  audience: string | null;
  outcomes: string[];
  coreTopics: string[];
  estimatedEffort: string | null;
  accent: string;
  courses: PublicCourse[];
}

export async function publicPaths(): Promise<PublicLevel[]> {
  const [levels, courses] = await Promise.all([listPublishedLevels(), listPublishedCourses()]);
  const products = await prisma.product.findMany({ where: { active: true, kind: "PROGRAM", programId: { in: courses.map((c) => c.id) } }, select: { programId: true, amount: true, sku: true } });
  return levels.map((l) => ({
    slug: l.slug,
    sequence: l.sequence,
    name: l.name,
    displayTitle: l.displayTitle,
    shortDescription: l.shortDescription,
    audience: l.audience,
    outcomes: strings(l.outcomes),
    coreTopics: strings(l.coreTopics),
    estimatedEffort: l.estimatedEffort,
    accent: l.accent,
    courses: courses
      .filter((c) => c.levelId === l.id)
      .map((c) => {
        const p = products.find((x) => x.programId === c.id);
        return { slug: c.slug, name: c.name, description: c.description, minutes: c.minutes, lessons: c.lessons, isFree: c.isFree, includedInSubscription: c.includedInSubscription, price: p?.amount ?? null, sku: p?.sku ?? null };
      }),
  }));
}

export interface PublicProduct {
  sku: string;
  name: string;
  description: string | null;
  amount: number;
  interval: string | null;
  trialDays: number;
  includes: string[];
  courseSlug: string | null;
  includedCourses: string[];
}

/** Active products by kind. Course products are listed only while their course is released. */
export async function publicPricing() {
  const courses = await listPublishedCourses();
  const released = new Set(courses.map((c) => c.id));
  const slugOf = new Map(courses.map((c) => [c.id, c.slug]));
  const nameOf = new Map(courses.map((c) => [c.slug, c.name]));
  const rows = await prisma.product.findMany({ where: { active: true }, orderBy: [{ kind: "asc" }, { amount: "asc" }], select: { sku: true, name: true, description: true, amount: true, kind: true, interval: true, trialDays: true, includes: true, programId: true } });
  const pick = (kind: string) =>
    rows
      .filter((r) => r.kind === kind && (kind !== "PROGRAM" || (r.programId && released.has(r.programId))))
      .map(({ sku, name, description, amount, interval, trialDays, includes, programId }) => ({
        sku,
        name,
        description,
        amount,
        interval,
        trialDays,
        includes: strings(includes),
        courseSlug: programId ? (slugOf.get(programId) ?? null) : null,
        includedCourses: strings(includes).map((slug) => nameOf.get(slug)).filter(Boolean) as string[],
      }));
  // A track is shown only while every course it includes is released.
  const tracks = pick("TRACK").filter((t) => t.includedCourses.length === t.includes.length && t.includes.length > 0);
  return { subscriptions: pick("SUBSCRIPTION"), courses: pick("PROGRAM"), tracks, mentoring: pick("MENTORING") };
}
