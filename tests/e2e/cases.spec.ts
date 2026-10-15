import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";

/**
 * The flagship journey: a reviewer activates the competencies and approves a case, a learner
 * investigates it, saves, returns, submits and gets scored feedback, an instructor reviews the
 * attempt, and the learner's corporate manager sees the competency evidence.
 *
 * Needs `npm run db:seed && npm run dev:accounts`. Before running, it removes the test learner's
 * own attempts at this one case (local development data only) so attempt limits do not
 * accumulate across runs.
 */

const PASSWORD = "Rcms-dev-password-1";
const CASE_TITLE = "A duplicate denial on a claim that was already paid";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

test.beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("E2E data reset runs only against a local database.");
  const db = new Client({ connectionString: url });
  await db.connect();
  await db.query(`DELETE FROM "SimAttempt" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'student@rcms.test') AND "caseId" = (SELECT id FROM "SimCase" WHERE slug = 'duplicate-denial-already-paid')`);
  await db.end();
});

test("denial case: approve, investigate, save and return, submit, feedback, instructor review, manager view", async ({ browser }) => {
  // 1. A reviewer activates draft competencies and approves the case if still in review.
  const rCtx = await browser.newContext();
  const reviewer = await rCtx.newPage();
  await signIn(reviewer, "academic@rcms.test");
  await reviewer.goto("/admin/competencies");
  // Buttons inside closed <details> are hidden from role queries: open every competency first.
  const summaries = reviewer.locator("details > summary");
  for (let i = 0; i < (await summaries.count()); i++) await summaries.nth(i).click();
  for (;;) {
    const activate = reviewer.getByRole("button", { name: "Review and activate" });
    const n = await activate.count();
    if (n === 0) break;
    await activate.first().click();
    await expect(activate).toHaveCount(n - 1);
  }
  await reviewer.goto("/admin/cases");
  await reviewer.getByRole("link", { name: CASE_TITLE }).click();
  await reviewer.waitForURL(/\/admin\/cases\/[^/]+$/);
  await expect(reviewer.getByRole("heading", { name: "Published versions" })).toBeVisible();
  const approve = reviewer.getByRole("button", { name: "Approve and publish" });
  if (await approve.count()) {
    await approve.click();
    await expect(reviewer.getByText("v1 ·")).toBeVisible();
  }

  // 2. The learner starts the case, answers some questions, and the answers survive a reload.
  const lCtx = await browser.newContext();
  const learner = await lCtx.newPage();
  learner.on("dialog", (d) => d.accept());
  await signIn(learner, "student@rcms.test");
  await learner.goto("/cases");
  const card = learner.locator("li", { hasText: CASE_TITLE });
  await card.getByRole("button", { name: /Start case|Try again/ }).click();
  await learner.waitForURL(/\/cases\/attempt\//);
  const attemptUrl = learner.url();

  // The answer key never reaches the browser before submission.
  const html = await learner.content();
  expect(html).not.toContain("SYN-B-9034 is an exact duplicate");
  expect(html).not.toMatch(/"correct":true/);

  await learner.getByLabel("A second submission of a visit the payer has already paid").check();
  await expect(learner.getByText(/Saved at/)).toBeVisible();
  await learner.reload();
  await expect(learner.getByLabel("A second submission of a visit the payer has already paid")).toBeChecked();

  for (const title of ["Remittance 2026-08-06, claim SYN-A-7781", "Remittance 2026-08-12, claim SYN-B-9034", "Northwind portal claim status", "Account note 2026-07-29", "Northwind provider manual §7.3 Duplicate claims (fictional)"]) {
    await learner.locator("article", { hasText: title }).getByLabel("Relied on").check();
  }
  await learner.getByLabel("Whether the 2026-08-06 payment has been posted to the account").check();
  await learner.getByLabel(/Manual §7\.3: duplicate denials are not appealable/).check();
  await learner.getByLabel(/Confirm the original payment is posted/).check();
  await learner.getByLabel("No, I can resolve it").check();
  await learner.getByLabel(/7\. Why\?/).fill("The portal and the 08-06 remittance show SYN-A-7781 was paid. An appeal or resubmission would be wrong: §7.3 says duplicates are not appealable.");
  await learner.getByLabel(/8\. Account note/).fill("OA-18 duplicate denial on SYN-B-9034. Original claim SYN-A-7781 paid 2026-08-06 by EFT; payment posted. Cause: resubmitted after a status check returned no record. No further action; denial closed.");
  await learner.getByRole("button", { name: "Submit for scoring" }).click();
  await expect(learner.getByRole("heading", { name: "Result" })).toBeVisible();
  await expect(learner.getByText("Passed", { exact: true })).toBeVisible();
  await expect(learner.getByRole("heading", { name: "The expected decision" })).toBeVisible();
  await expect(learner.getByText("Demonstrated").first()).toBeVisible();

  // 3. An instructor reviews the attempt and leaves feedback the learner can read.
  await reviewer.goto("/admin/grading/cases?state=all");
  await reviewer.locator("tr", { hasText: CASE_TITLE }).first().getByRole("link").click();
  await reviewer.getByLabel("Feedback to the learner").fill("Clear note: the next person knows the original paid and why nothing else is needed.");
  await reviewer.getByRole("button", { name: "Save review" }).click();
  await expect(reviewer.getByText("Review saved")).toBeVisible();
  await learner.goto(attemptUrl);
  await expect(learner.getByText("Instructor feedback")).toBeVisible();
  await expect(learner.getByText("Reviewed by an instructor")).toBeVisible();

  // 4. The corporate manager sees the competency evidence for their team, and only their team.
  const mCtx = await browser.newContext();
  const manager = await mCtx.newPage();
  await signIn(manager, "manager@rcms.test");
  await manager.goto("/team");
  const row = manager.locator("tr", { hasText: "Test Learner" }).last();
  await expect(row.getByText("Demonstrated").first()).toBeVisible();

  // 5. A learner cannot open the review or authoring pages.
  await learner.goto("/admin/grading/cases");
  await expect(learner).not.toHaveURL(/\/admin\/grading\/cases/);

  await Promise.all([rCtx.close(), lCtx.close(), mCtx.close()]);
});
