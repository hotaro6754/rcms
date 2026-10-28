import "dotenv/config";
import fs from "node:fs";
import { Client } from "pg";
import { expect, test } from "@playwright/test";
import { ask, caption, go, hideDevOverlay, OUT, pause, saveVideo, scrollBy, signIn, title } from "./helpers";

/**
 * A narrated walkthrough of the academy, recorded as one video: public site, case review and
 * publication, a learner working a denial case (a critical error, then a pass), the assistant
 * handing off to support, a support lead resolving the case, the copilot, and the manager view.
 *
 * Local development data only: before recording it removes the demo learner's attempts at the
 * demo case and the demo accounts' assistant conversations, so the run is repeatable. Output: DEMO_OUT (default ./demo-output/rcms-demo.webm).
 */

const CASE_SLUG = "medical-necessity-plan-of-care-lapsed";
const CASE_TITLE = "A medical necessity denial that billing cannot fix alone";

test.beforeAll(async () => {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("The demo resets data only on a local database.");
  const db = new Client({ connectionString: url });
  await db.connect();
  // Put the demo case back into review so the recording shows a reviewer approving it.
  await db.query(`UPDATE "SimCase" SET status = 'IN_REVIEW', "submittedById" = 'seed', "hasDraftChanges" = true WHERE slug = $1 AND status = 'PUBLISHED'`, [CASE_SLUG]);
  await db.query(`DELETE FROM "AssistantConversation" WHERE "userId" IN (SELECT id FROM "User" WHERE email IN ('student@rcmexcel.com', 'supportmgr@rcmexcel.com'))`);
  await db.query(`DELETE FROM "SimAttempt" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'student@rcmexcel.com') AND "caseId" = (SELECT id FROM "SimCase" WHERE slug = $1)`, [CASE_SLUG]);
  await db.end();
  fs.mkdirSync(OUT, { recursive: true });
});

