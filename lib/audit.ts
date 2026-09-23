import { prisma } from "./db";

/**
 * Audit is a Phase 0 decision, not a Phase 8 one.
 *
 * Every mutation in the platform records who did what to which entity, with a before/after
 * diff where it makes sense. Retrofitting this later means reconstructing history you no
 * longer have, so it goes in before the first write path exists.
 *
 * Rule: never put a secret, a password hash, a full card number or a gateway token in the
 * diff. `redact` strips the obvious ones; anything sensitive and non-obvious is the
 * caller's responsibility.
 */

const SENSITIVE = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "secret",
  "apiKey",
  "signature",
  "rawPayload",
]);

function redact(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.has(k) ? "[redacted]" : redact(v);
  }
  return out;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "enrol"
  | "purchase"
  | "refund"
  | "grade"
  | "publish"
  | "assign";

export interface AuditInput {
  actorId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Writes one audit row. Deliberately never throws: a failed audit write must not roll back
 * the business operation that succeeded. It logs loudly instead, and a missing audit row is
 * an alerting concern rather than a user-facing failure.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const diff =
      input.before === undefined && input.after === undefined
        ? undefined
        : { before: redact(input.before), after: redact(input.after) };

    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        diff: diff as never,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write audit row", {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      error,
    });
  }
}

/**
 * Wraps a mutation so the audit row is written from the same call site as the change,
 * which is the only reliable way to keep the two in step.
 */
export async function withAudit<T>(
  meta: Omit<AuditInput, "after">,
  mutate: () => Promise<T>,
): Promise<T> {
  const result = await mutate();
  await audit({ ...meta, after: result });
  return result;
}
