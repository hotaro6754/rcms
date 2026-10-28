import Link from "next/link";
import { requireActor, isStaff, mfaRequired } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { SecuritySettings } from "@/components/portal/SecuritySettings";
import { when } from "@/components/admin/kit";

export const metadata = { title: "Security" };

const LABEL: Record<string, string> = { login: "Signed in", login_failed: "Failed sign-in", lockout: "Locked after failed attempts", mfa_enabled: "Two-step verification turned on", mfa_disabled: "Two-step verification turned off", mfa_failed: "Wrong verification code", password_change: "Password changed", password_reset: "Password reset" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const actor = await requireActor();
  const { required } = await searchParams;
  const staff = isStaff(actor);
  const [events, sessions] = await Promise.all([
    prisma.auditLog.findMany({ where: { actorId: actor.id, action: { in: Object.keys(LABEL) } }, orderBy: { createdAt: "desc" }, take: 12, select: { id: true, action: true, createdAt: true, ip: true } }),
    prisma.session.count({ where: { userId: actor.id, expiresAt: { gt: new Date() } } }),
  ]);
  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <Link href="/account" className="text-micro text-muted-foreground hover:text-foreground">
        ← Account
      </Link>
      <PageHead kicker="Account" title="Security" lede={`${sessions} active session${sessions === 1 ? "" : "s"}. Changing your password signs out every other device.`} />
      {required === "admin" && !actor.twoFactorEnabled && (
        <p role="alert" className="mt-6 border-l-2 border-warning pl-3 text-[14px]">
          The Admin Control Center requires two-step verification. Set it up below, then open the admin area again.
        </p>
      )}
      <div className="mt-8">
        <SecuritySettings enabled={actor.twoFactorEnabled} mustKeep={staff && mfaRequired()} />
      </div>
      <section className="mt-10">
        <h2 className="label-caps mb-3">Recent security activity</h2>
        <ul className="divide-y divide-border text-[13.5px]">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-2">
              <span>{LABEL[e.action]}</span>
              <span className="text-micro text-muted-foreground">
                {when(e.createdAt, true)}
                {e.ip ? ` · ${e.ip}` : ""}
              </span>
            </li>
          ))}
          {events.length === 0 && <li className="py-2 text-muted-foreground">Nothing yet.</li>}
        </ul>
        <p className="mt-3 text-micro text-muted-foreground">If you see activity that is not yours, change your password now and contact support.</p>
      </section>
    </div>
  );
}
