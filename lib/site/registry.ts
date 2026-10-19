import type { PageDef } from "./fields";
import { aboutPage } from "./pages/about";
import { themePage } from "./pages/theme";

/**
 * Every built-in page whose copy can be edited from /admin/site. Adding a page here (with its
 * definition in lib/site/pages) is what makes it editable; the page reads its copy through
 * getPageContent in lib/site/content.ts.
 */
export const BUILT_IN_PAGES: PageDef[] = [themePage, aboutPage];

export function builtInPage(key: string): PageDef | undefined {
  return BUILT_IN_PAGES.find((p) => p.key === key);
}

/** Top-level paths a custom page's address may not take (custom pages live under /p/). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
