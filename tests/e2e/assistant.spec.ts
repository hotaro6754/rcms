import { expect, test, type Page } from "@playwright/test";

/**
 * The assistant in the browser: a learner gets an answer from their records and a sourced
 * answer, asks for a person and receives the real case number; staff find that case through the
 * copilot and assign it only after confirming. Needs `npm run db:seed && npm run dev:accounts`.
 */

const PASSWORD = "Rcms-dev-password-1";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

async function ask(page: Page, q: string) {
  const before = await page.locator('ol[aria-label="Conversation"] > li').count();
  await page.getByLabel("Your question").fill(q);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.locator('ol[aria-label="Conversation"] > li')).toHaveCount(before === 1 && !(await page.locator('ol[aria-label="Conversation"] > li', { hasText: "You:" }).count()) ? 2 : before + 2);
  return page.locator('ol[aria-label="Conversation"] > li').last();
}

test("assistant: records, sources, hand-off with a real case number, copilot action with confirmation", async ({ browser }) => {
  const lCtx = await browser.newContext();
  const learner = await lCtx.newPage();
  await signIn(learner, "student@rcms.test");
  await learner.goto("/assistant");

  const progress = await ask(learner, "What do I need to complete before my certificate?");
  await expect(progress.getByText("From your records")).toBeVisible();

  const help = await ask(learner, "How is case practice scored?");
  await expect(help.getByText("Sources")).toBeVisible();
  await expect(help.getByRole("link", { name: "How case practice is scored" })).toBeVisible();

  const human = await ask(learner, "Can I talk to a human about my certificate?");
  await human.getByLabel("Subject").fill("Certificate name spelling");
  await human.getByRole("button", { name: "Send to support" }).click();
  const confirmation = learner.locator('ol[aria-label="Conversation"] > li').last();
  await expect(confirmation).toContainText(/Your case SUP-\d{4}-\d+ is open/);
  const reference = (await confirmation.innerText()).match(/SUP-\d{4}-\d+/)![0];

  // Staff: the copilot proposes, the person confirms, the normal service assigns.
  const sCtx = await browser.newContext();
  const staff = await sCtx.newPage();
  await signIn(staff, "supportmgr@rcms.test");
  await staff.goto("/admin/copilot");
  const summary = await ask(staff, `Summarize ${reference}`);
  await expect(summary).toContainText("Certificate name spelling");
  // Routing may already have given the case to this manager: unassign it on the case page first.
  await summary.getByRole("link", { name: `Open ${reference}` }).click();
  await staff.waitForURL(/\/admin\/support\/[^/]+$/);
  await staff.getByLabel("Assign to").selectOption("");
  await staff.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(staff.getByText("· unassigned")).toBeVisible();
  await staff.goto("/admin/copilot");
  const proposal = await ask(staff, `Assign ${reference} to me`);
  await proposal.getByRole("button", { name: new RegExp(`Confirm: Assign ${reference} to me`) }).click();
  await expect(staff.locator('ol[aria-label="Conversation"] > li').last()).toContainText(`Done: ${reference} is assigned to you.`);

  await Promise.all([lCtx.close(), sCtx.close()]);
});
