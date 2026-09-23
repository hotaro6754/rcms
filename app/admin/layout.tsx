import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { SignOutButton } from "@/components/auth/SignOutButton";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/programs", label: "Programs" },
];

/**
 * Admin OS shell. Authorisation happens here and again in every action — a layout guard
 * alone is not a security boundary, because a server action can be called directly.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const role = (session.user as { role?: string }).role ?? "STUDENT";
  if (role !== "ADMIN" && role !== "OWNER") redirect("/account");

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="border-b border-border p-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="text-data rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-semibold leading-none text-background">
              RCMS
            </span>
            <span className="text-[13.5px] font-semibold tracking-tight">Admin</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex min-h-9 items-center rounded-md px-2.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <Link href="/" className="text-micro text-muted-foreground hover:text-foreground">
            ← Public site
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 px-4 backdrop-blur-md">
          <div className="flex h-14 items-center gap-4">
            <span className="text-micro text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{session.user.name}</span>
              {" · "}
              <span className="text-data">{role}</span>
            </span>
            <div className="ml-auto">
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
