import Link from "next/link";
import { getActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { ActionForm } from "@/components/admin/ActionForm";
import { acceptInvitationAction } from "@/lib/actions/subscribers";
import { hashToken } from "@/lib/services/people/subscribers";

export const metadata = { title: "Invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inv = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { org: { select: { name: true } } } });
  const valid = inv && !inv.revokedAt && !inv.acceptedAt && inv.expiresAt > new Date();
  const actor = await getActor();
  const here = `/invite/${token}`;
  return (
    <>
      <p className="text-data text-[11px] tracking-[0.14em] text-subtle">INVITATION</p>
      <h1 className="mt-3 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.02]">{valid ? (inv.org ? `Join ${inv.org.name}.` : "You are invited.") : "This link has expired."}</h1>
      {!valid ? (
        <p className="mt-4 text-[15px] text-muted-foreground">Invitations last 14 days and work once. Ask whoever invited you for a new one.</p>
      ) : !actor ? (
        <>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">Create an account with the address this invitation was sent to, or sign in if you already have one. Then come back to this link.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/sign-up?next=${encodeURIComponent(here)}`} className="inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground">
              Create account
            </Link>
            <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className="inline-flex min-h-11 items-center rounded-[3px] border border-input px-5 text-[14px]">
              Sign in
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-[15px] text-muted-foreground">You are signed in as {actor.email}.</p>
          <ActionForm action={acceptInvitationAction} className="mt-8">
            <input type="hidden" name="token" value={token} />
            <button className="inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground">Accept invitation</button>
          </ActionForm>
        </>
      )}
    </>
  );
}
