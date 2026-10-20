import { expect, test, type Page } from "@playwright/test";

/**
 * The website editor in the browser: only the Super Administrator can open it; an edit is a
 * draft that visitors do not see, preview shows it, publishing puts it live, and resetting
 * brings the original copy back. A custom page is created, published, and deleted.
 * Needs `npm run db:seed && npm run dev:accounts`.
 */

const PASSWORD = "Rcms-dev-password-1";
const ORIGINAL = "Twenty-one years on the operations floor, turned into a curriculum.";

/** Opens a page in the website editor and waits until it is interactive. */
async function openEditor(page: Page, path: string) {
  await page.goto(path);
  await page.locator('[data-ready="true"]').waitFor();
}

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

test("only the Super Administrator can edit the website", async ({ page }) => {
  await signIn(page, "content@rcms.test");
  await page.goto("/admin/site");
  await expect(page).toHaveURL(/\/admin\?denied=1/);
  await expect(page.getByRole("link", { name: "Website", exact: true })).toHaveCount(0);
});

test("edit, preview, publish and reset a page's copy", async ({ browser }) => {
  const title = `About this academy ${Date.now().toString(36)}`;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  await signIn(page, "super@rcms.test");

  // What visitors see now (an earlier interrupted run may have left an edit published).
  const visitor = await browser.newPage();
  await visitor.goto("/about");
  const live = (await visitor.getByRole("heading", { level: 1 }).innerText()).trim();

  await page.goto("/admin/site");
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  await page.locator('[data-ready="true"]').waitFor();
  const header = page.getByRole("group", { name: "Page header" });
  await header.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved" })).toBeVisible();

  // A visitor still sees the published page.
  await visitor.reload();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(live);

  // Preview shows the draft, with the preview bar.
  const preview = await ctx.newPage();
  await preview.goto("/api/site/preview?key=about");
  await expect(preview).toHaveURL(/\/about$/);
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(preview.getByText("Preview: you are seeing unpublished changes")).toBeVisible();
  await preview.getByRole("link", { name: "Exit preview" }).click();
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(live);

  // Publish: the visitor sees it.
  await page.getByLabel("What changed (optional)").fill("Clearer title");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Published as version \d+/ })).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText("Clearer title").first()).toBeVisible();

  // Reset: the original copy is back, and the edit stays in the history.
  await page.getByRole("button", { name: "Reset to the original copy" }).click();
  await expect(page.getByRole("status").filter({ hasText: "original copy again" })).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(ORIGINAL);
  await ctx.close();
});

test("create, publish and delete a custom page", async ({ page, browser }) => {
  const slug = `e2e-${Date.now().toString(36)}`;
  page.on("dialog", (d) => d.accept());
  await signIn(page, "super@rcms.test");
  await page.goto("/admin/site");
  await page.getByLabel("Title").fill("Corporate training");
  await page.getByLabel("Address").fill(slug);
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/admin\/site\/custom-/);
  await page.locator('[data-ready="true"]').waitFor();

  // Not visible until published.
  const visitor = await browser.newPage();
  expect((await visitor.goto(`/p/${slug}`))!.status()).toBe(404);

  await page.getByLabel("Introduction").fill("Training for whole teams, scoped with you.");

  // The page body is designed visually; the designer saves into the draft.
  await page.getByRole("button", { name: "Open the visual designer" }).click();
  await page.waitForURL(/\/admin\/site\/custom-[^/]+\/design/);
  await expect(page.getByText("Freeform canvas", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Back to the page" }).click();
  await page.waitForURL(/\/admin\/site\/custom-[^/]+$/);
  await page.locator('[data-ready="true"]').waitFor();
  await expect(page.getByLabel("Introduction")).toHaveValue("Training for whole teams, scoped with you.");

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Published as version 1/ })).toBeVisible();

  await visitor.goto(`/p/${slug}`);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Corporate training");
  await expect(visitor.getByText("Training for whole teams, scoped with you.")).toBeVisible();

  await page.getByRole("button", { name: "Delete this page" }).click();
  await page.waitForURL(/\/admin\/site$/);
  expect((await visitor.goto(`/p/${slug}`))!.status()).toBe(404);
});

test("theme: unreadable colours are refused, a change reaches the site, and resets", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  await signIn(page, "super@rcms.test");
  await openEditor(page, "/admin/site/theme");
  const colours = page.getByRole("group", { name: "Colours" });

  // Light grey button text on a white button: refused.
  await colours.locator("#f-colours-primary").fill("#ffffff");
  await colours.locator("#f-colours-primaryText").fill("#eeeeee");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Button text on Buttons has a contrast of/ })).toBeVisible();

  // A readable change goes live.
  await colours.locator("#f-colours-primary").fill("#1f2f4f");
  await colours.locator("#f-colours-primaryText").fill("#ffffff");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Published as version/ })).toBeVisible();
  const visitor = await browser.newPage();
  await visitor.goto("/about");
  expect(await visitor.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim())).toBe("#1f2f4f");

  await page.getByRole("button", { name: "Reset to the original copy" }).click();
  await expect(page.getByRole("status").filter({ hasText: "original copy again" })).toBeVisible();
  await visitor.reload();
  expect(await visitor.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim())).toBe("#161513");
  await ctx.close();
});
