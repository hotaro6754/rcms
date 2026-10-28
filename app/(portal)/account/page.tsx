import Link from "next/link";
import { requireActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Field, FIELD, Panel, Pill, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { deactivateAccountAction, marketingConsentAction, updateOwnProfileAction } from "@/lib/actions/account";
import { openPrivacyRequestAction } from "@/lib/actions/subscribers";

export const metadata = { title: "Your account" };

const STATUS_NOTE: Record<string, string> = {
  PENDING_VERIFICATION: "Confirm your email address to start learning.",
  SUSPENDED: "This account is suspended. Contact support if you think this is a mistake.",
  GRACE_PERIOD: "Your subscription has lapsed. Renew within the grace period to keep access.",
  PAYMENT_FAILED: "Your last payment failed. Update it from Billing to keep access.",
};

export default async function AccountPage() {
  const actor = await requireActor();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    select: {
      name: true, email: true, status: true, country: true, timezone: true, currentRole: true, phone: true, marketingOptIn: true, termsAcceptedAt: true, createdAt: true, twoFactorEnabled: true, lastLoginAt: true, previousLoginAt: true,
      privacyRequests: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { enrolments: true, certificates: true } },
    },
  });
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHead kicker="Your account" title={user.name} lede={<span className="flex flex-wrap items-center gap-2">{user.email} <StatusPill status={user.status} /></span>} />
        <SignOutButton />
      </div>
      {STATUS_NOTE[user.status] && (
        <p role="status" className="mt-6 border-l-2 border-warning pl-3 text-[14px]">
          {STATUS_NOTE[user.status]}
        </p>
      )}

      <nav className="mt-8 grid gap-3 sm:grid-cols-4" aria-label="Account sections">
        {[
          ["/account/security", "Security", user.twoFactorEnabled ? "Two-step verification on" : "Two-step verification off"],
          ["/account/billing", "Billing", "Plans, payments and invoices"],
          ["/certificates", "Certificates", `${user._count.certificates} issued`],
          ["/support", "Support", "Ask for help, follow your cases"],
        ].map(([href, label, note]) => (
          <Link key={href} href={href} className="rounded-[var(--radius)] border border-border bg-card px-4 py-3 transition-colors hover:border-foreground">
            <span className="block text-[14.5px] font-medium">{label}</span>
            <span className="block text-micro text-muted-foreground">{note}</span>
          </Link>
        ))}
      </nav>
      {!user.twoFactorEnabled && (
        <p className="mt-3 text-micro text-muted-foreground">
          <Pill tone="amber">recommended</Pill> Turn on two-step verification in Security.
        </p>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title="Profile">
          <ActionForm action={updateOwnProfileAction} className="grid gap-3 sm:grid-cols-2" success="Saved.">
            <Field label="Name" htmlFor="n" className="sm:col-span-2">
              <input id="n" name="name" defaultValue={user.name} required className={FIELD} />
            </Field>
            <Field label="Country" htmlFor="c">
              <input id="c" name="country" defaultValue={user.country ?? ""} className={FIELD} />
            </Field>
            <Field label="Time zone" htmlFor="t">
              <input id="t" name="timezone" defaultValue={user.timezone ?? ""} placeholder="Asia/Kolkata" className={FIELD} />
            </Field>
            <Field label="Current role" htmlFor="r">
              <input id="r" name="currentRole" defaultValue={user.currentRole ?? ""} placeholder="e.g. AR caller" className={FIELD} />
            </Field>
            <Field label="Phone (optional)" htmlFor="p">
              <input id="p" name="phone" defaultValue={user.phone ?? ""} className={FIELD} />
            </Field>
            <button className={`${BTN} w-fit`}>Save</button>
          </ActionForm>
          <p className="mt-4 text-micro text-muted-foreground">
            Member since {when(user.createdAt)} · terms accepted {when(user.termsAcceptedAt)} · previous sign-in {when(user.previousLoginAt, true)}. To change your email address, contact support.
          </p>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Email preferences">
            <p className="text-[13.5px]">{user.marketingOptIn ? "You receive occasional emails about new courses." : "You do not receive marketing emails. Account and course emails are always sent."}</p>
            <div className="mt-3">
              <ActionButton action={marketingConsentAction} fields={{ granted: user.marketingOptIn ? "" : "true" }}>
                {user.marketingOptIn ? "Stop marketing emails" : "Send me course news"}
              </ActionButton>
            </div>
          </Panel>
          <Panel title="Your data">
            <p className="text-[13px] text-muted-foreground">
              Ask for a copy of your data, a correction, or deletion of your account. We verify requests before acting. Financial records are kept for the periods the law requires. See the{" "}
              <Link href="/legal/privacy" className="underline">
                privacy policy
              </Link>
              .
            </p>
            <ul className="mt-2 text-[12.5px]">
              {user.privacyRequests.map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-0.5">
                  {r.kind.toLowerCase()} request <StatusPill status={r.status} /> {when(r.createdAt)}
                </li>
              ))}
            </ul>
            <ActionForm action={openPrivacyRequestAction} className="mt-3 flex flex-col gap-2" resetOnSuccess success="Request received. We will reply by email.">
              <select name="kind" aria-label="Request type" className={FIELD}>
                <option value="ACCESS">Send me a copy of my data</option>
                <option value="CORRECTION">Correct something</option>
                <option value="DELETION">Delete my account</option>
              </select>
              <textarea name="detail" rows={2} placeholder="Anything we should know (optional)" aria-label="Details" className={TEXTAREA} />
              <button className={`${BTN_OUTLINE} w-fit`}>Send request</button>
            </ActionForm>
          </Panel>
          <Panel title="Problems with your account?">
            <p className="text-[13px] text-muted-foreground">Sign-in, access or billing trouble goes straight to the right team.</p>
            <Link href="/support/new?category=LOGIN_ACCESS&source=ACCOUNT&from=%2Faccount" className={`${BTN_OUTLINE} mt-3 w-fit`}>
              Contact support
            </Link>
          </Panel>
          {actor.staffRoles.length === 0 && actor.role === "STUDENT" && (
            <Panel title="Close your account">
              <p className="text-[13px] text-muted-foreground">
                You are signed out everywhere and cannot sign in again until support reactivates the account. Certificates stay verifiable. Any subscription stops renewing. To have your personal data deleted, use a deletion request above instead.
              </p>
              <ActionForm action={deactivateAccountAction} className="mt-3 flex flex-col gap-2" confirm="Close your account now?">
                <input name="confirm" required placeholder="Type DEACTIVATE" aria-label="Type DEACTIVATE to confirm" autoComplete="off" className={FIELD} />
                <button className="w-fit rounded-[3px] border border-danger/40 px-3 py-1.5 text-[13px] text-danger">Close account</button>
              </ActionForm>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
