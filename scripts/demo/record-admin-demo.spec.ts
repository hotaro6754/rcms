import "dotenv/config";
import fs from "node:fs";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { caption, go, hideDevOverlay, OUT, pause, saveVideo, scrollBy, signIn, title } from "./helpers";

/**
 * A narrated walkthrough of the admin control centre, recorded as one video: the dashboard,
 * a role grant that a second administrator must approve, the audit log, content authoring and
 * review, grading and certificates, subscribers and corporate accounts, finance, vendors,
 * reports and settings.
 *
 * Needs a running app (`npm run dev`) on a seeded local database with the dev accounts
 * (`npm run db:seed && npm run dev:accounts`). Before recording it withdraws the demo role grant
 * from earlier runs, so the run is repeatable. Output: DEMO_OUT (default ./demo-output/rcms-admin-demo.webm).
 */

const GRANTEE = "agent@rcms.test";

test.beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("The demo resets data only on a local database.");
  const db = new Client({ connectionString: url });
  await db.connect();
  const { rows } = await db.query(`SELECT id FROM "User" WHERE email = $1`, [GRANTEE]);
  if (!rows.length) throw new Error(`Run npm run dev:accounts first (${GRANTEE} is missing).`);
  await db.query(`DELETE FROM "StaffRoleAssignment" WHERE "userId" = $1 AND role = 'REPORTING_ANALYST'`, [rows[0].id]);
  await db.query(`UPDATE "ApprovalRequest" SET status = 'CANCELLED' WHERE kind = 'ROLE_CHANGE' AND status = 'PENDING' AND "targetId" = $1`, [rows[0].id]);
  await db.end();
  fs.mkdirSync(OUT, { recursive: true });
});

/** Opens the first link matching a selector, if the page has one. */
async function openFirst(page: Page, selector: string) {
  const link = page.locator(selector).first();
  if (!(await link.count())) return false;
  const href = await link.getAttribute("href");
  await go(page, href!);
  return true;
}

