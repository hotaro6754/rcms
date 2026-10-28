import { prisma } from "./db";

/**
 * The audit trail.
 *
 * Every mutation records who did what to which entity, the outcome, and a before/after diff
 * where it makes sense. Refused access is recorded too ("deny"). The table is append-only:
 * a database trigger (migration 0003) rejects UPDATE and DELETE, so the trail cannot be
 * edited through the application or by anyone sharing its database role.
 *
 * Rule: never put a secret, a password hash, a full card number, a session or a gateway
 * token in the diff. `redact` strips the obvious keys and masks card-like numbers; anything
 * sensitive and non-obvious is the caller's responsibility.
 */

const SENSITIVE = new Set([
  "password",
  "passwordhash",
  "newpassword",
  "currentpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "secret",
  "apikey",
  "signature",
  "rawpayload",
  "backupcodes",
  "totpuri",
  "cardnumber",
  "cvv",
  "accountnumber",
  "taxid",
]);

const CARD_LIKE = /\b(?:\d[ -]?){13,19}\b/g;

export function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.replace(CARD_LIKE, "[number removed]");
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.has(k.toLowerCase()) ? "[redacted]" : redact(v);
  }
  return out;
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "login_failed"
  | "logout"
  | "lockout"
  | "mfa_failed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "password_change"
  | "password_reset"
  | "enrol"
  | "purchase"
  | "payment"
  | "refund"
  | "grade"
  | "publish"
  | "unpublish"
  | "submit"
  | "approve"
  | "reject"
  | "schedule"
  | "archive"
  | "restore"
  | "rollback"
  | "move"
  | "duplicate"
  | "assign"
  | "issue"
  | "revoke"
  | "suspend"
  | "reactivate"
  | "download"
  | "export"
  | "deny"
  | "request"
  | "escalate"
  | "reconcile"
  | "webhook";

export interface AuditInput {
  actorId?: string | null;
  actorRoles?: string[];
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  outcome?: "success" | "failure" | "denied";
  correlationId?: string | null;
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
        actorRoles: input.actorRoles ?? [],
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        diff: diff as never,
        outcome: input.outcome ?? "success",
        correlationId: input.correlationId ?? null,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 400) ?? null,
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
export async function withAudit<T>(meta: Omit<AuditInput, "after">, mutate: () => Promise<T>): Promise<T> {
  const result = await mutate();
  await audit({ ...meta, after: result });
  return result;
}
