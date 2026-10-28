import fs from "node:fs";
import path from "node:path";
import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Shared helpers for the recorded walkthroughs. */

export const OUT = process.env.DEMO_OUT ?? path.resolve("demo-output");

/** Keeps the development server's overlay button out of frame; it is not part of the product. */
export async function hideDevOverlay(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    const hide = () => {
      const s = document.createElement("style");
      s.textContent = "nextjs-portal{display:none!important}";
      document.head.appendChild(s);
    };
    if (document.head) hide();
    else document.addEventListener("DOMContentLoaded", hide);
  });
}

export async function saveVideo(page: Page, name: string) {
  const video = await page.video()!.path();
  fs.mkdirSync(OUT, { recursive: true });
  fs.renameSync(video, path.join(OUT, name));
}

export const PASSWORD = "Rcms-dev-password-1";

export const pause = (page: Page, ms = 1800) => page.waitForTimeout(ms);

export async function caption(page: Page, text: string, ms = 2600) {
  await page.evaluate((t) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      Object.assign(el.style, {
        position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)", zIndex: "2147483647",
        maxWidth: "980px", padding: "14px 22px", borderRadius: "10px", background: "rgba(22,21,19,0.92)",
        color: "#fff", font: "500 20px/1.4 system-ui, sans-serif", textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,.35)",
        pointerEvents: "none",
      });
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
  await pause(page, ms);
  // Captions belong to the moment they describe; remove them before the next step.
  await page.evaluate(() => document.getElementById("demo-caption")?.remove()).catch(() => {});
}

export async function title(page: Page, heading: string, sub: string) {
  await page.setContent(`<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#161513;color:#f4efe6;font-family:Georgia,serif">
    <div style="text-align:center;max-width:900px;padding:24px"><div style="font:600 14px/1 system-ui;letter-spacing:.2em;color:#b9b2a7">RCMEXCEL</div>
    <h1 style="font-size:52px;line-height:1.1;margin:24px 0 16px">${heading}</h1><p style="font:400 22px/1.5 system-ui;color:#d9d2c6">${sub}</p></div></body></html>`);
  await pause(page, 3500);
}

export async function go(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.locator(".preloader").waitFor({ state: "hidden", timeout: 8000 }).catch(() => {});
}

export async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await go(page, "/sign-in");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
}

export async function scrollBy(page: Page, total: number, steps = 8) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, total / steps);
    await page.waitForTimeout(220);
  }
}

export async function ask(page: Page, q: string) {
  const items = page.locator('ol[aria-label="Conversation"] > li');
  const before = (await items.locator("text=You:").count()) ? await items.count() : 0;
  await page.getByLabel("Your question").pressSequentially(q, { delay: 25 });
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(items).toHaveCount(before + 2);
  await items.last().scrollIntoViewIfNeeded();
  return items.last();
}
