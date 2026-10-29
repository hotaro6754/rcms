import { describe, expect, it } from "vitest";
import { STAFF_ROLES } from "@/lib/permissions";
import { GRANTABLE_ROLES } from "../../scripts/grant-staff-role.mjs";

describe("scripts/grant-staff-role.mjs", () => {
  it("offers exactly the staff roles the app defines", () => {
    expect([...GRANTABLE_ROLES].sort()).toEqual([...STAFF_ROLES].sort());
  });
});
