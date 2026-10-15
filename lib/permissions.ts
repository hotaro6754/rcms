/**
 * Action-level permissions and the blueprint's staff roles (§3.2–3.3).
 *
 * The matrix lives in code, not in a settings table, on purpose: a change to who may
 * publish or refund is a change to the platform's controls, and it should be reviewed,
 * tested and deployed like any other change. People are given authority by being granted
 * a role (with maker-checker approval), never by editing this file at runtime.
 *
 * Pure module: no database, no request. Safe to import from client components for
 * presentation (hiding a button), which is never the security boundary — the server
 * checks again through lib/actor.ts and every service.
 */

export const PERMISSIONS = [
  // Learning content
  "content.view",
  "content.create",
  "content.edit",
  "content.structure",
  "content.delete",
  "content.archive",
  "content.submit",
  "content.review.academic",
  "content.review.compliance",
  "content.publish",
  "content.export",
  "content.import",
  "media.manage",
  "assessment.manage",
  "assessment.grade",
  "labs.grade",
  // Subscribers
  "subscriber.view",
  "subscriber.view_sensitive",
  "subscriber.edit",
  "subscriber.suspend",
  "subscriber.enrol",
  "subscriber.notes",
  "subscriber.export",
  "subscriber.privacy",
  "subscriber.progress_reset",
  "certificate.issue",
  "certificate.revoke",
  "org.manage",
  "lead.manage",
  // Support
  "support.view_assigned",
  "support.view_all",
  "support.respond",
  "support.assign",
  "support.escalate",
  "support.templates.manage",
  "support.templates.approve",
  "support.configure",
  // Finance
  "finance.view",
  "product.manage",
  "price.request",
  "price.approve",
  "refund.request",
  "refund.approve",
  "refund.approve_exceptional",
  "payment.reconcile",
  "coupon.manage",
  // Vendors
  "vendor.view",
  "vendor.manage",
  "vendor.approve",
  "vendor.view_financial",
  "vendor.payout.request",
  "vendor.payout.approve",
  "settlement.validate",
  "settlement.approve",
  "settlement.pay",
  // Reporting and administration
  "reports.view",
  "reports.export",
  "users.view",
  "roles.request",
  "roles.approve",
  "audit.view",
  "approvals.view",
  "settings.view",
  "settings.request",
  "settings.approve",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const STAFF_ROLES = [
  "SUPER_ADMIN",
  "ACADEMY_DIRECTOR",
  "CONTENT_ADMIN",
  "ACADEMIC_REVIEWER",
  "COMPLIANCE_REVIEWER",
  "SUBSCRIBER_ADMIN",
  "SUPPORT_AGENT",
  "SUPPORT_MANAGER",
  "FINANCE_ADMIN",
  "VENDOR_MANAGER",
  "REPORTING_ANALYST",
  "AUDITOR",
] as const;

export type StaffRoleName = (typeof STAFF_ROLES)[number];

export const ROLE_LABEL: Record<StaffRoleName, string> = {
  SUPER_ADMIN: "Super Administrator",
  ACADEMY_DIRECTOR: "Academy Director",
  CONTENT_ADMIN: "Content Administrator",
  ACADEMIC_REVIEWER: "Academic Reviewer",
  COMPLIANCE_REVIEWER: "Compliance Reviewer",
  SUBSCRIBER_ADMIN: "Subscriber Administrator",
  SUPPORT_AGENT: "Support Agent",
  SUPPORT_MANAGER: "Support Manager",
  FINANCE_ADMIN: "Finance Administrator",
  VENDOR_MANAGER: "Vendor Manager",
  REPORTING_ANALYST: "Reporting Analyst",
  AUDITOR: "Auditor",
};

export const ROLE_AUTHORITY: Record<StaffRoleName, string> = {
  SUPER_ADMIN: "Full platform configuration and emergency administration",
  ACADEMY_DIRECTOR: "Curriculum, commercial performance, dashboards and approvals",
  CONTENT_ADMIN: "Create and edit courses, modules, lessons and resources",
  ACADEMIC_REVIEWER: "Review and approve educational content and assessments",
  COMPLIANCE_REVIEWER: "Review disclaimers, privacy, coding, payer and compliance-sensitive content",
  SUBSCRIBER_ADMIN: "Manage accounts, enrolments, access and certificates",
  SUPPORT_AGENT: "Manage assigned conversations and subscriber support requests",
  SUPPORT_MANAGER: "Manage queues, escalations, quality reviews and support reporting",
  FINANCE_ADMIN: "Manage payments, invoices, refunds and reconciliation",
  VENDOR_MANAGER: "Onboard vendors, manage contracts, deliverables and performance",
  REPORTING_ANALYST: "View approved reports and export non-restricted information",
  AUDITOR: "Read-only access to records, approvals and audit trails",
};

const ALL = new Set<Permission>(PERMISSIONS);

const CONTENT_READ: Permission[] = ["content.view"];

export const ROLE_PERMISSIONS: Record<StaffRoleName, ReadonlySet<Permission>> = {
  SUPER_ADMIN: ALL,

  ACADEMY_DIRECTOR: new Set<Permission>([
    "content.view", "content.create", "content.edit", "content.structure", "content.delete",
    "content.archive", "content.submit", "content.publish", "content.export", "content.import",
    "media.manage", "assessment.manage", "assessment.grade", "labs.grade",
    "subscriber.view", "subscriber.enrol", "certificate.issue", "certificate.revoke", "org.manage",
    "lead.manage", "support.view_all", "finance.view", "price.approve", "refund.approve",
    "refund.approve_exceptional", "vendor.view", "settlement.approve", "reports.view",
    "reports.export", "users.view", "roles.request", "roles.approve", "audit.view",
    "approvals.view", "settings.view", "settings.request",
  ]),

  CONTENT_ADMIN: new Set<Permission>([
    "content.view", "content.create", "content.edit", "content.structure", "content.delete",
    "content.archive", "content.submit", "content.export", "content.import", "media.manage",
    "assessment.manage",
  ]),

  ACADEMIC_REVIEWER: new Set<Permission>([
    ...CONTENT_READ, "content.review.academic", "assessment.grade", "labs.grade",
  ]),

  COMPLIANCE_REVIEWER: new Set<Permission>([...CONTENT_READ, "content.review.compliance"]),

  SUBSCRIBER_ADMIN: new Set<Permission>([
    "subscriber.view", "subscriber.view_sensitive", "subscriber.edit", "subscriber.suspend",
    "subscriber.enrol", "subscriber.notes", "subscriber.export", "subscriber.privacy",
    "subscriber.progress_reset", "certificate.issue", "certificate.revoke", "org.manage",
    "support.view_all", "lead.manage",
  ]),

  SUPPORT_AGENT: new Set<Permission>([
    "support.view_assigned", "support.respond", "support.escalate", "subscriber.view",
  ]),

  SUPPORT_MANAGER: new Set<Permission>([
    "support.view_assigned", "support.view_all", "support.respond", "support.assign",
    "support.escalate", "support.templates.manage", "support.templates.approve",
    "support.configure", "subscriber.view", "reports.view",
  ]),

  FINANCE_ADMIN: new Set<Permission>([
    "finance.view", "product.manage", "price.request", "refund.request", "refund.approve",
    "payment.reconcile", "coupon.manage", "vendor.view", "vendor.view_financial",
    "vendor.payout.approve", "settlement.validate", "settlement.pay", "subscriber.view",
    "reports.view",
  ]),

  VENDOR_MANAGER: new Set<Permission>([
    "vendor.view", "vendor.manage", "vendor.approve", "vendor.payout.request", "content.view",
  ]),

  REPORTING_ANALYST: new Set<Permission>(["reports.view", "reports.export"]),

  AUDITOR: new Set<Permission>([
    "audit.view", "approvals.view", "content.view", "subscriber.view", "finance.view",
    "vendor.view", "support.view_all", "reports.view", "users.view", "settings.view",
  ]),
};

/**
 * The legacy account roles each imply a staff role, so existing owners, admins and trainers
 * keep working without a data migration. Explicit grants add to these, never subtract.
 */
export const LEGACY_IMPLIED: Record<string, StaffRoleName[]> = {
  OWNER: ["SUPER_ADMIN"],
  ADMIN: ["ACADEMY_DIRECTOR", "SUBSCRIBER_ADMIN"],
  TRAINER: ["CONTENT_ADMIN"],
};

/** Extra permissions a legacy role carries that its implied staff role does not. */
const LEGACY_EXTRA: Record<string, Permission[]> = {
  TRAINER: ["labs.grade", "assessment.grade"],
};

export function effectiveRoles(legacyRole: string, granted: readonly string[]): StaffRoleName[] {
  const out = new Set<StaffRoleName>(LEGACY_IMPLIED[legacyRole] ?? []);
  for (const r of granted) if ((STAFF_ROLES as readonly string[]).includes(r)) out.add(r as StaffRoleName);
  return STAFF_ROLES.filter((r) => out.has(r));
}

export function permissionsFor(legacyRole: string, granted: readonly string[]): Set<Permission> {
  const out = new Set<Permission>(LEGACY_EXTRA[legacyRole] ?? []);
  for (const r of effectiveRoles(legacyRole, granted)) for (const p of ROLE_PERMISSIONS[r]) out.add(p);
  return out;
}

/** Roles that may approve granting or removing a staff role (blueprint §13). */
export const ROLE_APPROVERS: StaffRoleName[] = ["SUPER_ADMIN", "ACADEMY_DIRECTOR"];

/** Only a Super Administrator may grant Super Administrator. */
export function canRequestRole(requesterRoles: readonly StaffRoleName[], role: StaffRoleName) {
  if (role === "SUPER_ADMIN") return requesterRoles.includes("SUPER_ADMIN");
  return true;
}