test("record the admin walkthrough", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
  await hideDevOverlay(ctx);
  const page = await ctx.newPage();

  await title(page, "The admin control centre", "Running the academy: people, content, learners, money and records. Every account and record here is synthetic.");

  // 1. Dashboard
  await signIn(page, "super@rcms.test");
  await go(page, "/admin");
  await caption(page, "Signed in as the super administrator. The dashboard shows what needs attention today.", 3400);
  await scrollBy(page, 700);
  await caption(page, "The menu on the left only lists what this person's roles allow. The server checks every action again.", 3400);

  // 2. Users and a role grant that needs a second person
  await title(page, "People and roles", "No one can give themselves, or anyone else, a role on their own.");
  await go(page, "/admin/users");
  await caption(page, "Staff accounts and their roles. Twelve staff roles, each with a fixed set of permissions.", 3200);
  const form = page.locator("form", { has: page.locator("#re") });
  await form.scrollIntoViewIfNeeded();
  await page.locator("#re").pressSequentially(GRANTEE, { delay: 30 });
  await page.locator("#ra").selectOption({ label: "Grant" }).catch(() => page.locator("#ra").selectOption({ index: 0 }));
  await page.locator("#rr").selectOption({ label: "Reporting Analyst" });
  await page.locator("#rz").pressSequentially("Needs the support dashboards for the weekly review.", { delay: 15 });
  await caption(page, "Request a role for a support agent, with a reason.", 2200);
  await form.getByRole("button", { name: "Request" }).click();
  await expect(page.getByText(/Another administrator with approval authority must approve it/)).toBeVisible();
  await caption(page, "The request is recorded, but nothing changes until a different administrator approves it.", 3400);

  await signIn(page, "director@rcms.test");
  await go(page, "/admin/approvals");
  await caption(page, "Signed in as the academy director. The request is waiting here.", 3000);
  const item = page.locator("li, article, tr").filter({ hasText: GRANTEE }).filter({ has: page.getByRole("button", { name: "Approve" }) }).first();
  await item.scrollIntoViewIfNeeded();
  await item.getByLabel("Decision note").pressSequentially("Approved for the weekly review.", { delay: 20 });
  await item.getByRole("button", { name: "Approve" }).click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 1500);
  await caption(page, "Approved. The role takes effect now, and the requester could not have approved it themselves.", 3400);

  await go(page, "/admin/audit");
  await caption(page, "The audit log records the request and the decision: who, what, when and why.", 3400);
  await scrollBy(page, 500);
  await caption(page, "Entries cannot be edited or deleted. The database itself refuses.", 3000);

  // 3. Content
  await signIn(page, "super@rcms.test");
  await title(page, "Content and review", "Courses are written as drafts and reach learners only after academic and compliance review.");
  await go(page, "/admin/content");
  await caption(page, "Levels and courses. Each course shows whether it has a released version and unreleased changes.", 3400);
  if (await openFirst(page, 'a[href^="/admin/content/courses/"]')) {
    await caption(page, "A course: its modules and lessons on the left, the selected item on the right.", 3200);
    if (await openFirst(page, 'a[href*="item=lesson:"]')) {
      await caption(page, "A lesson: its settings, review dates and sources, and the content blocks learners read.", 3400);
      await scrollBy(page, 700);
    }
  }
  await go(page, "/admin/content/review");
  await caption(page, "The review queue. Academic review first, then compliance. Authors cannot approve their own work.", 3400);
  await go(page, "/admin/content/library");
  await caption(page, "The library: glossary, processes, case studies and toolkit, also reviewed before it is published.", 3200);
  await go(page, "/admin/content/banks");
  await caption(page, "Question banks for randomised assessments.", 2600);

  await go(page, "/admin/cases");
  await caption(page, "Denial case simulations, with their review status and published versions.", 3000);
  await go(page, "/admin/competencies");
  await caption(page, "The competency framework the cases measure.", 2800);

  // 4. Grading and certificates
  await title(page, "Grading and certificates", "Written answers and uploads are marked by people; certificates can be verified by anyone.");
  await go(page, "/admin/grading");
  await caption(page, "Written answers and uploads waiting to be marked.", 2800);
  await go(page, "/admin/grading/cases");
  await caption(page, "Case attempts an instructor can review and adjust.", 2800);
  await go(page, "/admin/certificates");
  await caption(page, "Issued certificates. They can be revoked and reissued; the public check shows the current status.", 3400);

  // 5. Learners and corporate accounts
  await title(page, "Learners and companies", "Subscriber records, corporate accounts and their seats.");
  await go(page, "/admin/subscribers");
  await caption(page, "Subscribers, searchable by name, email or account ID, and exportable.", 3000);
  await page.getByLabel("Search").pressSequentially("student@", { delay: 40 });
  await page.getByLabel("Search").press("Enter");
  await page.waitForLoadState("networkidle").catch(() => {});
  await pause(page, 1200);
  if (await openFirst(page, 'a[href^="/admin/subscribers/c"], table a[href^="/admin/subscribers/"]')) {
    await caption(page, "One learner: plan, enrolments, progress, certificates and support history.", 3200);
    await scrollBy(page, 900);
    await caption(page, "Changes such as a progress reset also need a second person's approval.", 3000);
  }
  await go(page, "/admin/organisations");
  await caption(page, "Corporate accounts.", 2200);
  if (await openFirst(page, 'a[href^="/admin/organisations/"]:has-text("Synthetic Billing Partners")')) {
    await caption(page, "A company's seats, groups and members. Its manager sees their team's progress and competencies.", 3400);
    await scrollBy(page, 600);
  }

  // 6. Money
  await title(page, "Finance and vendors", "Prices, refunds and payouts, with the same two-person rule.");
  await go(page, "/admin/finance");
  await caption(page, "Orders and payments. An order is marked paid only when the payment provider confirms it, never from a browser redirect.", 3800);
  await go(page, "/admin/finance/products");
  await caption(page, "Products and prices. A price change is a request that someone else approves.", 3200);
  await go(page, "/admin/finance/refunds");
  await caption(page, "Refunds are requested by one person and approved by another.", 3000);
  await go(page, "/admin/finance/coupons");
  await caption(page, "Coupons with limits and expiry dates.", 2400);
  await go(page, "/admin/vendors");
  await caption(page, "Vendors. The person who changes a vendor's bank details can never approve that vendor's payment.", 3600);
  if (await openFirst(page, 'a[href^="/admin/vendors/"]')) {
    await caption(page, "A vendor's profile, deliverables and payouts. Only the last four digits of the account are shown, and payout changes need approval.", 3200);
  }

  // 7. Reports, records and settings
  await title(page, "Reports and records", "Dashboards, privacy requests and platform settings.");
  await go(page, "/admin/reports");
  await caption(page, "Reports on learners, content, support and revenue, each limited to what the viewer's role allows.", 3400);
  await scrollBy(page, 800);
  await go(page, "/admin/support");
  await caption(page, "The support workspace: tickets, teams, routing and response targets.", 3000);
  await go(page, "/admin/privacy");
  await caption(page, "Data requests: a learner can ask for their data or for deletion, and every step is tracked.", 3200);
  await go(page, "/admin/settings");
  await caption(page, "Settings, and which integrations are configured. A setting changes only after a different administrator approves.", 3400);

  await title(page, "That is the admin side", "Every sensitive change needs two people, and every action is in the audit log.");

  await ctx.close();
  await saveVideo(page, "rcms-admin-demo.webm");
});
