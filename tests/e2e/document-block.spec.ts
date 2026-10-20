import PDFDocument from "pdfkit";
import { expect, test, type Page } from "@playwright/test";

/**
 * Adding a view-only document to a lesson: a PDF uploaded to the media library shows up in the
 * block's picker; a PDF or a Word file can be uploaded right in the block's form (Word is
 * converted to a PDF); anything else is refused with a message. The blocks are removed again.
 * Needs `npm run db:seed && npm run dev:accounts`.
 */

const PASSWORD = "Rcms-dev-password-1";

function pdf(text: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A5" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.fontSize(18).text(text);
    doc.end();
  });
}

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

test("a PDF from the library, or a PDF or Word file uploaded in the form, becomes a view-only document", async ({ page }) => {
  test.setTimeout(180_000);
  page.on("dialog", (d) => d.accept());
  const stamp = Date.now().toString(36);
  const libraryTitle = `Library PDF ${stamp}`;
  const formTitle = `Form PDF ${stamp}`;
  await signIn(page, "content@rcms.test");

  // A PDF uploaded to the media library...
  await page.goto("/admin/content/media");
  await page.locator("#file").setInputFiles({ name: "library.pdf", mimeType: "application/pdf", buffer: await pdf("Library PDF") });
  await page.locator("#title").fill(libraryTitle);
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByText("Uploaded.")).toBeVisible();

  // ...is offered when adding a document to a lesson.
  const lessonUrl = await firstLesson(page);
  await page.getByLabel("Add a block").selectOption("DOCUMENT");
  const form = page.locator("form", { has: page.getByLabel("Or upload a PDF or Word file here") });
  await expect(page.getByLabel("PDF from the media library").locator("option", { hasText: libraryTitle })).toHaveCount(1);

  // A Word file uploaded in the form is turned into a PDF and shown as a view-only document.
  const wordTitle = `Word ${stamp}`;
  await form.getByLabel("Or upload a PDF or Word file here").setInputFiles("tests/fixtures/denials-guide.docx");
  await form.getByLabel("Title", { exact: true }).fill(wordTitle);
  await form.getByRole("button", { name: /^Add document/ }).click();
  await expect(page.getByText(new RegExp(`${wordTitle} · \\d+ pages, view only`))).toBeVisible({ timeout: 30_000 });

  // Anything else is refused with a message that says what is accepted.
  await page.getByLabel("Add a block").selectOption("DOCUMENT");
  await form.getByLabel("Or upload a PDF or Word file here").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("just text") });
  await form.getByLabel("Title", { exact: true }).fill("Text attempt");
  await form.getByRole("button", { name: /^Add document/ }).click();
  await expect(form.getByRole("alert").filter({ hasText: /PDF and Word/ })).toBeVisible();

  // A PDF uploaded in the form is stored, chosen and shown as a block.
  await page.getByLabel("Or upload a PDF or Word file here").setInputFiles({ name: `form-${stamp}.pdf`, mimeType: "application/pdf", buffer: await pdf("Form PDF") });
  await form.getByLabel("Title", { exact: true }).fill(formTitle);
  await form.getByRole("button", { name: /^Add document/ }).click();
  await expect(page.getByText(`${formTitle} · 1 pages, view only`)).toBeVisible({ timeout: 30_000 });

  // It is in the media library too.
  await page.goto("/admin/content/media");
  await expect(page.locator(`input[value="form ${stamp}"]`)).toHaveCount(1);

  // Remove the block again.
  await page.goto(lessonUrl);
  for (const t of [formTitle, wordTitle]) {
    const row = page.locator("li", { hasText: t }).filter({ has: page.getByRole("button", { name: /^Delete block/ }) }).last();
    await row.getByRole("button", { name: /^Delete block/ }).click();
    await expect(page.getByText(t)).toHaveCount(0);
  }
});
