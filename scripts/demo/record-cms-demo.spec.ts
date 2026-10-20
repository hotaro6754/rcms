import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { caption, go, hideDevOverlay, OUT, pause, saveVideo, scrollBy, signIn, title } from "./helpers";

/**
 * A narrated walkthrough of the website editor, the visual designer, document import and
 * content protection, recorded as one video. Everything it changes is put back at the end:
 * page edits and the theme are reset, the custom page and the lesson design are deleted.
 *
 * Needs a running app (`npm run dev`) on a seeded local database with the dev accounts. The
 * seeded course materials are listed without files; before recording, the first PDF material
 * gets a small synthetic PDF (local database only) so the view-only reader has pages to show.
 * Output: DEMO_OUT (default ./demo-output/rcms-cms-demo.webm).
 */

/** Opens a page in the website editor and waits until it is interactive. */
async function openEditor(page: Page, url: string) {
  await go(page, url);
  await page.locator('[data-ready="true"]').waitFor();
}

const SLUG = `corporate-training-${Date.now().toString(36)}`;

function onePager(): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const parts: Buffer[] = [];
    doc.on("data", (b) => parts.push(b));
    doc.on("end", () => resolve(Buffer.concat(parts)));
    doc.fontSize(22).text("Payer landscape: a one-page guide");
    doc.moveDown().fontSize(11).fillColor("#555").text("Synthetic training material. All names and figures are invented.");
    doc.moveDown().fillColor("#000").fontSize(14).text("Who pays");
    doc.fontSize(11).text("Commercial plans, Medicare, Medicaid and third-party administrators each set their own rules for eligibility, authorization and timely filing.");
    doc.moveDown().fontSize(14).text("What changes by payer");
    for (const l of ["Prior authorization lists", "Timely filing limits", "Appeal levels and deadlines", "Remittance codes and their meaning"]) doc.fontSize(11).text(`• ${l}`);
    doc.addPage().fontSize(14).text("Working a payer mix");
    doc.fontSize(11).text("1. Know which payer the claim belongs to.\n2. Check that payer's rules before you act.\n3. Record what you learned for the next claim.");
    doc.end();
  });
}

test.beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("The demo prepares data only on a local database.");
  const db = new Client({ connectionString: url });
  await db.connect();
  const { rows } = await db.query(`SELECT "fileKey" FROM "Resource" WHERE "mimeType" = 'application/pdf' AND "fileKey" NOT LIKE 'https://%' ORDER BY "createdAt" LIMIT 1`);
  // Custom pages left by an interrupted recording are taken offline, as "Delete this page" does.
  await db.query(`UPDATE "SitePage" SET "archivedAt" = now(), "published" = NULL, "draft" = NULL WHERE custom AND title = 'Corporate training' AND "archivedAt" IS NULL`);
  await db.end();
  if (rows[0]) {
    const file = path.resolve("storage", rows[0].fileKey.includes("/") ? rows[0].fileKey : `materials/${rows[0].fileKey}`);
    if (!fs.existsSync(file)) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, await onePager());
    }
  }
  fs.mkdirSync(OUT, { recursive: true });
});

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / 20, from.y + ((to.y - from.y) * i) / 20);
    await page.waitForTimeout(25);
  }
  await page.mouse.up();
  await pause(page, 600);
}

/** Drags a component from the designer's left panel to a point on the page. */
async function dropComponent(page: Page, name: string, to: { x: number; y: number }) {
  const item = page.getByText(name, { exact: true }).first();
  await item.scrollIntoViewIfNeeded();
  const box = (await item.boundingBox())!;
  await drag(page, { x: box.x + 30, y: box.y + box.height / 2 }, to);
}

// Puck draws its settings panel twice (one copy for small screens): use the visible one.
const field = (page: Page, role: "textbox" | "combobox", name: string) => page.getByRole(role, { name, exact: true }).filter({ visible: true }).first();

