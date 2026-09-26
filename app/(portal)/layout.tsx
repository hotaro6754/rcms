import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { PlatformShell } from "@/components/platform/PlatformShell";

const NAV = [
  { href: "/academy", label: "My academy" },
  { href: "/library", label: "Library" },
  { href: "/certificates", label: "Certificates", exact: true },
  { href: "/labs", label: "Governance Labs" },
  { href: "/account", label: "Account" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");
  const role = (session.user as { role?: string }).role ?? "STUDENT";

  const switcher = [
    ...(["TRAINER", "ADMIN", "OWNER"].includes(role) ? [{ href: "/studio", label: "Studio" }] : []),
    ...(["ADMIN", "OWNER"].includes(role) ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <PlatformShell area="Academy" home="/academy" nav={NAV} switcher={switcher} user={{ name: session.user.name, role }}>
      {children}
    </PlatformShell>
  );
}
