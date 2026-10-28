import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Rcms-dev-password-1";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

test("sign-up is refused without terms, before any account exists", async ({ request }) => {
  const res = await request.post("/api/auth/sign-up/email", { data: { name: "E2E", email: `e2e-${Date.now()}@example.test`, password: "long-enough-password" }, headers: { origin: process.env.E2E_BASE_URL ?? "http://localhost:3000" } });
  expect(res.status()).toBe(400);
});

test("learner journey: access granted by a subscriber admin, lesson completed, progress persists", async ({ browser }) => {
  // 1. A subscriber admin grants the learner complimentary access to the Foundation course.
  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  await signIn(admin, "subscribers@rcmexcel.com");
  await admin.goto("/admin/subscribers?q=student%40rcmexcel.com");
  await admin.locator('a[href^="/admin/subscribers/"]').first().click();
  await admin.waitForURL(/\/admin\/subscribers\/.+/);
  const grant = admin.locator("form", { has: admin.getByRole("button", { name: "Grant access" }) });
  if (await grant.locator("select[name=programId] option", { hasText: /Foundation/i }).count()) {
    await grant.locator("select[name=programId]").selectOption({ label: (await grant.locator("select[name=programId] option", { hasText: /Foundation/i }).first().innerText()).trim() });
    await grant.getByRole("button", { name: "Grant access" }).click();
    await expect(admin.getByText("Access granted.")).toBeVisible();
  }
  await adminCtx.close();

  // 2. The learner sees the course, opens the first lesson and completes it.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, "student@rcmexcel.com");
  await page.goto("/academy");
  await expect(page.locator('a[href^="/academy/foundation"]').first()).toBeVisible();
  await page.goto("/academy/foundation");
  // Wait for the exact lesson clicked: a looser pattern matches the current page before the
  // navigation finishes, and "Mark complete" would then be pressed on the wrong lesson.
  const first = page.locator('a[href^="/academy/foundation/"]').first();
  const href = (await first.getAttribute("href"))!.split(/[?#]/)[0];
  await first.click();
  await page.waitForURL((u) => u.pathname === href);
  const lessonUrl = page.url();
  const complete = page.getByRole("button", { name: /Mark complete|Mark as not done/ });
  await expect(complete).toBeVisible();
  if ((await complete.innerText()).includes("Mark complete")) {
    await complete.click();
    await expect(page.getByRole("button", { name: /Mark as not done/ })).toBeVisible();
  }
  // 3. Progress is stored on the server: a fresh load still shows it complete.
  await page.goto(lessonUrl);
  await expect(page.getByRole("button", { name: /Mark as not done/ })).toBeVisible();
  await ctx.close();
});

test("role boundaries hold in the browser", async ({ browser }) => {
  const learner = await (await browser.newContext()).newPage();
  await signIn(learner, "student@rcmexcel.com");
  await learner.goto("/admin");
  await expect(learner).toHaveURL(/\/account$/);
  await learner.goto("/vendor");
  await expect(learner).toHaveURL(/\/academy$/);
  expect((await learner.request.get("/api/exports/subscribers")).status()).toBe(403);

  const vendor = await (await browser.newContext()).newPage();
  await signIn(vendor, "vendor@rcmexcel.com");
  await vendor.goto("/academy");
  await expect(vendor).toHaveURL(/\/vendor$/);
  await vendor.goto("/admin/subscribers");
  await expect(vendor).not.toHaveURL(/\/admin/);

  const agent = await (await browser.newContext()).newPage();
  await signIn(agent, "agent@rcmexcel.com");
  // A support agent is staff but holds no finance permission: refused and sent to the dashboard.
  await agent.goto("/admin/finance");
  await expect(agent).toHaveURL(/\/admin\?denied=1$/);
  await expect(agent.getByText("Your roles do not include access to that page.", { exact: false })).toBeVisible();
});

test("certificate verification is public and does not leak unknown serials", async ({ page }) => {
  const res = await page.goto("/certificates/RCMS-L1-0000-0000-0000");
  expect(res?.status()).toBe(404);
  await expect(page.getByText(/could not be found/i).first()).toBeVisible();
});
