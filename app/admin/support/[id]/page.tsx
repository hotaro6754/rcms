import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { AuthorisationError, ServiceError } from "@/lib/errors";
import { viewTicket, CATEGORY_LABEL, ESCALATION } from "@/lib/services/support/tickets";
import { usersWithPermission } from "@/lib/services/people/staff-lookup";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Checkbox, Field, FIELD, Panel, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { Thread } from "@/components/support/Thread";
import { AutoRefresh } from "@/components/portal/AutoRefresh";
import { TemplatePicker } from "@/components/support/TemplatePicker";
import { assignAction, declineAction, escalateAction, replyAction, triageAction } from "@/lib/actions/support";

export const metadata = { title: "Support case" };

/** The admin chat console (blueprint §6.3). */
export default async function SupportCase({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission(["support.view_assigned", "support.view_all"]);
  const { id } = await params;
  const v = await viewTicket(actor, id).catch((e) => {
    if (e instanceof ServiceError || e instanceof AuthorisationError) notFound();
    throw e;
  });
  const t = v.ticket;
  const mine = t.assigneeId === actor.id;
  const canWork = can(actor, "support.respond") && (mine || can(actor, "support.view_all"));
  const [learner, templates, agents] = await Promise.all([
    can(actor, "subscriber.view")
      ? prisma.user.findUnique({ where: { id: t.requesterId }, select: { id: true, name: true, email: true, status: true, enrolments: { select: { state: true, program: { select: { name: true } } } }, orders: { where: { state: { in: ["FAILED", "DISPUTED", "PENDING"] } }, select: { number: true, state: true } }, tickets: { where: { id: { not: t.id } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, reference: true, subject: true, status: true } } } })
      : null,
    prisma.responseTemplate.findMany({ where: { approved: true, archivedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true, body: true, category: true } }),
    can(actor, "support.assign") ? usersWithPermission("support.respond") : Promise.resolve([]),
  ]);
  const open = !["RESOLVED", "CLOSED"].includes(t.status);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      {t.channel === "CHAT" && open && <AutoRefresh seconds={5} />}
      <Link href="/admin/support" className="text-micro text-muted-foreground hover:text-foreground">
        ← Support queue
      </Link>
      <PageHead kicker={`${t.reference} · ${t.channel.toLowerCase()} · opened ${when(t.createdAt, true)}`} title={t.subject} lede={<span className="flex flex-wrap items-center gap-2"><StatusPill status={t.status} /> {CATEGORY_LABEL[t.category]} · {t.priority.toLowerCase()} priority {t.assignee ? `· with ${t.assignee.name}` : "· unassigned"}</span>} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Thread messages={t.messages} names={{ ...v.names, [t.requesterId]: t.requester.name }} selfId={actor.id} />
          {canWork ? (
            <ActionForm action={replyAction} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4" resetOnSuccess>
              <input type="hidden" name="ticketId" value={t.id} />
              {templates.length > 0 && <TemplatePicker templates={templates} target="reply-body" />}
              <textarea id="reply-body" name="body" required rows={4} aria-label="Reply" className={TEXTAREA} />
              <div className="flex flex-wrap items-center gap-3">
                <Checkbox name="internal" label="Internal note (staff only)" />
                <select name="status" defaultValue="" aria-label="Status after sending" className="min-h-9 rounded-[3px] border border-input bg-card px-2 text-[13px]">
                  <option value="">Then: waiting for learner</option>
                  <option value="IN_PROGRESS">Then: in progress</option>
                  <option value="PENDING_INTERNAL">Then: pending internal review</option>
                  <option value="RESOLVED">Then: resolved</option>
                </select>
                <button className={BTN}>Send</button>
              </div>
            </ActionForm>
          ) : (
            <p className="text-[13.5px] text-muted-foreground">{t.assigneeId ? "Assigned to someone else." : "Accept this case to reply."}</p>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <Panel title="Assignment">
            <div className="flex flex-col gap-3">
              {!t.assigneeId && can(actor, "support.respond") && (
                <ActionButton action={assignAction} fields={{ ticketId: t.id, assigneeId: actor.id }} variant="default">
                  Accept case
                </ActionButton>
              )}
              {mine && open && (
                <ActionForm action={declineAction} className="flex gap-1.5">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <input name="reason" required placeholder="Reason" aria-label="Reason for declining" className="min-h-8 flex-1 rounded-[3px] border border-input bg-card px-2 text-[12.5px]" />
                  <button className="rounded-[3px] border border-input px-2 text-[12.5px]">Decline</button>
                </ActionForm>
              )}
              {can(actor, "support.assign") && (
                <ActionForm action={assignAction} className="flex gap-1.5">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <select name="assigneeId" defaultValue={t.assigneeId ?? ""} aria-label="Assign to" className="min-h-8 flex-1 rounded-[3px] border border-input bg-card px-2 text-[12.5px]">
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-[3px] border border-input px-2 text-[12.5px]">Assign</button>
                </ActionForm>
              )}
            </div>
          </Panel>
          {canWork && (
            <Panel title="Triage">
              <ActionForm action={triageAction} className="flex flex-col gap-2">
                <input type="hidden" name="ticketId" value={t.id} />
                <Field label="Topic" htmlFor="tri-cat">
                  <select id="tri-cat" name="category" defaultValue={t.category} className={FIELD}>
                    {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority" htmlFor="tri-pri">
                  <select id="tri-pri" name="priority" defaultValue={t.priority} className={FIELD}>
                    {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status" htmlFor="tri-st">
                  <select id="tri-st" name="status" defaultValue={t.status} className={FIELD}>
                    {["ASSIGNED", "IN_PROGRESS", "PENDING_SUBSCRIBER", "PENDING_INTERNAL", "RESOLVED", "CLOSED"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Follow up on" htmlFor="tri-fu">
                  <input id="tri-fu" name="followUpAt" type="date" defaultValue={t.followUpAt ? t.followUpAt.toISOString().slice(0, 10) : ""} className={FIELD} />
                </Field>
                <Checkbox name="isComplaint" label="This is a complaint" defaultChecked={t.isComplaint} />
                <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Update</button>
              </ActionForm>
            </Panel>
          )}
          {can(actor, "support.escalate") && open && (
            <Panel title="Escalate">
              <ActionForm action={escalateAction} className="flex flex-col gap-2">
                <input type="hidden" name="ticketId" value={t.id} />
                <select name="to" aria-label="Escalate to" className={FIELD}>
                  {Object.entries(ESCALATION).map(([k, e]) => (
                    <option key={k} value={k}>
                      {e.label}
                    </option>
                  ))}
                </select>
                <textarea name="note" required rows={2} placeholder="What do you need from them?" aria-label="Escalation note" className={TEXTAREA} />
                <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Escalate</button>
              </ActionForm>
            </Panel>
          )}
          {learner && (
            <Panel title="Learner">
              <p className="text-[14px]">
                <Link href={`/admin/subscribers/${learner.id}`} className="underline underline-offset-4">
                  {learner.name}
                </Link>
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                {learner.email} · {learner.status.toLowerCase()}
              </p>
              <ul className="mt-2 text-[12.5px]">
                {learner.enrolments.map((e, i) => (
                  <li key={i}>
                    {e.program.name} · {e.state.toLowerCase()}
                  </li>
                ))}
                {learner.orders.map((o) => (
                  <li key={o.number} className="text-warning">
                    Order {o.number} {o.state.toLowerCase()}
                  </li>
                ))}
              </ul>
              {learner.tickets.length > 0 && (
                <ul className="mt-2 border-t border-border pt-2 text-[12.5px]">
                  {learner.tickets.map((x) => (
                    <li key={x.id}>
                      <Link href={`/admin/support/${x.id}`} className="hover:underline">
                        {x.reference}
                      </Link>{" "}
                      {x.subject} · {x.status.toLowerCase()}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          {t.rating && (
            <Panel title="Feedback">
              <p className="text-[14px]">{t.rating} / 5</p>
              {t.feedback && <p className="text-[13px] text-muted-foreground">{t.feedback}</p>}
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
