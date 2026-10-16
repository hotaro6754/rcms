import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * Records the product walkthrough video (not a test suite). Needs a running app with
 * `npm run db:seed && npm run dev:accounts`. Run: `npm run demo:record`.
 */
export default defineConfig({
  testDir: ".",
  testMatch: process.env.DEMO_ADMIN ? "record-admin-demo.spec.ts" : "record-demo.spec.ts",
  outputDir: path.join(os.tmpdir(), "rcms-demo"),
  timeout: 20 * 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", actionTimeout: 30_000, navigationTimeout: 90_000 },
});
