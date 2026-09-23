import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { SignOutButton } from "@/components/auth/SignOutButton";

const NAV = [
  { href: "/academy", label: "My academy" },
  { href: "/labs", label: "Governance Labs" },
  { href: "/account", label: "Account" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-6">
          <Link href="/academy" className="flex shrink-0 items-center gap-2.5">
            <span className="text-data rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-semibold leading-none text-background">
              RCMS
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
              Operations <span className="font-normal text-muted-foreground">Academy</span>
            </span>
          </Link>
          <nav aria-label="Portal" className="flex items-center gap-6">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-micro text-muted-foreground sm:inline">
              {session.user.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
