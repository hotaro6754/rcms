import type { PageDef } from "./fields";
import { sitePage } from "./pages/site";
import { themePage } from "./pages/theme";
import { homePage } from "./pages/home";
import { aboutPage } from "./pages/about";
import { catalogPage } from "./pages/catalog";
import { coursePage } from "./pages/course";
import { learningPathsPage } from "./pages/learning-paths";
import { pricingPage } from "./pages/pricing";
import { mentoringPage } from "./pages/mentoring";
import { resourcesPage } from "./pages/resources";
import { resourcesSectionPage } from "./pages/resources-section";
import { resourcesEntryPage } from "./pages/resources-entry";
import { resourcesTestsPage } from "./pages/resources-tests";
import { communityPage } from "./pages/community";
import { blogPage } from "./pages/blog";
import { contactPage } from "./pages/contact";
import { legalTermsPage } from "./pages/legal-terms";
import { legalPrivacyPage } from "./pages/legal-privacy";
import { legalRefundPage } from "./pages/legal-refund";
import { legalDisclaimerPage } from "./pages/legal-disclaimer";
import { legalContentGovernancePage } from "./pages/legal-content-governance";

/**
 * Every built-in page whose copy can be edited from /admin/site. Adding a page here (with its
 * definition in lib/site/pages) is what makes it editable; the page reads its copy through
 * getPageContent in lib/site/content.ts.
 */
export const BUILT_IN_PAGES: PageDef[] = [
  sitePage,
  themePage,
  homePage,
  aboutPage,
  catalogPage,
  coursePage,
  learningPathsPage,
  pricingPage,
  mentoringPage,
  resourcesPage,
  resourcesSectionPage,
  resourcesEntryPage,
  resourcesTestsPage,
  communityPage,
  blogPage,
  contactPage,
  legalTermsPage,
  legalPrivacyPage,
  legalRefundPage,
  legalDisclaimerPage,
  legalContentGovernancePage,
];

export function builtInPage(key: string): PageDef | undefined {
  return BUILT_IN_PAGES.find((p) => p.key === key);
}

/** Top-level paths a custom page's address may not take (custom pages live under /p/). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
