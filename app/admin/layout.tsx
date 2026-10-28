import { redirect } from "next/navigation";
import { NOINDEX } from "@/lib/seo";
import { getActor, isStaff, mfaRequired, BLOCKED_STATUSES } from "@/lib/actor";
import { visibleNav } from "@/lib/admin-nav";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { AdminSubNav } from "@/components/admin/AdminSubNav";
import { ROLE_LABEL } from "@/lib/permissions";

export const metadata = { ...NOINDEX, title: { default: "Admin Control Center", template: "%s · Admin" } };

/**
 * The Admin Control Center shell. Any staff role opens it; what each person sees inside is
 * filtered by their permissions, and every page and action checks again on the server,
 * because a layout guard alone is not a security boundary.
 *
 * Staff must have multi-factor authentication when ADMIN_MFA_REQUIRED is on (the default in
 * production); until they do, they are sent to set it up.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?next=/admin");
  if (!actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) redirect("/account");
  if (!isStaff(actor)) redirect("/account");
  if (mfaRequired() && !actor.twoFactorEnabled) redirect("/account/security?required=admin");

  const nav = visibleNav(actor.permissions);
  return (
    <PlatformShell
      area="Admin"
      home="/admin"
      nav={nav.map((g) => ({ href: g.href, label: g.label, exact: g.href === "/admin" }))}
      switcher={[
        { href: "/academy", label: "Academy" },
        ...(actor.vendorIds.length ? [{ href: "/vendor", label: "Vendor portal" }] : []),
      ]}
      user={{ name: actor.name, role: actor.staffRoles.map((r) => ROLE_LABEL[r]).join(", ") || actor.role }}
    >
      <div className="mx-auto max-w-[1320px] px-6 pt-6">
        <AdminSubNav groups={nav} />
      </div>
      {children}
    </PlatformShell>
  );
}
