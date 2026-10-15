import { expect, test, type Page } from "@playwright/test";

/**
 * Support lifecycle in the browser: a learner raises a case with context and gets its real
 * number and owning team; staff see it in the queue, ask for information, resolve it with a
 * summary; the learner reads the resolution and reopens it by replying; the history records it.
 * Needs `npm run db:seed && npm run dev:accounts`.
 */

const PASSWORD = "Rcms-dev-password-1";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

test("support case: raise, route, reply, resolve, reopen, history", async ({ browser }) => {
  const subject = `Video will not play ${Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 8)}`;
  const lCtx = await browser.newContext();
  const learner = await lCtx.newPage();
  learner.on("dialog", (d) => d.accept());
  await signIn(learner, "student@rcms.test");
  await learner.goto("/support/new?category=TECHNICAL&from=%2Facademy");
  await learner.getByLabel("Subject").fill(subject);
  await learner.getByRole("textbox", { name: "Message" }).fill("The lesson video shows a spinner and never starts, on two browsers.");
  await learner.getByLabel("How much does it affect you?").selectOption("2");
  await learner.getByRole("button", { name: "Send", exact: true }).click();
  await learner.waitForURL(/\/support\/[^/]+\?new=1/);
  const status = learner.getByRole("status").filter({ hasText: "Your case number is" });
  await expect(status).toContainText(/SUP-/);
  const reference = (await status.locator(".text-data").innerText()).trim();
  await expect(status).toContainText(/Technical/);
  const caseUrl = learner.url().split("?")[0];

  // The support manager sees it in the technical team's queue and asks for more information.
  const sCtx = await browser.newContext();
  const staff = await sCtx.newPage();
  await signIn(staff, "supportmgr@rcms.test");
  await staff.goto(`/admin/support?view=all&q=${encodeURIComponent(reference)}`);
  await staff.getByRole("link", { name: subject }).click();
  await staff.waitForURL(/\/admin\/support\/[^/]+$/);
  await expect(staff.getByText(/Raised from \/academy/)).toBeVisible();
  await staff.getByLabel("Reply").fill("Which browser versions, and does another lesson's video play?");
  await staff.getByRole("button", { name: "Send", exact: true }).click();
  await expect(staff.getByText("Which browser versions")).toBeVisible();

  // The learner sees that it is waiting on them and replies.
  await learner.goto(caseUrl);
  await expect(learner.getByText("Waiting for your reply")).toBeVisible();
  await learner.getByLabel("Reply").fill("Latest Chrome and Firefox. Other videos play.");
  await learner.getByRole("button", { name: "Send", exact: true }).click();
  await expect(learner.getByText("Other videos play.")).toBeVisible();

  // Staff resolve with a summary; an invalid jump is not offered.
  await staff.reload();
  const moveTo = staff.getByLabel("Move to");
  await expect(moveTo.locator("option", { hasText: "Closed" })).toHaveCount(0);
  await moveTo.selectOption("RESOLVED");
  await staff.getByLabel(/Resolution summary/).fill("The lesson's video file was re-encoded; it now plays in all browsers.");
  await staff.getByRole("button", { name: "Update" }).click();
  await expect(staff.getByText(/Resolution: The lesson.s video file/).first()).toBeVisible();

  // The learner reads the resolution and reopens by replying.
  await learner.goto(caseUrl);
  await expect(learner.getByText("How it was resolved")).toBeVisible();
  await learner.getByLabel("Reopen with a reply").fill("It stops again after two minutes.");
  await learner.getByRole("button", { name: "Send", exact: true }).click();
  await expect(learner.getByText("Reopened").first()).toBeVisible();

  // The history shows the whole path.
  await staff.reload();
  const history = staff.locator("section", { has: staff.getByRole("heading", { name: "History" }) });
  for (const kind of ["created", "routed", "resolved", "reopened"]) await expect(history.getByText(new RegExp(`\\b${kind}\\b`)).first()).toBeVisible();

  await Promise.all([lCtx.close(), sCtx.close()]);
});
