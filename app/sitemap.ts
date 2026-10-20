import type { MetadataRoute } from "next";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { SECTIONS, sectionByKind } from "@/lib/library-sections";

/** Every public page: the fixed pages, released courses, published library entries and custom pages. */
export const revalidate = 3600;

const FIXED: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/catalog", priority: 0.9, changeFrequency: "weekly" },
  { path: "/learning-paths", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
  { path: "/mentoring", priority: 0.7, changeFrequency: "monthly" },
  { path: "/resources", priority: 0.7, changeFrequency: "weekly" },
  { path: "/resources/tests", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/community", priority: 0.4, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.4, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/refund", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/disclaimer", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/content-governance", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().origin;
  const entries: MetadataRoute.Sitemap = FIXED.map((f) => ({ url: `${base}${f.path}`, changeFrequency: f.changeFrequency, priority: f.priority }));
  for (const s of SECTIONS) entries.push({ url: `${base}/resources/${s.path}`, changeFrequency: "weekly", priority: 0.6 });
  try {
    const [courses, library, pages] = await Promise.all([
      prisma.program.findMany({ where: { state: "PUBLISHED", publishedVersionId: { not: null } }, select: { slug: true, updatedAt: true } }),
      prisma.libraryEntry.findMany({ where: { status: { in: ["PUBLISHED", "IN_REVIEW"] }, published: { not: Prisma.DbNull } }, select: { slug: true, kind: true, updatedAt: true } }),
      prisma.sitePage.findMany({ where: { custom: true, archivedAt: null, version: { gt: 0 }, published: { not: Prisma.DbNull } }, select: { slug: true, publishedAt: true } }),
    ]);
    for (const c of courses) entries.push({ url: `${base}/catalog/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "monthly", priority: 0.8 });
    for (const e of library) entries.push({ url: `${base}/resources/${sectionByKind(e.kind).path}/${e.slug}`, lastModified: e.updatedAt, changeFrequency: "monthly", priority: 0.5 });
    for (const p of pages) entries.push({ url: `${base}/p/${p.slug}`, lastModified: p.publishedAt ?? undefined, changeFrequency: "monthly", priority: 0.5 });
  } catch (error) {
    // Without a database the fixed pages are still listed.
    console.error("[sitemap] dynamic entries unavailable", error);
  }
  return entries;
}
