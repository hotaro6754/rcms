import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("upload folder", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses STORAGE_DIR when it is set, so uploads survive a host replacing the app folder", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rcms-storage-"));
    vi.stubEnv("STORAGE_DIR", dir);
    vi.resetModules();
    const { saveBuffer, readStored } = await import("@/lib/storage");
    const key = await saveBuffer("media", new TextEncoder().encode("hello"), "note.txt");
    expect(existsSync(join(dir, key))).toBe(true);
    expect((await readStored(key)).toString()).toBe("hello");
  });
});
