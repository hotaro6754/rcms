import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated accessibility checks (axe-core, WCAG 2.1 A and AA rules) on the main pages of each
 * area. Serious and critical violations fail the test; moderate and minor ones are printed.
 * Automated checks find a subset of problems; they do not replace testing with assistive
 * technology.
 */

const PASSWORD = "Rcms-dev-password-1";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

async function scan(page: Page, path: string) {
  // Check the settled page: animations that fade text in would otherwise be measured mid-fade.
  // Every animation on the site honours reduced motion and ends in the same state.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // The home page's preloader is decorative (aria-hidden) and fades out; scan the page under it.
  await page.locator(".preloader").waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).exclude("nextjs-portal").analyze();
  for (const v of r.violations) console.log(`${path}: [${v.impact}] ${v.id} (${v.nodes.length}) ${v.help}\n    ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n    ")}`);
  return r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${path}: ${v.id}`);
}

test("public pages", async ({ page }) => {
  const bad: string[] = [];
  for (const p of ["/", "/catalog", "/pricing", "/learning-paths", "/resources", "/resources/glossary", "/contact", "/sign-in", "/legal/content-governance", "/about"]) bad.push(...(await scan(page, p)));
  expect(bad).toEqual([]);
});

test("learner pages", async ({ page }) => {
  await signIn(page, "student@rcms.test");
  const bad: string[] = [];
  for (const p of ["/academy", "/cases", "/support", "/support/new", "/assistant", "/account", "/certificates"]) bad.push(...(await scan(page, p)));
  expect(bad).toEqual([]);
});

test("staff pages", async ({ page }) => {
  await signIn(page, "super@rcms.test");
  const bad: string[] = [];
  for (const p of ["/admin", "/admin/support", "/admin/support/settings", "/admin/cases", "/admin/competencies", "/admin/grading/cases", "/admin/copilot", "/admin/content", "/admin/site", "/admin/site/about"]) bad.push(...(await scan(page, p)));
  expect(bad).toEqual([]);
});
