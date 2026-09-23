import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/rbac";
import { SignOutButton } from "@/components/auth/SignOutButton";

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
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-6">
          <Link href="/studio" className="flex shrink-0 items-center gap-2.5">
            <span className="text-data rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-semibold leading-none text-background">
              RCMS
            </span>
            <span className="text-[13.5px] font-semibold tracking-tight">Trainer Studio</span>
          </Link>
          <span className="text-micro text-muted-foreground">
            {session.user.name} · <span className="text-data">{role}</span>
          </span>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/studio/grading" className="text-micro text-muted-foreground hover:text-foreground">
              Grading
            </Link>
            <Link href="/academy" className="text-micro text-muted-foreground hover:text-foreground">
              Student view
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
