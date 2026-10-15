import Link from "next/link";
import { requirePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Checkbox, dateInput, Field, FIELD, Panel, Pill, TEXTAREA, when } from "@/components/admin/kit";
import { addMemberAction, assignGroupCourseAction, createGroupAction, deleteGroupAction, groupMembersAction, organisationActiveAction, removeMemberAction, unassignGroupCourseAction, updateOrganisationAction } from "@/lib/actions/admin";
import { inviteAction } from "@/lib/actions/subscribers";
import { teamReport } from "@/lib/services/people/corporate";
import { TeamTable } from "@/components/portal/TeamTable";

export const metadata = { title: "Corporate account" };

export default async function OrganisationPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("org.manage");
  const { id } = await params;
  const { org, rows } = await teamReport(actor, id);
  const courses = await prisma.program.findMany({ where: { publishedVersionId: { not: null }, status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href="/admin/organisations" className="text-micro text-muted-foreground hover:text-foreground">
        ← Corporate accounts
      </Link>
      <PageHead kicker={`${org.members.length} of ${org.seats} seats used`} title={org.name} lede={<Pill tone={org.active ? "green" : "grey"}>{org.active ? "active" : "inactive"}</Pill>} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Team progress">
            <TeamTable rows={rows} />
            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              {org.members.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  {m.user.name} {m.isManager && <Pill tone="blue">manager</Pill>}
                  <ActionButton action={addMemberAction} fields={{ orgId: org.id, email: m.user.email, isManager: m.isManager ? "" : "true" }}>
                    {m.isManager ? "Remove manager rights" : "Make manager"}
                  </ActionButton>
                  <ActionButton action={removeMemberAction} fields={{ id: m.id, orgId: org.id }} variant="danger" confirm={`Remove ${m.user.name}'s seat? Their corporate enrolments end.`}>
                    Remove seat
                  </ActionButton>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Groups and assigned courses">
            <div className="flex flex-col gap-5">
              {org.groups.length === 0 && <p className="text-[13px] text-muted-foreground">No groups. Create one to assign courses to several people at once.</p>}
              {org.groups.map((g) => (
                <div key={g.id} className="border-l-2 border-border pl-4">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium">
                    {g.name}
                    <span className="text-micro font-normal text-muted-foreground">{g.members.length} people</span>
                    <ActionButton action={deleteGroupAction} fields={{ id: g.id, orgId: org.id }} variant="ghost" confirm="Delete this group? Enrolments already granted stay.">
                      Delete group
                    </ActionButton>
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {g.courses.map((c) => (
                      <li key={c.id} className="flex items-center gap-1 rounded-[3px] bg-secondary px-2 py-0.5 text-[12px]">
                        {c.program.name}
                        <ActionButton action={unassignGroupCourseAction} fields={{ id: g.id, programId: c.programId, orgId: org.id }} variant="ghost" title={`Unassign ${c.program.name}`} size="icon" className="h-5 w-5">
                          ×
                        </ActionButton>
                      </li>
                    ))}
                  </ul>
                  <ActionForm action={assignGroupCourseAction} className="mt-2 flex flex-wrap gap-1.5" success="Assigned; members enrolled.">
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="orgId" value={org.id} />
                    <select name="programId" aria-label="Course to assign" className={`${FIELD} w-auto`}>
                      {courses
                        .filter((c) => !g.courses.some((gc) => gc.programId === c.id))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <button className={BTN_OUTLINE}>Assign course</button>
                  </ActionForm>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-[12.5px] underline">Members</summary>
                    <ActionForm action={groupMembersAction} className="mt-2 flex flex-col gap-1" success="Saved.">
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="orgId" value={org.id} />
                      {org.members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-[13px]">
                          <input type="checkbox" name="memberId" value={m.id} defaultChecked={g.members.some((gm) => gm.memberId === m.id)} />
                          {m.user.name}
                        </label>
                      ))}
                      <button className={`${BTN_OUTLINE} mt-1 w-fit`}>Save members</button>
                    </ActionForm>
                  </details>
                </div>
              ))}
              <ActionForm action={createGroupAction} className="flex gap-1.5" resetOnSuccess>
                <input type="hidden" name="orgId" value={org.id} />
                <input name="name" required placeholder="New group, e.g. AR team" aria-label="Group name" className={FIELD} />
                <button className={`${BTN_OUTLINE} whitespace-nowrap`}>Create group</button>
              </ActionForm>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Add people">
            <ActionForm action={inviteAction} className="flex flex-col gap-2" resetOnSuccess success="Invitations sent.">
              <input type="hidden" name="orgId" value={org.id} />
              <textarea name="emails" rows={3} required placeholder="Email addresses, one per line or comma-separated" aria-label="Emails to invite" className={TEXTAREA} />
              <button className={`${BTN} w-fit`}>Send invitations</button>
            </ActionForm>
            <ActionForm action={addMemberAction} className="mt-4 flex flex-col gap-2 border-t border-border pt-4" resetOnSuccess success="Added.">
              <input type="hidden" name="orgId" value={org.id} />
              <input name="email" type="email" required placeholder="Existing account email" aria-label="Existing account email" className={FIELD} />
              <Checkbox name="isManager" label="Corporate manager (sees team progress)" />
              <button className={`${BTN_OUTLINE} w-fit`}>Add existing account</button>
            </ActionForm>
            {org.invitations.length > 0 && (
              <ul className="mt-3 text-[12px] text-muted-foreground">
                {org.invitations.map((i) => (
                  <li key={i.id}>
                    Invited {i.email} · expires {when(i.expiresAt)}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Account">
            <ActionForm action={updateOrganisationAction} className="flex flex-col gap-2.5" success="Saved.">
              <input type="hidden" name="id" value={org.id} />
              <Field label="Name" htmlFor="n">
                <input id="n" name="name" defaultValue={org.name} className={FIELD} />
              </Field>
              <Field label="Seats" htmlFor="s">
                <input id="s" name="seats" type="number" min="0" defaultValue={org.seats} className={FIELD} />
              </Field>
              <Field label="Billing email" htmlFor="b">
                <input id="b" name="billingEmail" defaultValue={org.billingEmail ?? ""} className={FIELD} />
              </Field>
              <Field label="GSTIN" htmlFor="g">
                <input id="g" name="gstin" defaultValue={org.gstin ?? ""} className={FIELD} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Contract start" htmlFor="cs">
                  <input id="cs" name="contractStart" type="date" defaultValue={dateInput(org.contractStart)} className={FIELD} />
                </Field>
                <Field label="Contract end" htmlFor="ce">
                  <input id="ce" name="contractEnd" type="date" defaultValue={dateInput(org.contractEnd)} className={FIELD} />
                </Field>
              </div>
              <button className={`${BTN} w-fit`}>Save</button>
            </ActionForm>
            <div className="mt-3">
              <ActionButton action={organisationActiveAction} fields={{ id: org.id, active: org.active ? "" : "true" }} confirm={org.active ? "Mark this account inactive? New course assignments stop." : undefined}>
                {org.active ? "Mark inactive" : "Reactivate"}
              </ActionButton>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
