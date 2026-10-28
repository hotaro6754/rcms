import type { MetadataRoute } from "next";
import { indexingOn, PRIVATE_PREFIXES, siteUrl } from "@/lib/seo";

/**
 * Public pages may be indexed; signed-in areas, the admin, sign-in pages, checkout, the API
 * and individual certificate pages (which carry a person's name) may not. Unless
 * SITE_INDEXING=on, nothing is indexed: staging and preview deployments stay out of search.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl().origin;
  if (!indexingOn()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PREFIXES,
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
