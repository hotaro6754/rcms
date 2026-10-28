import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Search and sharing metadata for public pages: canonical address, Open Graph and Twitter
 * cards, and structured data. Private areas (admin, portal, sign-in, vendor) are marked
 * noindex in their layouts and disallowed in robots.txt.
 */

/** The public address of the site, from NEXT_PUBLIC_APP_URL (e.g. https://rcmexcel.com). */
export function siteUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

/**
 * Search engines may index the site only when SITE_INDEXING=on, so a staging copy or a
 * preview deployment never competes with the real site in search results.
 */
export const indexingOn = () => process.env.SITE_INDEXING === "on";

/** Signed-in and transactional areas: disallowed in robots.txt and sent with X-Robots-Tag: noindex. */
export const PRIVATE_PREFIXES = [
  "/admin", "/api", "/academy", "/account", "/assistant", "/cases", "/certificates", "/checkout", "/labs", "/library",
  "/support", "/team", "/vendor", "/studio", "/overview", "/queues", "/roster", "/metrics", "/activity", "/governance",
  "/policy-updates", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/two-factor", "/verify", "/invite",
];

export const isPrivatePath = (path: string) => PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

export function pageMeta(p: { title: string; description?: string | null; path: string; absoluteTitle?: boolean; type?: "website" | "article" }): Metadata {
  const description = p.description || undefined;
  return {
    title: p.absoluteTitle ? { absolute: p.title } : p.title,
    description,
    alternates: { canonical: p.path },
    openGraph: { title: p.title, description, url: p.path, siteName: BRAND.name, type: p.type ?? "website", locale: "en_IN" },
    twitter: { card: "summary_large_image", title: p.title, description },
  };
}

export const NOINDEX: Metadata = { robots: { index: false, follow: false, nocache: true } };

/** Structured data for a <script type="application/ld+json">, safe to inline in HTML. */
export function jsonLd(data: Record<string, unknown>) {
  return JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
}

export function organisationLd() {
  const url = siteUrl().origin;
  return {
    "@type": "EducationalOrganization",
    name: BRAND.name,
    url,
    description: BRAND.tagline,
    logo: `${url}/brand/rcmexcel-logo.png`,
  };
}
