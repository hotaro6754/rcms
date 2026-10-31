import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActor, isStaff } from "@/lib/actor";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { ROLE_LABEL } from "@/lib/permissions";
import { NOINDEX } from "@/lib/seo";

/** Signed-in and sign-in pages are kept out of search engines. */
export const metadata = NOINDEX;

const NAV = [
  { href: "/academy", label: "My academy" },
  { href: "/cases", label: "Case practice" },
  { href: "/library", label: "Library" },
  { href: "/certificates", label: "Certificates", exact: true },
  { href: "/labs", label: "Governance Labs" },
  { href: "/assistant", label: "Assistant" },
  { href: "/support", label: "Support" },
  { href: "/account", label: "Account" },
];

/** The learner portal (and every signed-in person's account settings). */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  // Vendor-only contacts keep their account and security settings but have no learner area.
  const path = (await headers()).get("x-pathname") ?? "";
  if (actor.role === "VENDOR" && !isStaff(actor) && !path.startsWith("/account")) redirect("/vendor");
  // A Super Administrator works in the admin, not as a learner: the learner pages send them
  // there. Account and security settings stay open (multi-factor setup lives there).
  const superAdmin = actor.staffRoles.includes("SUPER_ADMIN");
  if (superAdmin && !path.startsWith("/account")) redirect("/admin");

  const switcher = [
    ...(isStaff(actor) ? [{ href: "/admin", label: "Admin" }] : []),
    ...(actor.vendorIds.length ? [{ href: "/vendor", label: "Vendor portal" }] : []),
    ...(actor.managedOrgIds.length ? [{ href: "/team", label: "Team" }] : []),
  ];
  const role = actor.staffRoles.map((r) => ROLE_LABEL[r]).join(", ") || (actor.role === "STUDENT" ? "Learner" : actor.role);

  return (
    <PlatformShell
      area={superAdmin ? "Account" : "Academy"}
      home={superAdmin ? "/admin" : "/academy"}
      nav={superAdmin ? NAV.filter((n) => n.href === "/account") : NAV}
      switcher={switcher}
      user={{ name: actor.name, role }}
    >
      {children}
    </PlatformShell>
  );
}
