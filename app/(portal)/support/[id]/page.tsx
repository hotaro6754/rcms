import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor } from "@/lib/actor";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { viewTicket, CATEGORY_LABEL } from "@/lib/services/support/tickets";
import { LEARNER_STATUS_LABEL, REOPEN_WINDOW_DAYS } from "@/lib/support/states";
import { humanSize } from "@/lib/storage";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Pill, TEXTAREA, when } from "@/components/admin/kit";
import { Thread, PHI_WARNING } from "@/components/support/Thread";
import { AutoRefresh } from "@/components/portal/AutoRefresh";
import { attachFileAction, endChatAction, rateAction, replyAction } from "@/lib/actions/support";

export const metadata = { title: "Support conversation" };

export default async function TicketPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ masked?: string; new?: string; file?: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const v = await viewTicket(actor, id).catch((e) => {
    if (e instanceof ServiceError || e instanceof AuthorisationError) notFound();
    throw e;
  });
  const t = v.ticket;
  const open = !["RESOLVED", "CLOSED"].includes(t.status);
  const sp = await searchParams;
  const canReopen = t.status === "RESOLVED" || (t.status === "CLOSED" && !!t.closedAt && Date.now() - +t.closedAt < REOPEN_WINDOW_DAYS * 86400_000);
  return (
    <div className="mx-auto max-w-[860px] px-6 py-12">
      {t.channel === "CHAT" && open && <AutoRefresh seconds={5} />}
      <Link href="/support" className="text-micro text-muted-foreground hover:text-foreground">
        ← Support
      </Link>
      <PageHead
        kicker={`${t.reference} · ${CATEGORY_LABEL[t.category]}${t.program ? ` · ${t.program.name}` : ""}`}
        title={t.subject}
        lede={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={open ? "amber" : "green"}>{LEARNER_STATUS_LABEL[t.status]}</Pill>
            {t.assignee ? `With ${t.assignee.name}` : t.team ? `In the ${t.team.name} queue` : "Waiting for the next available person"}
          </span>
        }
      />
      {sp.new && (
        <p role="status" className="mt-4 border-l-2 border-success pl-3 text-[13.5px]">
          Your case number is <span className="text-data font-semibold">{t.reference}</span>. {t.assignee ? `${t.assignee.name}${t.team ? ` (${t.team.name})` : ""} has it.` : t.team ? `It is in the ${t.team.name} queue.` : "It is in the support queue."}
        </p>
      )}
      {sp.masked && <p role="status" className="mt-4 text-[13px] text-warning">Something that looked like sensitive data was removed from your message before it was stored.</p>}
      {sp.file && <p role="alert" className="mt-4 text-[13px] text-danger">The attachment was not added: {sp.file}</p>}

      {t.resolutionSummary && (
        <section className="mt-6 rounded-[var(--radius)] border border-success/40 bg-success-bg px-5 py-4">
          <h2 className="text-[14px] font-semibold">How it was resolved</h2>
          <p className="mt-1 whitespace-pre-line text-[14px]">{t.resolutionSummary}</p>
          {canReopen && <p className="mt-2 text-[12.5px] text-muted-foreground">Not fixed? Reply below within {REOPEN_WINDOW_DAYS} days and the case reopens.</p>}
        </section>
      )}

      <div className="mt-8">
        <Thread messages={t.messages} names={v.names} selfId={actor.id} />
      </div>

      {t.attachments.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[14px] font-semibold">Files</h2>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">
            {t.attachments.map((a) => (
              <li key={a.id}>
                <a href={`/api/support-files/${a.id}`} className="underline underline-offset-4">
                  {a.fileName}
                </a>{" "}
                <span className="text-muted-foreground">
                  {humanSize(a.sizeBytes)} · {when(a.createdAt, true)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {open || canReopen ? (
        <ActionForm action={replyAction} className="mt-8 flex flex-col gap-3" resetOnSuccess>
          <input type="hidden" name="ticketId" value={t.id} />
          <label htmlFor="body" className="text-micro font-medium">
            {open ? "Reply" : "Reopen with a reply"}
          </label>
          <textarea id="body" name="body" required rows={3} className={TEXTAREA} />
          <p className="text-[12px] text-muted-foreground">{PHI_WARNING}</p>
          <button className={`${BTN} w-fit`}>Send</button>
        </ActionForm>
      ) : (
        <p className="mt-8 text-[13.5px] text-muted-foreground">This case is closed. If you need more help, start a new conversation and mention {t.reference}.</p>
      )}
      {t.status !== "CLOSED" && (
        <ActionForm action={attachFileAction} className="mt-4 flex flex-wrap items-center gap-2" success="File added.">
          <input type="hidden" name="ticketId" value={t.id} />
          <label className="text-micro font-medium" htmlFor="attachment">
            Add a file
          </label>
          <input id="attachment" name="attachment" type="file" required className="text-[13px]" />
          <button className={BTN_OUTLINE}>Upload</button>
        </ActionForm>
      )}
      {open && (
        <div className="mt-4">
          <ActionButton action={endChatAction} fields={{ ticketId: t.id }} variant="ghost" confirm="Close this case? You can reopen it within 14 days by replying.">
            {t.channel === "CHAT" ? "End chat" : "I no longer need help"}
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
