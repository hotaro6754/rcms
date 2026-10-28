import { prisma } from "@/lib/db";

/**
 * A fixed-window limiter stored in the database (the same table Better Auth uses), so limits
 * hold across server instances and restarts. Keys are namespaced so they never collide with
 * Better Auth's own entries. Returns true when the request is allowed.
 */
export async function allow(key: string, max: number, windowSeconds: number) {
  if (process.env.AUTH_RATE_LIMIT === "off") return true;
  const now = Date.now();
  const id = `app:${key}`;
  return prisma.$transaction(async (tx) => {
    const row = await tx.rateLimit.findUnique({ where: { key: id } });
    if (!row || now - Number(row.lastRequest) > windowSeconds * 1000) {
      await tx.rateLimit.upsert({ where: { key: id }, create: { key: id, count: 1, lastRequest: BigInt(now) }, update: { count: 1, lastRequest: BigInt(now) } });
      return true;
    }
    if (row.count >= max) return false;
    await tx.rateLimit.update({ where: { key: id }, data: { count: { increment: 1 } } });
    return true;
  });
}

/** The client address as seen by the platform's proxy; "unknown" groups requests without one. */
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