test("record the walkthrough", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
  await hideDevOverlay(ctx);
  const page = await ctx.newPage();

  // 1. Opening and public site
  await title(page, "From knowing RCM to doing it", "Synthetic denied claims, scored decisions, competency evidence, and support built into learning.");
  await go(page, "/");
  await caption(page, "The public site: courses, learning paths and prices come straight from the database.");
  await scrollBy(page, 1400, 10);
  await go(page, "/catalog");
  await caption(page, "The catalogue lists only released course versions.");
  await go(page, "/legal/content-governance");
  await caption(page, "Every piece of content is reviewed before publication, with sources and review dates.");

  // 2. Reviewer publishes a case
  await title(page, "1 · Authoring and review", "Instructors build cases without code; a different reviewer approves them.");
  await signIn(page, "academic@rcmexcel.com");
  await go(page, "/admin/competencies");
  await caption(page, "The competency framework: each competency names the rubric criteria that evidence it.");
  await go(page, "/admin/cases");
  await caption(page, "Case simulations, with status and published versions.");
  await page.getByRole("link", { name: CASE_TITLE }).click();
  await page.waitForURL(/\/admin\/cases\/[^/]+$/);
  await page.getByRole("heading", { name: "Published versions" }).waitFor();
  await caption(page, "The case editor: claim, evidence, questions, answer key, rubric weights and critical errors, all as form fields.", 3200);
  await scrollBy(page, 2400, 12);
  await page.getByRole("heading", { name: "Rubric" }).scrollIntoViewIfNeeded();
  await caption(page, "Critical errors fail an attempt whatever its total, such as asking for a clinical note to be changed.", 3200);
  const approve = page.getByRole("button", { name: "Approve and publish" });
  if (await approve.count()) {
    await approve.scrollIntoViewIfNeeded();
    await caption(page, "This reviewer did not write the case, so they can approve it. Approval freezes it as a new numbered version.");
    await approve.click();
    await page.getByText(/^v\d+ ·/).first().waitFor();
    await caption(page, "Published.");
  }

  // 3. Learner works the case
  await title(page, "2 · A learner works a denial", "Investigate, decide, document, submit and get scored feedback.");
  await signIn(page, "student@rcmexcel.com");
  await go(page, "/cases");
  await caption(page, "Case practice, and the learner's competency evidence so far.");
  await page.locator("li", { hasText: CASE_TITLE }).getByRole("button", { name: /Start case|Try again/ }).click();
  await page.waitForURL(/\/cases\/attempt\//);
  await caption(page, "The case file: claim, denial codes, timeline and evidence. The answer key never reaches the browser.", 3200);
  await scrollBy(page, 900, 8);
  for (const t of ["Remittance 2026-06-03, claim SYN-40962", "Plan of care, signed 2026-03-01", "Treatment note 2026-05-12", "Northwind provider manual §6.4 Outpatient therapy (fictional)", "Billing note 2026-06-09"]) {
    const art = page.locator("article", { hasText: t });
    await art.scrollIntoViewIfNeeded();
    await art.getByLabel("Relied on").check();
    await page.waitForTimeout(350);
  }
  await caption(page, "The learner marks the evidence they rely on.");
  page.on("dialog", (d) => d.accept());
  const decide = async (amend: boolean) => {
    await page.getByLabel(/outside a current plan of care/).check();
    await page.getByLabel("Whether a recertified plan of care covering 2026-05-12 exists").check();
    await page.getByLabel("Whether the treatment note relates the exercises to measurable functional goals").check();
    await page.getByLabel(/§6\.4: therapy is covered under a current/).check();
    await page.getByLabel(/2026-11-30/).check();
    await page.getByLabel(amend ? /Ask the therapist to add functional goals/ : /Route to the therapy clinical lead/).check();
    await page.getByLabel(amend ? "No, I can resolve it" : "Yes, escalate").check();
    if (!amend) await page.getByLabel(/Who should it go to/).fill("Therapy clinical lead: confirm whether a recertified plan of care exists.");
  };
  await decide(true);
  await page.getByRole("heading", { name: "Your decision" }).scrollIntoViewIfNeeded();
  await caption(page, "First attempt: a tempting shortcut, asking the therapist to add goals to the note so the appeal succeeds.", 3200);
  await page.getByLabel(/7\. Why\?/).fill("The plan of care lapsed on 04-29, so adding goals to the note will support the appeal.");
  await page.getByLabel(/8\. Account note/).fill("CO-50 on 97110. Plan of care lapsed. Asked therapist to add goals. Appeal deadline 11-30. Follow up next week.");
  await page.getByRole("button", { name: "Submit for scoring" }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Submit for scoring" }).click();
  await page.getByRole("heading", { name: "Result" }).waitFor();
  await caption(page, "Scored on the server. A critical error fails the attempt even though much of it was right.", 3200);
  await page.getByText(/Critical error/).first().scrollIntoViewIfNeeded();
  await pause(page, 2500);
  await page.getByText("What the action you chose would risk").scrollIntoViewIfNeeded().catch(() => {});
  await caption(page, "The feedback explains the risk of the action chosen. The answer stays hidden until a pass or the second attempt.", 3400);
  await page.getByRole("heading", { name: "Rubric" }).scrollIntoViewIfNeeded();
  await pause(page, 2500);

  await page.getByRole("button", { name: /Try again/ }).click();
  await page.waitForURL(/\/cases\/attempt\//);
  await page.getByRole("heading", { name: "Your decision" }).waitFor();
  for (const t of ["Remittance 2026-06-03, claim SYN-40962", "Plan of care, signed 2026-03-01", "Treatment note 2026-05-12", "Northwind provider manual §6.4 Outpatient therapy (fictional)", "Billing note 2026-06-09"]) {
    await page.locator("article", { hasText: t }).getByLabel("Relied on").check();
  }
  await decide(false);
  await page.getByRole("heading", { name: "Your decision" }).scrollIntoViewIfNeeded();
  await caption(page, "Second attempt: escalate to the clinical lead and hold the appeal decision.", 2800);
  await page.getByLabel(/7\. Why\?/).fill("The plan of care lapsed on 04-29 and no recert has been found. This is a clinical documentation question billing cannot resolve or amend.");
  await page.getByLabel(/8\. Account note/).fill("CO-50 on 97110 x4. Plan of care certification ended 04-29; no recert found in scanned chart. Routed to therapy clinical lead for clinical review. Appeal deadline 11-30 (180 days from denial). Follow up in 3 business days.");
  await page.getByRole("button", { name: "Submit for scoring" }).click();
  await page.getByRole("heading", { name: "Result" }).waitFor();
  await caption(page, "Passed. The expected decision, its evidence, and competency outcomes are now shown.", 3200);
  await page.getByRole("heading", { name: /Competency evidence/ }).scrollIntoViewIfNeeded();
  await pause(page, 2600);
  await page.getByRole("heading", { name: "The expected decision" }).scrollIntoViewIfNeeded();
  await pause(page, 3000);

  // 4. Assistant and hand-off
  await title(page, "3 · Help inside the workflow", "Answers from approved material and the learner's own records, then a hand-off to a person.");
  await go(page, "/assistant");
  await caption(page, "The assistant answers only from material this learner may read, with sources.");
  await ask(page, "What do I need to complete before my certificate?");
  await caption(page, "Questions about the learner's own progress are answered from their records, never generated.", 3200);
  await ask(page, "How is case practice scored?");
  await caption(page, "Knowledge answers quote approved material and cite it.", 3000);
  const human = await ask(page, "Can I talk to a human about my certificate?");
  await caption(page, "Asking for a person offers a support case the learner can check before sending.");
  await human.getByLabel("Subject").fill("Name spelling on my certificate");
  await human.getByRole("button", { name: "Send to support" }).click();
  const conf = page.locator('ol[aria-label="Conversation"] > li').last();
  await expect(conf).toContainText(/SUP-\d{4}-\d+/);
  await conf.scrollIntoViewIfNeeded();
  await caption(page, "The real case number and owner come back from the support system.", 3200);
  const reference = (await conf.innerText()).match(/SUP-\d{4}-\d+/)![0];

  // 5. Support lead
  await title(page, "4 · Support operations", "Routing, targets, history and resolution.");
  await signIn(page, "supportmgr@rcmexcel.com");
  await go(page, "/admin/support?view=all");
  await caption(page, "The queue: routed by topic to a team and owner, with first-response and resolution targets.", 3200);
  await go(page, `/admin/support?view=all&q=${reference}`);
  await page.getByRole("link", { name: "Name spelling on my certificate" }).click();
  await page.waitForURL(/\/admin\/support\/[^/]+$/);
  await caption(page, "The case: the conversation, its source (the assistant), targets and full history.", 3200);
  await page.getByRole("heading", { name: "History" }).scrollIntoViewIfNeeded();
  await pause(page, 2200);
  await page.getByLabel("Reply").fill("Thanks. Please confirm the exact spelling you need and we will reissue the certificate.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByText("Please confirm the exact spelling").waitFor();
  await caption(page, "Replying moves it to Waiting for learner. Only valid status moves are offered.", 3000);
  await go(page, "/admin/support/settings");
  await caption(page, "Leads configure teams, topic routing, targets and support hours, and see measures from recorded timestamps.", 3400);
  await scrollBy(page, 1600, 10);

  // 6. Copilot
  await go(page, "/admin/copilot");
  await caption(page, "The staff copilot answers from records within the user's permissions.");
  await ask(page, "Show recurring competency gaps");
  await caption(page, "Competencies most often not demonstrated, from scored attempts.", 3000);
  await ask(page, `Summarize ${reference}`);
  await caption(page, "Ticket summaries, and actions such as assignment only after explicit confirmation.", 3200);

  // 7. Manager view
  await title(page, "5 · Readiness a manager can see", "Competency evidence from scored cases, not completion percentages.");
  await signIn(page, "manager@rcmexcel.com");
  await go(page, "/team");
  await page.getByRole("heading", { name: "Competency evidence" }).scrollIntoViewIfNeeded();
  await caption(page, "The corporate manager sees which competencies each team member has demonstrated.", 3600);

  await title(page, "What is next", "Expert review of the seeded cases · more case types and work-queue simulations · ML retrieval with n8n · email and payment configuration.");
  await ctx.close();
  await saveVideo(page, "rcms-demo.webm");
});
