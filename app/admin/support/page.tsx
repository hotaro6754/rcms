import Link from "next/link";
import type { SupportCategory, SupportPriority, SupportStatus } from "@prisma/client";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, Pill, Table, Td, when } from "@/components/admin/kit";
import { queue, CATEGORY_LABEL, type QueueView } from "@/lib/services/support/tickets";
import { STATUS_LABEL } from "@/lib/support/states";
import { assignAction, setAvailabilityAction } from "@/lib/actions/support";

export const metadata = { title: "Support queue" };

const STATUSES = Object.keys(STATUS_LABEL) as SupportStatus[];
const VIEWS: { v: QueueView; l: string }[] = [
  { v: "mine", l: "My cases" },
  { v: "team", l: "My teams" },
  { v: "unassigned", l: "Unassigned" },
  { v: "high", l: "High priority" },
  { v: "overdue", l: "Overdue" },
  { v: "waiting_learner", l: "Waiting for learner" },
  { v: "all", l: "All open" },
];

function Due({ at, met, breached, now }: { at: Date | null; met: boolean; breached: Date | null; now: Date }) {
  if (!at) return <span className="text-muted-foreground">—</span>;
  if (met) return <span className="text-muted-foreground">met</span>;
  if (breached || at < now) return <Pill tone="red">overdue {when(at, true)}</Pill>;
  const mins = (at.getTime() - now.getTime()) / 60_000;
  return mins < 120 ? <Pill tone="amber">due {when(at, true)}</Pill> : <span className="text-[12.5px]">{when(at, true)}</span>;
}

/** The support workspace queue. Agents see their own cases and the unassigned cases of their teams. */
export default async function SupportQueue({ searchParams }: { searchParams: Promise<{ view?: string; status?: string; category?: string; priority?: string; team?: string; q?: string }> }) {
  const actor = await requirePagePermission(["support.view_assigned", "support.view_all"]);
  const sp = await searchParams;
  const view = (VIEWS.find((x) => x.v === sp.view)?.v ?? (can(actor, "support.view_all") ? "all" : "mine")) as QueueView;
  const [rows, teams, membership] = await Promise.all([
    queue(actor, {
      view,
      status: STATUSES.includes(sp.status as SupportStatus) ? (sp.status as SupportStatus) : undefined,
      category: sp.category && sp.category in CATEGORY_LABEL ? (sp.category as SupportCategory) : undefined,
      priority: ["LOW", "NORMAL", "HIGH", "URGENT"].includes(sp.priority ?? "") ? (sp.priority as SupportPriority) : undefined,
      teamId: sp.team || undefined,
      q: sp.q,
    }),
    prisma.supportTeam.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supportTeamMember.findMany({ where: { userId: actor.id }, include: { team: { select: { name: true } } } }),
  ]);
  const now = new Date();
  const available = membership.some((m) => m.available);
  const qs = (patch: Record<string, string>) => new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)), ...patch }).toString();

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      <PageHead
        kicker="Support"
        title="Support queue"
        lede="Cases are routed to a team by topic and, where the team assigns automatically, to its least-loaded available member. Overdue means a first-response or resolution target has passed."
        actions={
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            {membership.length > 0 && (
              <ActionForm action={setAvailabilityAction}>
                <input type="hidden" name="available" value={available ? "" : "true"} />
                <button className="underline underline-offset-4">{available ? "Mark me away (stop auto-assignment)" : "Mark me available"}</button>
              </ActionForm>
            )}
            {can(actor, "support.configure") && (
              <Link href="/admin/support/settings" className="underline underline-offset-4">
                Teams, routing and SLA
              </Link>
            )}
          </div>
        }
      />
      {membership.length > 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Your teams: {membership.map((m) => `${m.team.name}${m.isLead ? " (lead)" : ""}`).join(", ")} · {available ? "available for new cases" : "away: new cases are not assigned to you"}
        </p>
      )}

      <nav aria-label="Queue views" className="mt-6 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {VIEWS.map((x) => (
          <Link key={x.v} href={`?${qs({ view: x.v })}`} aria-current={view === x.v ? "page" : undefined} className="rounded-[3px] px-2.5 py-1.5 text-[13px] hover:bg-secondary aria-[current=page]:bg-foreground aria-[current=page]:text-background">
            {x.l}
          </Link>
        ))}
      </nav>

      <form className="mt-4 flex flex-wrap items-end gap-3" role="search">
        <input type="hidden" name="view" value={view} />
        <Field label="Search" htmlFor="q">
          <input id="q" name="q" defaultValue={sp.q} placeholder="Reference, subject, learner, tag" className={`${FIELD} w-64`} />
        </Field>
        <Field label="Team" htmlFor="team">
          <select id="team" name="team" defaultValue={sp.team ?? ""} className={FIELD}>
            <option value="">Any</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={sp.status ?? ""} className={FIELD}>
            <option value="">All open</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Topic" htmlFor="category">
          <select id="category" name="category" defaultValue={sp.category ?? ""} className={FIELD}>
            <option value="">Any</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <button className={BTN}>Filter</button>
      </form>

      <div className="mt-6">
        {rows.length === 0 ? (
          <Empty title="Nothing in this view." />
        ) : (
          <Table head={["Case", "Learner", "Team / owner", "Priority", "Status", "First response", "Resolution", ""]} minWidth="76rem">
            {rows.map((t) => (
              <tr key={t.id}>
                <Td>
                  <Link href={`/admin/support/${t.id}`} className="font-medium hover:underline">
                    {t.subject}
                  </Link>
                  <span className="text-data block text-[11px] text-subtle">
                    {t.reference} · {CATEGORY_LABEL[t.category]} · {t._count.messages} messages
                  </span>
                </Td>
                <Td>{t.requester.name}</Td>
                <Td>
                  {t.team?.name ?? "No team"}
                  <span className="block text-[12px] text-muted-foreground">{t.assignee?.name ?? "unassigned"}</span>
                </Td>
                <Td>
                  <Pill tone={t.priority === "URGENT" ? "red" : t.priority === "HIGH" ? "amber" : "grey"}>{t.priority.toLowerCase()}</Pill>
                  {t.isComplaint && <span className="ml-1"><Pill tone="red">complaint</Pill></span>}
                </Td>
                <Td>{STATUS_LABEL[t.status]}</Td>
                <Td>
                  <Due at={t.firstResponseDueAt} met={!!t.firstResponseAt} breached={t.firstResponseBreachedAt} now={now} />
                </Td>
                <Td>
                  <Due at={t.resolutionDueAt} met={!!t.resolvedAt} breached={t.resolutionBreachedAt} now={now} />
                </Td>
                <Td>
                  {!t.assigneeId && can(actor, "support.respond") && (
                    <ActionButton action={assignAction} fields={{ ticketId: t.id, assigneeId: actor.id }}>
                      Accept
                    </ActionButton>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
