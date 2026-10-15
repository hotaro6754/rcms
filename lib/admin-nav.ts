import type { Permission } from "./permissions";

/**
 * The Admin Control Center's navigation (blueprint §2), with the permissions that make each
 * entry visible. Visibility is convenience only: every page and action checks again.
 */

export interface AdminLink {
  href: string;
  label: string;
  any: Permission[];
}

export interface AdminGroup extends AdminLink {
  links: AdminLink[];
}

export const ADMIN_NAV: AdminGroup[] = [
  { href: "/admin", label: "Dashboard", any: [], links: [] },
  {
    href: "/admin/content",
    label: "Learning",
    any: ["content.view", "assessment.grade", "labs.grade", "certificate.issue"],
    links: [
      { href: "/admin/content", label: "Levels and courses", any: ["content.view"] },
      { href: "/admin/content/review", label: "Review queue", any: ["content.view"] },
      { href: "/admin/content/banks", label: "Question banks", any: ["assessment.manage", "content.view"] },
      { href: "/admin/content/media", label: "Media library", any: ["media.manage", "content.view"] },
      { href: "/admin/grading", label: "Grading", any: ["assessment.grade", "labs.grade"] },
      { href: "/admin/certificates", label: "Certificates", any: ["certificate.issue", "certificate.revoke"] },
    ],
  },
  {
    href: "/admin/subscribers",
    label: "Subscribers",
    any: ["subscriber.view", "org.manage", "lead.manage"],
    links: [
      { href: "/admin/subscribers", label: "Directory", any: ["subscriber.view"] },
      { href: "/admin/organisations", label: "Corporate accounts", any: ["org.manage"] },
      { href: "/admin/privacy", label: "Privacy requests", any: ["subscriber.privacy"] },
      { href: "/admin/leads", label: "Leads", any: ["lead.manage"] },
    ],
  },
  {
    href: "/admin/support",
    label: "Support",
    any: ["support.view_assigned", "support.view_all"],
    links: [
      { href: "/admin/support", label: "Queue", any: ["support.view_assigned", "support.view_all"] },
      { href: "/admin/support/templates", label: "Approved responses", any: ["support.respond", "support.templates.manage"] },
    ],
  },
  {
    href: "/admin/vendors",
    label: "Vendors",
    any: ["vendor.view"],
    links: [{ href: "/admin/vendors", label: "Directory", any: ["vendor.view"] }],
  },
  {
    href: "/admin/finance",
    label: "Finance",
    any: ["finance.view"],
    links: [
      { href: "/admin/finance", label: "Orders and payments", any: ["finance.view"] },
      { href: "/admin/finance/products", label: "Plans and pricing", any: ["finance.view"] },
      { href: "/admin/finance/refunds", label: "Refunds", any: ["finance.view"] },
      { href: "/admin/finance/coupons", label: "Coupons", any: ["finance.view"] },
      { href: "/admin/finance/settlements", label: "Vendor settlements", any: ["finance.view", "settlement.approve"] },
    ],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    any: ["reports.view"],
    links: [],
  },
  {
    href: "/admin/users",
    label: "Administration",
    any: ["users.view", "approvals.view", "audit.view", "settings.view", "roles.request"],
    links: [
      { href: "/admin/users", label: "Users and roles", any: ["users.view", "roles.request"] },
      { href: "/admin/approvals", label: "Approvals", any: ["approvals.view", "roles.approve", "price.approve", "settings.approve", "subscriber.privacy", "vendor.payout.approve"] },
      { href: "/admin/audit", label: "Audit log", any: ["audit.view"] },
      { href: "/admin/settings", label: "Settings and integrations", any: ["settings.view"] },
    ],
  },
];

export function visibleNav(perms: ReadonlySet<Permission>) {
  const ok = (l: AdminLink) => l.any.length === 0 || l.any.some((p) => perms.has(p));
  return ADMIN_NAV.filter(ok).map((g) => ({ ...g, links: g.links.filter(ok) }));
}

export function groupFor(path: string) {
  return [...ADMIN_NAV].sort((a, b) => b.href.length - a.href.length).find((g) => g.href !== "/admin" && (path === g.href || path.startsWith(g.href + "/") || g.links.some((l) => path === l.href || path.startsWith(l.href + "/"))));
}