test("record the website editor and designer walkthrough", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
  await hideDevOverlay(ctx);
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());

  await title(page, "Edit everything, without code", "The website, its theme, new pages and lesson content: changed by the Super Administrator from the admin. All data here is synthetic.");

  // 1. The website editor
  await signIn(page, "super@rcms.test");
  await go(page, "/admin/site");
  await caption(page, "Website pages: every public page, the navigation, footer, theme and legal pages. Only the Super Administrator has this.", 3800);
  await scrollBy(page, 900);
  await caption(page, "Each page shows whether it has its original copy, edits, or an unpublished draft.", 3000);

  await openEditor(page, "/admin/site/about");
  await caption(page, "A page's words, links, lists and section switches, laid out the way the page is.", 3200);
  const header = page.getByRole("group", { name: "Page header" });
  await header.getByLabel("Title").fill("");
  await header.getByLabel("Title").pressSequentially("Twenty-one years on the floor, written down for you.", { delay: 25 });
  await pause(page, 600);
  await scrollBy(page, 700);
  await page.getByRole("group", { name: "Beliefs" }).getByLabel("Show this section").uncheck();
  await caption(page, "Change the title, and switch the Beliefs section off.", 2600);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Draft saved" })).toBeVisible();
  await caption(page, "Saved as a draft. Visitors still see the published page.", 2800);

  await go(page, "/api/site/preview?key=about");
  await caption(page, "Preview shows the draft on the real page, with a bar saying so.", 3200);
  await scrollBy(page, 1400, 10);
  await pause(page, 800);
  await page.getByRole("link", { name: "Exit preview" }).click();
  await page.waitForLoadState("networkidle").catch(() => {});

  await openEditor(page, "/admin/site/about");
  await page.getByLabel("What changed (optional)").pressSequentially("Shorter title; beliefs hidden", { delay: 20 });
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Published as version/ })).toBeVisible();
  await caption(page, "Published. Every version is kept in the history and can be restored.", 3200);
  await go(page, "/about");
  await caption(page, "The live page has changed. No code, no deployment.", 3000);
  await openEditor(page, "/admin/site/about");
  await page.getByRole("button", { name: "Reset to the original copy" }).click();
  await expect(page.getByRole("status").filter({ hasText: "original copy again" })).toBeVisible();
  await caption(page, "And one click brings the original copy back. The edit stays in the history.", 3200);

  // 2. Theme
  await title(page, "Colours and fonts", "The whole site's look, with readability checked before anything goes live.");
  await openEditor(page, "/admin/site/theme");
  const colours = page.getByRole("group", { name: "Colours" });
  await colours.locator("#f-colours-primary").fill("#ffffff");
  await colours.locator("#f-colours-primaryText").fill("#eeeeee");
  await page.getByRole("button", { name: "Save draft" }).click();
  await caption(page, "White text on a white button is refused: text must have at least 4.5:1 contrast.", 3600);
  await colours.locator("#f-colours-primary").fill("#1f2f4f");
  await colours.locator("#f-colours-primaryText").fill("#ffffff");
  await colours.locator("#f-colours-brand").fill("#2f5d9a");
  await page.getByLabel("Headings", { exact: true }).selectOption("serif");
  await page.getByLabel("Corners").selectOption("soft");
  await caption(page, "Navy buttons, a blue accent, serif headings and softer corners.", 3000);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Published as version/ })).toBeVisible();
  await go(page, "/");
  await pause(page, 2500);
  await caption(page, "The homepage, restyled.", 2600);
  await go(page, "/pricing");
  await caption(page, "And every other public page with it.", 2600);
  await openEditor(page, "/admin/site/theme");
  await page.getByRole("button", { name: "Reset to the original copy" }).click();
  await expect(page.getByRole("status").filter({ hasText: "original copy again" })).toBeVisible();
  await caption(page, "Back to the original theme.", 2200);

  // 3. A new page, designed visually
  await title(page, "A new page, designed visually", "Drag in sections, infographics and interactive parts; place anything freely.");
  await go(page, "/admin/site");
  await page.getByLabel("Title").fill("Corporate training");
  await page.getByLabel("Address").fill(SLUG);
  await page.getByRole("button", { name: "Create page" }).click();
  await page.waitForURL(/\/admin\/site\/custom-/);
  await page.locator('[data-ready="true"]').waitFor();
  const pageEditor = page.url();
  await page.getByLabel("Label above the title").fill("For teams");
  await page.getByLabel("Introduction").pressSequentially("Training for whole revenue-cycle teams, scoped with you.", { delay: 15 });
  await page.getByRole("button", { name: "Open the visual designer" }).click();
  await page.waitForURL(/\/design/);
  await expect(page.getByText("Freeform canvas", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await caption(page, "The designer: components on the left, the page in the middle, settings on the right.", 3400);

  const canvasArea = (await page.locator("main").last().boundingBox()) ?? { x: 640, y: 200, width: 600, height: 400 };
  const dropAt = () => ({ x: canvasArea.x + canvasArea.width / 2, y: canvasArea.y + 120 });
  await dropComponent(page, "Heading", dropAt());
  await field(page, "textbox", "Text").fill("What a cohort includes");
  await dropComponent(page, "Key numbers", { x: dropAt().x, y: dropAt().y + 160 });
  await caption(page, "Drag in a heading and key numbers, then type into the settings panel.", 3000);
  await dropComponent(page, "Flip cards", { x: dropAt().x, y: dropAt().y + 360 });
  await dropComponent(page, "Accordion", { x: dropAt().x, y: dropAt().y + 520 });
  await caption(page, "Infographics and interactive pieces: flip cards, accordions, tabs, timelines, charts.", 3200);
  await page.getByRole("heading", { name: "What a cohort includes", exact: true }).click();
  await field(page, "combobox", "Size").selectOption("5xl");
  await field(page, "combobox", "Alignment").selectOption("center");
  await caption(page, "Every piece has its own font, size, colour, alignment and spacing.", 3000);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible({ timeout: 30_000 });
  await openEditor(page, pageEditor);
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Published as version 1/ })).toBeVisible();
  await go(page, `/p/${SLUG}`);
  await caption(page, `Live at /p/${SLUG}. Link it from the navigation or footer in the editor.`, 3400);
  await scrollBy(page, 700);
  await page.getByText("Tap to reveal").first().click().catch(() => {});
  await pause(page, 1200);

  // 4. A Word file becomes a lesson
  await title(page, "From a Word file to an interactive lesson", "Headings, lists, tables and pictures are laid out automatically, on your server, with no AI.");
  await go(page, "/admin/content");
  await page.locator('a[href^="/admin/content/courses/"]').first().click();
  await page.locator('a[href*="item=lesson:"]').first().click();
  await page.waitForURL(/item=lesson:/);
  const lessonUrl = page.url();
  await page.getByLabel("Add a block").selectOption("DESIGN");
  await page.getByLabel(/Start from a document/).scrollIntoViewIfNeeded();
  await caption(page, "Add a visual design and upload a document: here, a synthetic guide to working denials.", 3400);
  await page.getByLabel(/Start from a document/).setInputFiles("tests/fixtures/denials-guide.docx");
  await page.getByRole("button", { name: /Add visual design/ }).click();
  await page.waitForURL(/\/admin\/content\/design\//, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Working denials: a field guide", exact: true })).toBeVisible({ timeout: 30_000 });
  await caption(page, "The document, already structured: its title, then sections from its headings.", 3200);
  await page.mouse.move(canvasArea.x + canvasArea.width / 2, canvasArea.y + 300);
  await scrollBy(page, 600);
  await caption(page, "Its list of terms became flip cards; its numbered steps became a process.", 3200);
  await scrollBy(page, 700);
  await caption(page, "Its table of figures became a bar chart, and its picture sits beside its text.", 3200);
  await scrollBy(page, 700);
  await caption(page, "Notes and key takeaways became highlighted callouts.", 2600);

  // Freeform canvas
  await scrollBy(page, -2400);
  const heading = (await page.getByRole("heading", { name: "Working denials: a field guide", exact: true }).boundingBox())!;
  await dropComponent(page, "Freeform canvas", { x: heading.x + 200, y: heading.y + 10 });
  await page.getByRole("button", { name: "Open the canvas editor" }).filter({ visible: true }).first().click({ timeout: 15_000 });
  const dialog = page.getByRole("dialog", { name: "Canvas editor" });
  await caption(page, "The freeform canvas: place anything anywhere.", 2400);
  await dialog.getByRole("button", { name: "+ Shape (coloured box)" }).click();
  await dialog.getByLabel("Left %").fill("5");
  await dialog.getByLabel("Top %").fill("10");
  await dialog.getByLabel("Width %").fill("90");
  await dialog.getByLabel("Height %").fill("80");
  await dialog.getByRole("button", { name: "Send to back" }).click();
  await dialog.getByRole("button", { name: "+ Heading" }).click();
  await dialog.getByRole("textbox", { name: "Text", exact: true }).fill("From remittance to resolution");
  await dialog.getByRole("button", { name: "+ Badge" }).click();
  await dialog.getByRole("textbox", { name: "Text", exact: true }).fill("Module 3");
  const badge = (await dialog.getByRole("button", { name: /badge Module 3/ }).boundingBox())!;
  await drag(page, { x: badge.x + 15, y: badge.y + 8 }, { x: badge.x + 420, y: badge.y + 180 });
  const head = (await dialog.getByRole("button", { name: /heading From remittance/ }).boundingBox())!;
  await drag(page, { x: head.x + 30, y: head.y + 10 }, { x: head.x + 80, y: head.y + 120 });
  await caption(page, "Drag to move, drag the corner to resize, or type exact positions. Layers, colours and fonts on the right.", 3800);
  await dialog.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible({ timeout: 30_000 });
  await caption(page, "Saved into the lesson's draft. It reaches learners after the usual academic and compliance review.", 3600);

  // 5. What a learner sees
  await title(page, "What learners can't take away", "No copying or printing, and documents that are read, never downloaded.");
  await signIn(page, "student@rcms.test");
  await go(page, "/academy/foundation");
  await page.locator('a[href^="/academy/foundation/"]').first().click();
  await page.waitForURL(/\/academy\/foundation\/[^/#?]+$/);
  await page.waitForLoadState("networkidle").catch(() => {});
  await caption(page, "A lesson as the learner sees it.", 3600);
  await page.locator(".protected-content").click({ button: "right", position: { x: 200, y: 60 } }).catch(() => {});
  await caption(page, "No selecting, copying, right-click or saving. Printing shows a notice instead of the lesson.", 3400);
  const reader = page.locator('[id^="material-"]').first();
  if (await reader.count()) {
    await reader.scrollIntoViewIfNeeded();
    await pause(page, 2500);
    await caption(page, "A view-only PDF: each page is shown as an image. The file never reaches the browser.", 4000);
    await reader.getByRole("button", { name: "Next page" }).click();
    await pause(page, 2500);
  }
  await caption(page, "No website can stop a phone camera or a system screenshot; these measures are deterrents.", 3600);

  // Put everything back.
  await signIn(page, "super@rcms.test");
  await go(page, lessonUrl);
  const rows = page.locator("ol > li").filter({ hasText: /VISUAL DESIGN/ });
  for (let n = await rows.count(); n > 0; n--) {
    await rows.first().getByRole("button", { name: /Delete block/ }).click();
    await expect(rows).toHaveCount(n - 1);
  }
  await openEditor(page, pageEditor);
  await page.getByRole("button", { name: "Delete this page" }).click();
  await page.waitForURL(/\/admin\/site$/);

  await title(page, "That is the editor", "Words, theme, pages and lessons, changed from the admin; every change drafted, previewed, versioned and audited.");
  await ctx.close();
  await saveVideo(page, "rcms-cms-demo.webm");
});
