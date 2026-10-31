import type { Permission } from "./permissions";

/**
 * The Admin Control Center's navigation (blueprint §2), with the permissions that make each
 * entry visible. Visibility is convenience only: every page and action checks again.
 *
 * Entries are grouped into sidebar sections. A group with two or more visible links opens
 * into its pages; a group with one link (or none) is a plain link.
 */

export interface AdminLink {
  href: string;
  label: string;
  any: Permission[];
}

export interface AdminGroup extends AdminLink {
  /** Sidebar section heading this group sits under. */
  section: string;
  /** Icon name, mapped to an icon in the sidebar (components/admin/AdminSidebar.tsx). */
  icon: string;
  links: AdminLink[];
}

export const ADMIN_NAV: AdminGroup[] = [
  { section: "Overview", icon: "dashboard", href: "/admin", label: "Dashboard", any: [], links: [] },
  { section: "Overview", icon: "copilot", href: "/admin/copilot", label: "Copilot", any: [], links: [] },
  {
    section: "Website",
    icon: "website",
    href: "/admin/site",
    label: "Website",
    any: ["site.edit"],
    links: [
      { href: "/admin/site", label: "Pages", any: ["site.edit"] },
      { href: "/admin/site/site", label: "Navigation and footer", any: ["site.edit"] },
      { href: "/admin/site/theme", label: "Colours, fonts and sizes", any: ["site.edit"] },
    ],
  },
  {
    section: "Learning",
    icon: "courses",
    href: "/admin/content",
    label: "Courses and content",
    any: ["content.view", "media.manage"],
    links: [
      { href: "/admin/content", label: "Levels, courses and modules", any: ["content.view"] },
      { href: "/admin/content/review", label: "Review queue", any: ["content.view"] },
      { href: "/admin/content/library", label: "Library", any: ["content.view"] },
      { href: "/admin/cases", label: "Case simulations", any: ["content.view"] },
      { href: "/admin/content/media", label: "Media library", any: ["media.manage", "content.view"] },
    ],
  },
  {
    section: "Learning",
    icon: "assessment",
    href: "/admin/content/banks",
    label: "Assessment",
    any: ["assessment.manage", "assessment.grade", "labs.grade", "certificate.issue", "certificate.revoke", "content.view"],
    links: [
      { href: "/admin/content/banks", label: "Question banks", any: ["assessment.manage", "content.view"] },
      { href: "/admin/competencies", label: "Competencies", any: ["content.view", "assessment.manage"] },
      { href: "/admin/grading", label: "Grading", any: ["assessment.grade", "labs.grade"] },
      { href: "/admin/certificates", label: "Certificates", any: ["certificate.issue", "certificate.revoke"] },
    ],
  },
  {
    section: "People",
    icon: "subscribers",
    href: "/admin/subscribers",
    label: "Subscribers",
    any: ["subscriber.view", "org.manage", "lead.manage", "subscriber.privacy"],
    links: [
      { href: "/admin/subscribers", label: "Directory", any: ["subscriber.view"] },
      { href: "/admin/organisations", label: "Corporate accounts", any: ["org.manage"] },
      { href: "/admin/leads", label: "Leads", any: ["lead.manage"] },
      { href: "/admin/privacy", label: "Privacy requests", any: ["subscriber.privacy"] },
    ],
  },
  {
    section: "People",
    icon: "support",
    href: "/admin/support",
    label: "Support",
    any: ["support.view_assigned", "support.view_all"],
    links: [
      { href: "/admin/support", label: "Queue", any: ["support.view_assigned", "support.view_all"] },
      { href: "/admin/support/templates", label: "Approved responses", any: ["support.respond", "support.templates.manage"] },
      { href: "/admin/support/settings", label: "Teams, routing and SLA", any: ["support.configure", "support.view_all"] },
    ],
  },
  {
    section: "Business",
    icon: "finance",
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
  { section: "Business", icon: "vendors", href: "/admin/vendors", label: "Vendors", any: ["vendor.view"], links: [] },
  { section: "Business", icon: "reports", href: "/admin/reports", label: "Reports", any: ["reports.view"], links: [] },
  {
    section: "System",
    icon: "admin",
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
  return ADMIN_NAV.filter(ok)
    .map((g) => ({ ...g, links: g.links.filter(ok) }))
    .map((g) => (g.links.length === 1 ? { ...g, href: g.links[0].href } : g));
}

/** The visible groups, in order, under their section headings. */
export function navSections(perms: ReadonlySet<Permission>) {
  const sections: { label: string; groups: ReturnType<typeof visibleNav> }[] = [];
  for (const g of visibleNav(perms)) {
    const s = sections.find((x) => x.label === g.section);
    if (s) s.groups.push(g);
    else sections.push({ label: g.section, groups: [g] });
  }
  return sections;
}

export function groupFor(path: string) {
  return [...ADMIN_NAV].sort((a, b) => b.href.length - a.href.length).find((g) => g.href !== "/admin" && (path === g.href || path.startsWith(g.href + "/") || g.links.some((l) => path === l.href || path.startsWith(l.href + "/"))));
}
