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
import { assignAction, attachFileAction, declineAction, escalateAction, replyAction, setTeamAction, triageAction } from "@/lib/actions/support";
import { STAFF_TRANSITIONS, STATUS_LABEL } from "@/lib/support/states";
import { humanSize } from "@/lib/storage";
import { strings } from "@/lib/json-list";

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
  const [learner, templates, agents, teams] = await Promise.all([
    can(actor, "subscriber.view")
      ? prisma.user.findUnique({ where: { id: t.requesterId }, select: { id: true, name: true, email: true, status: true, enrolments: { select: { state: true, program: { select: { name: true } } } }, orders: { where: { state: { in: ["FAILED", "DISPUTED", "PENDING"] } }, select: { number: true, state: true } }, tickets: { where: { id: { not: t.id } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, reference: true, subject: true, status: true } } } })
      : null,
    prisma.responseTemplate.findMany({ where: { approved: true, archivedAt: null }, orderBy: { title: "asc" }, select: { id: true, title: true, body: true, category: true } }),
    can(actor, "support.assign") ? usersWithPermission("support.respond") : Promise.resolve([]),
    prisma.supportTeam.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const name = (id: string | null) => (id ? (v.names[id] ?? (id === t.requesterId ? t.requester.name : "someone")) : "nobody");
  const now = new Date();
  const nextStatuses = STAFF_TRANSITIONS[t.status].filter((s) => s !== "ASSIGNED" && s !== "WAITING");
  const open = !["RESOLVED", "CLOSED"].includes(t.status);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      {t.channel === "CHAT" && open && <AutoRefresh seconds={5} />}
      <Link href="/admin/support" className="text-micro text-muted-foreground hover:text-foreground">
        ← Support queue
      </Link>
      <PageHead kicker={`${t.reference} · ${t.channel.toLowerCase()} · ${t.source.toLowerCase().replace("_", " ")} · opened ${when(t.createdAt, true)}`} title={t.subject} lede={<span className="flex flex-wrap items-center gap-2"><StatusPill status={t.status} label={STATUS_LABEL[t.status]} /> {CATEGORY_LABEL[t.category]} · {t.priority.toLowerCase()} priority · {t.team?.name ?? "no team"} {t.assignee ? `· with ${t.assignee.name}` : "· unassigned"}</span>} />
      {(t.program || t.pageContext || t.relatedRef || strings(t.tags).length > 0) && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {t.program && <>Course: {t.program.name} · </>}
          {t.relatedRef && <>About: {t.relatedRef} · </>}
          {t.pageContext && <>Raised from {t.pageContext} · </>}
          {strings(t.tags).length > 0 && <>Tags: {strings(t.tags).join(", ")}</>}
        </p>
      )}
      {t.resolutionSummary && <p className="mt-3 border-l-2 border-success pl-3 text-[13.5px]">Resolution: {t.resolutionSummary}</p>}

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
                  {nextStatuses
                    .filter((s) => s !== "PENDING_SUBSCRIBER" && s !== "ESCALATED" && s !== "CLOSED")
                    .map((s) => (
                      <option key={s} value={s}>
                        Then: {STATUS_LABEL[s].toLowerCase()}
                        {s === "RESOLVED" ? " (this reply is the resolution)" : ""}
                      </option>
                    ))}
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
          {can(actor, "support.assign") && (
            <Panel title="Team">
              <ActionForm action={setTeamAction} className="flex gap-1.5">
                <input type="hidden" name="ticketId" value={t.id} />
                <select name="teamId" defaultValue={t.teamId ?? ""} aria-label="Team" className="min-h-8 flex-1 rounded-[3px] border border-input bg-card px-2 text-[12.5px]">
                  {!t.teamId && <option value="">No team</option>}
                  {teams.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <button className="rounded-[3px] border border-input px-2 text-[12.5px]">Move</button>
              </ActionForm>
            </Panel>
          )}
          <Panel title="Targets">
            <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-y-1.5 text-[12.5px]">
              <dt className="text-muted-foreground">First response</dt>
              <dd>{t.firstResponseAt ? `met ${when(t.firstResponseAt, true)}` : t.firstResponseDueAt ? `${t.firstResponseDueAt < now ? "overdue since" : "due"} ${when(t.firstResponseDueAt, true)}` : "—"}</dd>
              <dt className="text-muted-foreground">Resolution</dt>
              <dd>{t.resolvedAt ? `resolved ${when(t.resolvedAt, true)}` : t.resolutionDueAt ? `${t.resolutionDueAt < now ? "overdue since" : "due"} ${when(t.resolutionDueAt, true)}` : "—"}</dd>
              {(t.firstResponseBreachedAt || t.resolutionBreachedAt) && (
                <>
                  <dt className="text-muted-foreground">Breached</dt>
                  <dd className="text-danger">{[t.firstResponseBreachedAt && "first response", t.resolutionBreachedAt && "resolution"].filter(Boolean).join(", ")}</dd>
                </>
              )}
              {t.reopenCount > 0 && (
                <>
                  <dt className="text-muted-foreground">Reopened</dt>
                  <dd>{t.reopenCount}×</dd>
                </>
              )}
            </dl>
          </Panel>
          <Panel title="Files">
            {t.attachments.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">None.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-[12.5px]">
                {t.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={`/api/support-files/${a.id}`} className="underline underline-offset-4">
                      {a.fileName}
                    </a>{" "}
                    <span className="text-muted-foreground">
                      {humanSize(a.sizeBytes)} · {name(a.uploaderId)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {canWork && t.status !== "CLOSED" && (
              <ActionForm action={attachFileAction} className="mt-2 flex flex-col gap-1.5">
                <input type="hidden" name="ticketId" value={t.id} />
                <input name="attachment" type="file" required aria-label="File" className="text-[12px]" />
                <button className="w-fit rounded-[3px] border border-input px-2 py-1 text-[12.5px]">Upload</button>
              </ActionForm>
            )}
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
                <Field label="Move to" htmlFor="tri-st" hint="Only moves the case can make from where it is.">
                  <select id="tri-st" name="status" defaultValue="" className={FIELD}>
                    <option value="">Keep: {STATUS_LABEL[t.status].toLowerCase()}</option>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Resolution summary (needed to resolve; the learner sees it)" htmlFor="tri-res">
                  <textarea id="tri-res" name="resolutionSummary" rows={2} defaultValue={t.resolutionSummary ?? ""} className={TEXTAREA} />
                </Field>
                <Field label="Tags" htmlFor="tri-tags" hint="Comma-separated.">
                  <input id="tri-tags" name="tags" defaultValue={strings(t.tags).join(", ")} className={FIELD} />
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
          <Panel title="History">
            <ol className="flex flex-col gap-1.5 text-[12px]">
              {(t.events ?? []).map((e) => (
                <li key={e.id}>
                  <span className="text-data text-muted-foreground">{when(e.createdAt, true)}</span> {e.kind.toLowerCase().replace("_", " ")}
                  {e.from || e.to ? ` ${e.kind === "ASSIGNED" || e.kind === "UNASSIGNED" ? `${e.from ? name(e.from) : ""}${e.to ? ` → ${name(e.to)}` : ""}` : `${e.from ?? ""}${e.to ? ` → ${e.to}` : ""}`}` : ""}
                  {e.note ? <span className="text-muted-foreground"> · {e.note}</span> : null}
                  <span className="text-muted-foreground"> · {e.actorId ? name(e.actorId) : "system"}</span>
                </li>
              ))}
            </ol>
          </Panel>
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
