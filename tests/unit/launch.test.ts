import { afterEach, describe, expect, it } from "vitest";
import { allowCliAccountCreation, cliAccountCreationAllowed, comingSoon, isPreviewLearner, openDuringLockdown } from "@/lib/launch";

describe("pre-launch lockdown", () => {
  const saved = process.env.SITE_MODE;
  afterEach(() => {
    process.env.SITE_MODE = saved;
  });

  it("is on unless SITE_MODE=live", () => {
    delete process.env.SITE_MODE;
    expect(comingSoon()).toBe(true);
    process.env.SITE_MODE = "preview";
    expect(comingSoon()).toBe(true);
    process.env.SITE_MODE = "live";
    expect(comingSoon()).toBe(false);
  });

  it("keeps only staff sign-in, the admin and static assets reachable", () => {
    for (const open of ["/coming-soon", "/sign-in", "/two-factor", "/admin", "/admin/content/courses/x", "/account/security", "/brand/rcmexcel-logo.png", "/fonts/satoshi-400.woff2"]) {
      expect(openDuringLockdown(open), open).toBe(true);
    }
    for (const closed of ["/", "/catalog", "/academy", "/academy/foundation/l1", "/sign-up", "/account", "/legal/terms", "/certificates/ABC", "/vendor", "/administrator", "/adminx", "/brand"]) {
      expect(openDuringLockdown(closed), closed).toBe(false);
    }
  });

  it("opens the learner area only for listed preview learners", () => {
    const before = process.env.LOCKDOWN_PREVIEW_EMAILS;
    delete process.env.LOCKDOWN_PREVIEW_EMAILS;
    expect(isPreviewLearner("test.student@rcmexcel.test")).toBe(false);
    expect(openDuringLockdown("/academy")).toBe(false);
    process.env.LOCKDOWN_PREVIEW_EMAILS = " Test.Student@rcmexcel.test , other@example.com";
    expect(isPreviewLearner("test.student@rcmexcel.test")).toBe(true);
    expect(isPreviewLearner("someone@example.com")).toBe(false);
    expect(isPreviewLearner(null)).toBe(false);
    for (const open of ["/academy", "/academy/foundation/l1", "/library", "/certificates", "/support/new", "/account"]) expect(openDuringLockdown(open), open).toBe(true);
    for (const closed of ["/", "/catalog", "/certificates/ABC", "/academyx", "/pricing", "/vendor"]) expect(openDuringLockdown(closed), closed).toBe(false);
    if (before === undefined) delete process.env.LOCKDOWN_PREVIEW_EMAILS;
    else process.env.LOCKDOWN_PREVIEW_EMAILS = before;
  });

  it("allows account creation only from a server script that asks for it", () => {
    expect(cliAccountCreationAllowed()).toBe(false);
    allowCliAccountCreation();
    expect(cliAccountCreationAllowed()).toBe(true);
    delete (globalThis as Record<symbol, unknown>)[Symbol.for("rcms.cliAccountCreation")];
  });
});
