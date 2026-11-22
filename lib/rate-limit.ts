import { prisma } from "@/lib/db";

/**
 * A fixed-window limiter stored in the database (the same table Better Auth uses), so limits
 * hold across server instances and restarts. Keys are namespaced so they never collide with
 * Better Auth's own entries. Returns true when the request is allowed.
 *
 * Each step is one atomic statement rather than a read-then-write transaction: page readers
 * fire several requests at once (the page and the next one being warmed), and MariaDB's
 * snapshot isolation rejects concurrent transactions on the same row. A database failure
 * lets the request through (and is logged) rather than breaking the page.
 */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  if (process.env.AUTH_RATE_LIMIT === "off") return true;
  try {
    return await check(`app:${key}`, max, windowSeconds, true);
  } catch (e) {
    console.error("[rate-limit] check failed; allowing the request", e);
    return true;
  }
}

async function check(id: string, max: number, windowSeconds: number, retry: boolean): Promise<boolean> {
  const now = Date.now();
  const windowStart = BigInt(now - windowSeconds * 1000);
  // Inside the window and under the limit: count this request.
  const counted = await prisma.rateLimit.updateMany({ where: { key: id, lastRequest: { gt: windowStart }, count: { lt: max } }, data: { count: { increment: 1 } } });
  if (counted.count) return true;
  // The window has passed: start a new one with this request.
  const reset = await prisma.rateLimit.updateMany({ where: { key: id, lastRequest: { lte: windowStart } }, data: { count: 1, lastRequest: BigInt(now) } });
  if (reset.count) return true;
  // A row in the window that matched neither statement is at its limit.
  if (await prisma.rateLimit.findUnique({ where: { key: id }, select: { id: true } })) return false;
  try {
    await prisma.rateLimit.create({ data: { key: id, count: 1, lastRequest: BigInt(now) } });
    return true;
  } catch (e) {
    // Another request created the row first; count against it.
    if (retry && (e as { code?: string })?.code === "P2002") return check(id, max, windowSeconds, false);
    throw e;
  }
}

/** The client address as seen by the platform's proxy; "unknown" groups requests without one. */
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
