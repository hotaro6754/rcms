import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { PlatformShell } from "@/components/platform/PlatformShell";

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/programs", label: "Programs" },
  { href: "/admin/certificates", label: "Certificates" },
  { href: "/admin/leads", label: "Leads" },
];

/**
 * Admin shell. Authorisation happens here and again in every action: a layout guard alone
 * is not a security boundary, because a server action can be called directly.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const role = (session.user as { role?: string }).role ?? "STUDENT";
  if (role !== "ADMIN" && role !== "OWNER") redirect("/account");

  return (
    <PlatformShell
      area="Admin"
      home="/admin"
      nav={NAV}
      switcher={[
        { href: "/studio", label: "Studio" },
        { href: "/academy", label: "Academy" },
      ]}
      user={{ name: session.user.name, role }}
    >
      {children}
    </PlatformShell>
  );
}
