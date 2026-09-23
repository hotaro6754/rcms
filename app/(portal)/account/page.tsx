import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const metadata = { title: "Your account" };

/**
 * The first protected route. It exists to prove the Phase 0 gate end to end: a session is
 * required, the role comes off the server, and the audit trail for this account is visible
 * to the person it belongs to.
 */
export default async function AccountPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const user = session.user as typeof session.user & { role?: string };

  const [enrolments, recentAudit] = await Promise.all([
    prisma.enrolment.findMany({
      where: { userId: user.id },
      include: { program: { select: { name: true, tier: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { actorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, entity: true, createdAt: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Your account</p>
          <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.3rem)] leading-tight">{user.name}</h1>
          <p className="text-data mt-2 text-micro text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="rounded-full border-transparent bg-accent text-micro font-semibold text-accent-foreground">
            {user.role ?? "STUDENT"}
          </Badge>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Card className="gap-0 py-0">
          <CardHeader className="gap-0 border-b border-border px-5 py-4 [.border-b]:pb-4">
            <h2 className="text-[13.5px] font-semibold">Your programs</h2>
          </CardHeader>
          <CardContent className="px-5 py-5">
            {enrolments.length === 0 ? (
              <div>
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  Nothing enrolled yet. The five levels map what you own now against what the
                  role above expects.
                </p>
                <Link
                  href="/learning-paths"
                  className="mt-4 inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Find your level
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {enrolments.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                    <span>
                      <span className="text-data block text-micro text-muted-foreground">
                        {e.program.tier}
                      </span>
                      <span className="block text-[14px] font-medium">{e.program.name}</span>
                    </span>
                    <Badge className="rounded-full border-transparent bg-secondary text-micro text-secondary-foreground">
                      {e.state.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="gap-0 border-b border-border px-5 py-4 [.border-b]:pb-4">
            <h2 className="text-[13.5px] font-semibold">Recent activity on this account</h2>
          </CardHeader>
          <CardContent className="px-5 py-5">
            <ul className="flex flex-col gap-3">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px]">
                    {a.action} <span className="text-muted-foreground">{a.entity}</span>
                  </span>
                  <span className="text-data shrink-0 text-micro text-muted-foreground">
                    {a.createdAt.toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-micro leading-relaxed text-muted-foreground">
              Every action on your account is recorded. If something here is not yours, change
              your password and tell us.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
