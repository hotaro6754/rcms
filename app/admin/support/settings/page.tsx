import Link from "next/link";
import type { SupportCategory, SupportPriority } from "@prisma/client";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Checkbox, Field, FIELD, Panel, Stat, Table, Td } from "@/components/admin/kit";
import { CATEGORY_LABEL } from "@/lib/services/support/tickets";
import { slaFor, supportCalendar, supportMetrics } from "@/lib/services/support/routing";
import { usersWithPermission } from "@/lib/services/people/staff-lookup";
import { removeTeamMemberAction, saveCalendarAction, saveCategorySettingAction, saveSlaAction, saveTeamAction, setTeamMemberAction } from "@/lib/actions/support";

export const metadata = { title: "Support settings" };

const PRIORITIES: SupportPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const dur = (m: number | null) => (m === null ? "—" : m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`);

/** Support leads configure teams, routing, targets and hours here; changes apply to new cases. */
export default async function SupportSettings() {
  const actor = await requirePagePermission(["support.configure", "support.view_all"]);
  const editable = can(actor, "support.configure");
  const [teams, categories, responders, calendar, metrics, ...slas] = await Promise.all([
    prisma.supportTeam.findMany({ orderBy: { name: "asc" }, include: { members: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } } } }),
    prisma.supportCategorySetting.findMany(),
    usersWithPermission("support.respond"),
    supportCalendar(),
    supportMetrics(30),
    ...PRIORITIES.map((p) => slaFor(p)),
  ]);
  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <Link href="/admin/support" className="text-micro text-muted-foreground hover:text-foreground">
        ← Support queue
      </Link>
      <PageHead kicker="Support" title="Teams, routing and targets" lede="Routing is deterministic: the topic chooses the team; a team that assigns automatically gives the case to its least-loaded available member under their limit, otherwise it waits in the team queue. Changes apply to cases opened afterwards." />

      <section aria-labelledby="perf-h" className="mt-8">
        <h2 id="perf-h" className="text-[1.1rem] font-semibold">
          Last {metrics.days} days
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">From recorded timestamps, counted in support hours. These describe what happened; they are not a claim of SLA compliance.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Opened" value={metrics.created} />
          <Stat label="Open now" value={metrics.open} />
          <Stat label="Median first response" value={dur(metrics.medianFirstResponseMinutes)} />
          <Stat label="Median resolution" value={dur(metrics.medianResolutionMinutes)} />
          <Stat label="Reopen rate" value={metrics.reopenRate === null ? "—" : `${metrics.reopenRate}%`} note={`${metrics.resolvedCount} resolved`} />
          <Stat label="Target misses" value={Object.values(metrics.breaches).reduce((a, b) => a + b, 0)} note={Object.entries(metrics.breaches).map(([k, v]) => `${k}: ${v}`).join(" · ") || "none"} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Table head={["Team", "Open"]} minWidth="16rem">
            {metrics.backlogByTeam.map((b) => (
              <tr key={b.team}>
                <Td>{b.team}</Td>
                <Td>{b.open}</Td>
              </tr>
            ))}
          </Table>
          <Table head={["Owner", "Open"]} minWidth="16rem">
            {metrics.backlogByAgent.map((b) => (
              <tr key={b.agent}>
                <Td>{b.agent}</Td>
                <Td>{b.open}</Td>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      <section aria-labelledby="teams-h" className="mt-12">
        <h2 id="teams-h" className="text-[1.1rem] font-semibold">
          Teams
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          {teams.map((team) => (
            <Panel key={team.id} title={`${team.name}${team.active ? "" : " (inactive)"}`}>
              <ActionForm action={saveTeamAction} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1.5fr)]" success="Saved.">
                <input type="hidden" name="id" value={team.id} />
                <fieldset disabled={!editable} className="contents">
                  <Field label="Key" htmlFor={`k-${team.id}`}>
                    <input id={`k-${team.id}`} name="key" defaultValue={team.key} className={FIELD} />
                  </Field>
                  <Field label="Name" htmlFor={`n-${team.id}`}>
                    <input id={`n-${team.id}`} name="name" defaultValue={team.name} className={FIELD} />
                  </Field>
                  <Field label="Description" htmlFor={`d-${team.id}`}>
                    <input id={`d-${team.id}`} name="description" defaultValue={team.description ?? ""} className={FIELD} />
                  </Field>
                  <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
                    <Checkbox name="active" label="Active" defaultChecked={team.active} />
                    <Checkbox name="autoAssign" label="Assign new cases automatically" defaultChecked={team.autoAssign} />
                    {editable && <button className="rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Save team</button>}
                  </div>
                </fieldset>
              </ActionForm>
              <div className="mt-4 border-t border-border pt-4">
                <Table head={["Member", "Lead", "Available", "Case limit", ""]} minWidth="36rem">
                  {team.members.map((m) => (
                    <tr key={m.id}>
                      <Td>
                        {m.user.name}
                        <span className="block text-[11.5px] text-muted-foreground">{m.user.email}</span>
                      </Td>
                      <Td colSpan={3}>
                        <ActionForm action={setTeamMemberAction} className="flex flex-wrap items-center gap-3">
                          <input type="hidden" name="teamId" value={team.id} />
                          <input type="hidden" name="userId" value={m.userId} />
                          <fieldset disabled={!editable} className="contents">
                            <Checkbox name="isLead" label="Lead" defaultChecked={m.isLead} />
                            <Checkbox name="available" label="Available" defaultChecked={m.available} />
                            <input name="maxOpen" type="number" min={1} max={500} defaultValue={m.maxOpen} aria-label="Case limit" className={`${FIELD} w-20`} />
                            {editable && <button className="rounded-[3px] border border-input px-2 py-1 text-[12.5px]">Update</button>}
                          </fieldset>
                        </ActionForm>
                      </Td>
                      <Td>
                        {editable && (
                          <ActionButton action={removeTeamMemberAction} fields={{ memberId: m.id }} variant="danger" confirm={`Remove ${m.user.name} from ${team.name}?`}>
                            Remove
                          </ActionButton>
                        )}
                      </Td>
                    </tr>
                  ))}
                </Table>
                {editable && (
                  <ActionForm action={setTeamMemberAction} className="mt-3 flex flex-wrap items-end gap-2" resetOnSuccess>
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="hidden" name="available" value="true" />
                    <Field label="Add member" htmlFor={`add-${team.id}`}>
                      <select id={`add-${team.id}`} name="userId" required className={FIELD}>
                        <option value="">Choose…</option>
                        {responders
                          .filter((r) => !team.members.some((m) => m.userId === r.id))
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.email})
                            </option>
                          ))}
                      </select>
                    </Field>
                    <button className={BTN}>Add</button>
                  </ActionForm>
                )}
              </div>
            </Panel>
          ))}
          {editable && (
            <Panel title="New team">
              <ActionForm action={saveTeamAction} className="flex flex-wrap items-end gap-3" resetOnSuccess>
                <Field label="Key" htmlFor="nt-k">
                  <input id="nt-k" name="key" required className={FIELD} />
                </Field>
                <Field label="Name" htmlFor="nt-n">
                  <input id="nt-n" name="name" required className={FIELD} />
                </Field>
                <input type="hidden" name="active" value="true" />
                <input type="hidden" name="autoAssign" value="true" />
                <button className={BTN}>Create team</button>
              </ActionForm>
            </Panel>
          )}
        </div>
      </section>

      <section aria-labelledby="routing-h" className="mt-12">
        <h2 id="routing-h" className="text-[1.1rem] font-semibold">
          Topics and routing
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">The list of topics is fixed; their wording, visibility to learners, owning team and starting priority are yours to set. Privacy and security reports cannot be hidden.</p>
        <div className="mt-4">
          <Table head={["Topic", "Label shown to learners", "Team", "Starting priority", "Shown", ""]} minWidth="60rem">
            {(Object.keys(CATEGORY_LABEL) as SupportCategory[]).map((c) => {
              const s = categories.find((x) => x.category === c);
              const f = `cat-${c}`;
              return (
                <tr key={c}>
                  <Td>{CATEGORY_LABEL[c]}</Td>
                  <Td colSpan={5}>
                    <ActionForm action={saveCategorySettingAction} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_5rem_auto]">
                      <input type="hidden" name="category" value={c} />
                      <fieldset disabled={!editable} className="contents">
                        <input name="label" defaultValue={s?.label ?? ""} placeholder={CATEGORY_LABEL[c]} aria-label={`Label for ${CATEGORY_LABEL[c]}`} className={FIELD} />
                        <select name="teamId" defaultValue={s?.teamId ?? ""} aria-label={`Team for ${CATEGORY_LABEL[c]}`} className={FIELD}>
                          <option value="">Default team</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <select name="defaultPriority" defaultValue={s?.defaultPriority ?? "NORMAL"} aria-label={`Priority for ${CATEGORY_LABEL[c]}`} className={FIELD}>
                          {PRIORITIES.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                        <Checkbox name="active" label="Shown" defaultChecked={s?.active ?? true} />
                        {editable && (
                          <button id={f} className="rounded-[3px] border border-input px-2 py-1 text-[12.5px]">
                            Save
                          </button>
                        )}
                      </fieldset>
                    </ActionForm>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      </section>

      <section aria-labelledby="sla-h" className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <h2 id="sla-h" className="text-[1.1rem] font-semibold">
            Targets by priority
          </h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">Hours from opening. Breaches are recorded by the scheduled job, which also raises the case one priority step and tells the team leads.</p>
          <div className="mt-4 flex flex-col gap-2">
            {slas.map((p) => (
              <ActionForm key={p.priority} action={saveSlaAction} className="flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-border bg-card px-4 py-3" success="Saved.">
                <input type="hidden" name="priority" value={p.priority} />
                <fieldset disabled={!editable} className="contents">
                  <span className="w-20 pb-2.5 text-[13px] font-semibold">{p.priority}</span>
                  <Field label="First response (h)" htmlFor={`fr-${p.priority}`}>
                    <input id={`fr-${p.priority}`} name="firstResponseHours" type="number" step="0.25" min={0.25} defaultValue={p.firstResponseMinutes / 60} className={`${FIELD} w-28`} />
                  </Field>
                  <Field label="Resolution (h)" htmlFor={`rs-${p.priority}`}>
                    <input id={`rs-${p.priority}`} name="resolutionHours" type="number" step="0.25" min={0.25} defaultValue={p.resolutionMinutes / 60} className={`${FIELD} w-28`} />
                  </Field>
                  <div className="pb-2">
                    <Checkbox name="businessHours" label="Support hours only" defaultChecked={p.businessHours} />
                  </div>
                  {editable && <button className="mb-1 rounded-[3px] border border-input px-2 py-1 text-[12.5px]">Save</button>}
                </fieldset>
              </ActionForm>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-[1.1rem] font-semibold">Support hours</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">One daily window; public holidays are not modelled.</p>
          <ActionForm action={saveCalendarAction} className="mt-4 flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4" success="Saved.">
            <fieldset disabled={!editable} className="flex flex-col gap-3">
              <fieldset className="flex flex-wrap gap-3">
                <legend className="mb-1 text-micro font-medium">Working days</legend>
                {DAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1.5 text-[13px]">
                    <input type="checkbox" name="workDays" value={i} defaultChecked={calendar.workDays.includes(i)} className="h-4 w-4 accent-[var(--primary)]" />
                    {d}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-wrap gap-3">
                <Field label="Opens" htmlFor="cal-s">
                  <input id="cal-s" name="start" type="time" defaultValue={hm(calendar.startMinute)} className={FIELD} />
                </Field>
                <Field label="Closes" htmlFor="cal-e">
                  <input id="cal-e" name="end" type="time" defaultValue={hm(calendar.endMinute)} className={FIELD} />
                </Field>
                <Field label="UTC offset (minutes)" htmlFor="cal-o" hint="330 is India Standard Time.">
                  <input id="cal-o" name="utcOffsetMinutes" type="number" defaultValue={calendar.utcOffsetMinutes} className={`${FIELD} w-28`} />
                </Field>
              </div>
              {editable && <button className={`${BTN} w-fit`}>Save hours</button>}
            </fieldset>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
