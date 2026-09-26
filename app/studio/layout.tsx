import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { PlatformShell } from "@/components/platform/PlatformShell";

const NAV = [
  { href: "/studio", label: "Programs", exact: true },
  { href: "/studio/grading", label: "Grading" },
];

/**
 * Trainer Studio shell. ADMIN and OWNER outrank TRAINER so they pass too; the actions
 * re-check on every write, because a layout guard alone is not a security boundary.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const role = (session.user as { role?: string }).role ?? "STUDENT";
  if (!["TRAINER", "ADMIN", "OWNER"].includes(role)) redirect("/account");

  return (
    <PlatformShell
      area="Trainer Studio"
      home="/studio"
      nav={NAV}
      switcher={[
        ...(["ADMIN", "OWNER"].includes(role) ? [{ href: "/admin", label: "Admin" }] : []),
        { href: "/academy", label: "Student view" },
      ]}
      user={{ name: session.user.name, role }}
    >
      {children}
    </PlatformShell>
  );
}
