import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests run anywhere. Integration tests run against a real MariaDB/MySQL database named by
 * TEST_DATABASE_URL (never DATABASE_URL, so a test run cannot touch a development or
 * production database by accident). Files run one at a time because they share it.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
