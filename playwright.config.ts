import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests against a running app with seeded development data:
 *   npm run db:seed && npm run dev:accounts && npm run dev   (in another terminal)
 *   npm run test:e2e
 * They drive real pages, server actions and the database; nothing is mocked. Point
 * E2E_BASE_URL at another local server if needed. Never point them at production.
 */
export default defineConfig({
  testDir: "tests/e2e",
  // Outside the project: the dev server watches the project tree and would rebuild on every
  // trace or screenshot written into it.
  outputDir: path.join(os.tmpdir(), "rcms-playwright"),
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
});
