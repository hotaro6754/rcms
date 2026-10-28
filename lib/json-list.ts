import type { Prisma } from "@prisma/client";

/**
 * List fields (outcomes, tags, roles and so on) are stored as JSON arrays, because MySQL and
 * MariaDB have no list column type. These read them back as plain arrays, ignoring anything
 * that is not a string (or number), so a malformed value never breaks a page.
 */
export function strings(v: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function numbers(v: Prisma.JsonValue | null | undefined): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : [];
}
