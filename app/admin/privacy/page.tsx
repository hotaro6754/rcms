import Link from "next/link";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { Empty, FIELD, StatusPill, when } from "@/components/admin/kit";
import { resolvePrivacyAction } from "@/lib/actions/subscribers";

export const metadata = { title: "Privacy requests" };

export default async function PrivacyPage() {
  await requirePagePermission("subscriber.privacy");
  const rows = await prisma.privacyRequest.findMany({ orderBy: [{ status: "asc" }, { createdAt: "asc" }], take: 200, include: { user: { select: { id: true, name: true, email: true } } } });
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Subscribers" title="Privacy requests" lede="Access, correction and deletion requests. Verify the requester's identity before acting. Deletion anonymises the account; financial records and the audit trail are retained as the policy requires." />
      <div className="mt-8 flex flex-col gap-3">
        {rows.length === 0 && <Empty title="No privacy requests." />}
        {rows.map((r) => {
          const open = r.status === "OPEN" || r.status === "IN_REVIEW";
          return (
            <div key={r.id} className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[14px]">
                <StatusPill status={r.status} />
                <span className="font-medium">{r.kind.toLowerCase()} request</span>
                <Link href={`/admin/subscribers/${r.user.id}`} className="underline">
                  {r.user.name}
                </Link>
                <span className="text-micro text-muted-foreground">
                  {r.user.email} · opened {when(r.createdAt)}
                </span>
              </p>
              {r.detail && <p className="mt-1 text-[13.5px]">{r.detail}</p>}
              {r.resolution && <p className="mt-1 text-[13px] text-muted-foreground">Resolution: {r.resolution}</p>}
              {r.kind === "ACCESS" && open && (
                <a href={`/api/privacy/${r.id}`} className="mt-2 inline-block text-micro underline">
                  Download the person&apos;s data (JSON)
                </a>
              )}
              {open && (
                <ActionForm action={resolvePrivacyAction} className="mt-3 flex flex-wrap items-center gap-2" confirm={r.kind === "DELETION" ? "Completing a deletion anonymises this account and revokes its certificates. Continue?" : undefined}>
                  <input type="hidden" name="id" value={r.id} />
                  <input name="resolution" placeholder="What was done (sent to the audit log)" aria-label="Resolution" className={`${FIELD} max-w-md`} />
                  <button name="outcome" value="IN_REVIEW" className="rounded-[3px] border border-input px-3 py-1.5 text-[13px]">
                    Mark in review
                  </button>
                  <button name="outcome" value="COMPLETED" className="rounded-[3px] bg-primary px-3 py-1.5 text-[13px] text-primary-foreground">
                    Complete
                  </button>
                  <button name="outcome" value="REJECTED" className="rounded-[3px] border border-input px-3 py-1.5 text-[13px]">
                    Reject
                  </button>
                </ActionForm>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
