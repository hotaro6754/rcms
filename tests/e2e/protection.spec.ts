import { expect, test, type Page } from "@playwright/test";

/**
 * Course content protection as a learner meets it: no watermark is drawn over the lesson;
 * copying, right-click and the print shortcut do nothing inside it; printing shows a notice
 * instead. (View-only materials are covered by tests/integration/design.test.ts.)
 * Needs `npm run db:seed && npm run dev:accounts` (student@ is enrolled in the foundation course).
 */

const PASSWORD = "Rcms-dev-password-1";

async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

test("lessons carry no watermark and resist copying and printing", async ({ page }) => {
  await signIn(page, "student@rcmexcel.com");
  await page.goto("/academy/foundation");
  await page.locator('a[href^="/academy/foundation/"]').first().click();
  await page.waitForURL(/\/academy\/foundation\/[^/#?]+$/);

  const protectedArea = page.locator(".protected-content");
  await expect(protectedArea).toHaveCount(1);
  // No watermark: nothing in the protected area carries the learner's details.
  expect(await protectedArea.evaluate((el) => el.outerHTML.includes("student@rcmexcel.com"))).toBe(false);
  await expect(protectedArea.locator("[style*='svg']")).toHaveCount(0);

  // Right-click, copy and the print shortcut are cancelled inside the lesson.
  const prevented = await protectedArea.evaluate((el) => {
    const fire = (type: string, init: EventInit = {}) => {
      const e = type === "keydown" ? new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true, cancelable: true }) : new Event(type, { bubbles: true, cancelable: true, ...init });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    };
    return { contextmenu: fire("contextmenu"), copy: fire("copy"), print: fire("keydown") };
  });
  expect(prevented).toEqual({ contextmenu: true, copy: true, print: true });

  // Printing shows the notice, not the lesson.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByText("Course content cannot be printed")).toBeVisible();
  await page.emulateMedia({ media: "screen" });
});
