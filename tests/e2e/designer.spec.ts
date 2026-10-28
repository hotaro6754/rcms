import { expect, test, type Page } from "@playwright/test";

/**
 * The visual designer in the browser: import a Word file into a lesson design, change a
 * heading and its style, add a freeform canvas and place an item on it, save, and find it
 * all still there after a reload. The design block is removed again at the end.
 * Needs `npm run db:seed && npm run dev:accounts`.
 */

const PASSWORD = "Rcms-dev-password-1";
const SHOTS = process.env.E2E_SHOTS;

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

async function firstLesson(page: Page) {
  await page.goto("/admin/content");
  await page.locator('a[href^="/admin/content/courses/"]').first().click();
  await page.locator('a[href*="item=lesson:"]').first().click();
  await page.waitForURL(/item=lesson:/);
  return page.url();
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 15; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 15, from.y + ((to.y - from.y) * i) / 15);
  await page.mouse.up();
}

test("import a document, design it, place items freely, save", async ({ page }) => {
  test.setTimeout(240_000);
  page.on("dialog", (d) => d.accept());
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, "content@rcmexcel.com");
  const lessonUrl = await firstLesson(page);

  await page.getByLabel("Add a block").selectOption("DESIGN");
  await page.getByLabel(/Start from a document/).setInputFiles("tests/fixtures/denials-guide.docx");
  await page.getByRole("button", { name: /Add visual design/ }).click();
  await page.waitForURL(/\/admin\/content\/design\//, { timeout: 60_000 });
  const designUrl = page.url();

  // The imported structure is there.
  const preview = page.locator("main, [class*='Puck']").first();
  await expect(page.getByRole("heading", { name: "Working denials: a field guide", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Tap to reveal").first()).toBeVisible();
  await expect(page.getByText("Investigate", { exact: true })).toBeVisible();

  // Select the title and change its words and size.
  await page.getByRole("heading", { name: "Working denials: a field guide", exact: true }).click();
  // Puck renders the settings panel twice (one copy for small screens); use the visible one.
  const text = page.getByLabel("Text", { exact: true }).filter({ visible: true });
  await text.fill("Working denials, step by step");
  await page.getByLabel("Size").filter({ visible: true }).first().selectOption("5xl");
  await expect(page.getByRole("heading", { name: "Working denials, step by step", exact: true })).toBeVisible();

  // Drag a freeform canvas onto the page and place a heading on it.
  const source = await page.getByText("Freeform canvas", { exact: true }).first().boundingBox();
  const target = await page.getByRole("heading", { name: "Working denials, step by step", exact: true }).boundingBox();
  await drag(page, { x: source!.x + 20, y: source!.y + 10 }, { x: target!.x + 200, y: target!.y + 10 });
  await page.getByRole("button", { name: "Open the canvas editor" }).filter({ visible: true }).first().click({ timeout: 15_000 });
  const dialog = page.getByRole("dialog", { name: "Canvas editor" });
  await dialog.getByRole("button", { name: "+ Heading" }).click();
  await dialog.getByRole("textbox", { name: "Text", exact: true }).fill("Placed anywhere");
  await dialog.getByLabel("Left %").fill("40");
  await dialog.getByLabel("Top %").fill("55");
  const item = dialog.getByRole("button", { name: /heading Placed anywhere/ });
  const box = await item.boundingBox();
  await drag(page, { x: box!.x + 10, y: box!.y + 5 }, { x: box!.x - 60, y: box!.y - 40 });
  const left = Number(await dialog.getByLabel("Left %").inputValue());
  expect(left).toBeLessThan(40);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/canvas-editor.png` });
  await dialog.getByRole("button", { name: "Done" }).click();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible({ timeout: 30_000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/designer.png` });

  // Still there after a reload.
  await page.goto(designUrl);
  await expect(page.getByRole("heading", { name: "Working denials, step by step", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Placed anywhere")).toBeVisible();
  void preview;

  expect(errors).toEqual([]);

  // Clean up: remove design blocks from the lesson draft (including any an interrupted run left).
  await page.goto(lessonUrl);
  const rows = page.locator("ol > li").filter({ hasText: /VISUAL DESIGN/ });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: /Delete block/ }).click();
    await expect(rows).toHaveCount(n - 1);
  }
});
