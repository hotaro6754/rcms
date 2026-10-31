import Link from "next/link";
import { redirect } from "next/navigation";
import { NOINDEX } from "@/lib/seo";
import { getActor, isStaff, mfaRequired, BLOCKED_STATUSES } from "@/lib/actor";
import { navSections } from "@/lib/admin-nav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Wordmark } from "@/components/brand/Wordmark";
import { ROLE_LABEL } from "@/lib/permissions";
import { BRAND } from "@/lib/brand";

export const metadata = { ...NOINDEX, title: { default: "Admin Control Center", template: "%s · Admin" } };

/**
 * The Admin Control Center shell: a left sidebar of sections and their pages, and the page.
 * Any staff role opens it; what each person sees inside is filtered by their permissions, and
 * every page and action checks again on the server, because a layout guard alone is not a
 * security boundary.
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

  const sections = navSections(actor.permissions).map((s) => ({
    label: s.label,
    groups: s.groups.map((g) => ({ href: g.href, label: g.label, icon: g.icon, links: g.links.map((l) => ({ href: l.href, label: l.label })) })),
  }));
  const role = actor.staffRoles.map((r) => ROLE_LABEL[r]).join(", ");

  return (
    <div className="editorial flex min-h-dvh flex-col bg-background lg:flex-row">
      <AdminSidebar
        sections={sections}
        footer={
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{actor.name}</p>
              <p className="text-data truncate text-[10.5px] text-subtle">{role}</p>
            </div>
            <SignOutButton />
          </div>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border px-6 lg:flex">
          <Link href="/" className="flex items-baseline" aria-label={`${BRAND.name}, public site`}>
            <Wordmark />
          </Link>
          {actor.vendorIds.length > 0 && (
            <Link href="/vendor" className="text-data text-[11px] tracking-[0.1em] text-subtle hover:text-foreground">
              VENDOR PORTAL
            </Link>
          )}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
