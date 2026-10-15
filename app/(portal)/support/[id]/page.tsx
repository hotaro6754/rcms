import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { viewTicket, CATEGORY_LABEL } from "@/lib/services/support/tickets";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, StatusPill, TEXTAREA } from "@/components/admin/kit";
import { Thread, PHI_WARNING } from "@/components/support/Thread";
import { AutoRefresh } from "@/components/portal/AutoRefresh";
import { endChatAction, rateAction, replyAction } from "@/lib/actions/support";

export const metadata = { title: "Support conversation" };

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ masked?: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const v = await viewTicket(actor, id).catch((e) => {
    if (e instanceof ServiceError || e instanceof AuthorisationError) notFound();
    throw e;
  });
  const t = v.ticket;
  const open = !["RESOLVED", "CLOSED"].includes(t.status);
  const masked = (await searchParams).masked;
  return (
    <div className="mx-auto max-w-[860px] px-6 py-12">
      {t.channel === "CHAT" && open && <AutoRefresh seconds={5} />}
      <Link href="/support" className="text-micro text-muted-foreground hover:text-foreground">
        ← Support
      </Link>
      <PageHead kicker={`${t.reference} · ${CATEGORY_LABEL[t.category]}`} title={t.subject} lede={<span className="flex items-center gap-2"><StatusPill status={t.status} />{t.assignee ? `With ${t.assignee.name}` : "Waiting for the next available person"}</span>} />
      {masked && <p role="status" className="mt-4 text-[13px] text-warning">Something that looked like sensitive data was removed from your message before it was stored.</p>}
      <div className="mt-8">
        <Thread messages={t.messages} names={v.names} selfId={actor.id} />
      </div>
      {t.status !== "CLOSED" || (t.closedAt && Date.now() - +t.closedAt < 14 * 86400_000) ? (
        <ActionForm action={replyAction} className="mt-8 flex flex-col gap-3" resetOnSuccess>
          <input type="hidden" name="ticketId" value={t.id} />
          <label htmlFor="body" className="text-micro font-medium">
            {open ? "Reply" : "Reopen with a reply"}
          </label>
          <textarea id="body" name="body" required rows={3} className={TEXTAREA} />
          <p className="text-[12px] text-muted-foreground">{PHI_WARNING}</p>
          <div className="flex flex-wrap gap-3">
            <button className={`${BTN} w-fit`}>Send</button>
          </div>
        </ActionForm>
      ) : null}
      {open && t.channel === "CHAT" && (
        <div className="mt-4">
          <ActionButton action={endChatAction} fields={{ ticketId: t.id }} variant="ghost" confirm="End this chat?">
            End chat
          </ActionButton>
        </div>
      )}
      {!open && (
        <section className="mt-10 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
          <h2 className="text-[1.05rem]">{t.rating ? `You rated this ${t.rating} of 5. Thank you.` : "How did we do?"}</h2>
          {!t.rating && (
            <ActionForm action={rateAction} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="ticketId" value={t.id} />
              <fieldset className="flex gap-3">
                <legend className="sr-only">Rating</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="flex items-center gap-1 text-[14px]">
                    <input type="radio" name="rating" value={n} required /> {n}
                  </label>
                ))}
              </fieldset>
              <textarea name="feedback" rows={2} placeholder="Anything we should know (optional)" aria-label="Feedback" className={TEXTAREA} />
              <button className={`${BTN} w-fit`}>Send feedback</button>
            </ActionForm>
          )}
        </section>
      )}
    </div>
  );
}
