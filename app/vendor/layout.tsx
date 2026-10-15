import { redirect } from "next/navigation";
import { getActor, BLOCKED_STATUSES, isStaff } from "@/lib/actor";
import { PlatformShell } from "@/components/platform/PlatformShell";

export const metadata = { title: { default: "Vendor portal", template: "%s · Vendor portal" } };

const NAV = [
  { href: "/vendor", label: "Overview", exact: true },
  { href: "/vendor/invoices", label: "Invoices" },
  { href: "/vendor/profile", label: "Profile" },
];

/**
 * The vendor portal is its own environment. It shows one vendor's deliverables, invoices,
 * documents and profile and nothing else: no subscribers, no other vendors, no platform
 * revenue, no admin settings. Every query below is scoped by the services to the vendors
 * the signed-in contact belongs to; this layout only decides who may open it.
 */
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/sign-in?next=/vendor");
  if (!actor.emailVerified || BLOCKED_STATUSES.includes(actor.status)) redirect("/account");
  if (actor.vendorIds.length === 0) redirect(isStaff(actor) ? "/admin" : "/academy");
  return (
    <PlatformShell
      area="Vendor portal"
      home="/vendor"
      nav={NAV}
      switcher={isStaff(actor) ? [{ href: "/admin", label: "Admin" }] : []}
      user={{ name: actor.name, role: "Vendor contact" }}
    >
      {children}
    </PlatformShell>
  );
}
