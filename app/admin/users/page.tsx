import { requireAnyPermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, Panel, Pill, Table, Td, when } from "@/components/admin/kit";
import { requestRoleChangeAction } from "@/lib/actions/admin";
import { effectiveRoles, ROLE_LABEL, ROLE_PERMISSIONS, STAFF_ROLES, canRequestRole } from "@/lib/permissions";

export const metadata = { title: "Users and roles" };

export default async function UsersPage() {
  const actor = await requireAnyPermission(["users.view", "roles.request"]);
  const staff = await prisma.user.findMany({
    where: { OR: [{ staffRoles: { some: {} } }, { role: { in: ["OWNER", "ADMIN", "TRAINER"] } }] },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, status: true, twoFactorEnabled: true, lastLoginAt: true, staffRoles: { select: { role: true, createdAt: true } } },
  });
  const vendors = await prisma.user.count({ where: { role: "VENDOR" } });
  const pending = await prisma.approvalRequest.findMany({ where: { kind: "ROLE_CHANGE", status: "PENDING" }, select: { id: true, summary: true } });
  const requestable = STAFF_ROLES.filter((r) => canRequestRole(actor.staffRoles, r));

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Administration" title="Users and roles" lede={`${staff.length} staff accounts and ${vendors} vendor contacts. Role changes are requested here and take effect only after a second administrator approves them. There is no public route to create an administrator.`} />
      <div className="mt-8">
        <Table head={["Person", "Roles", "Status", "MFA", "Last sign-in"]} minWidth="56rem">
          {staff.map((u) => {
            const roles = effectiveRoles(u.role, u.staffRoles.map((r) => r.role));
            return (
              <tr key={u.id}>
                <Td>
                  {u.name}
                  <span className="block text-[12px] text-muted-foreground">{u.email}</span>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    {roles.map((r) => (
                      <Pill key={r} tone={r === "SUPER_ADMIN" ? "red" : "blue"}>
                        {ROLE_LABEL[r]}
                      </Pill>
                    ))}
                    {u.role !== "STUDENT" && <span className="text-[11px] text-muted-foreground">legacy: {u.role.toLowerCase()}</span>}
                  </span>
                </Td>
                <Td>
                  <Pill tone={u.status === "ACTIVE" ? "green" : "amber"}>{u.status.toLowerCase()}</Pill>
                </Td>
                <Td>{u.twoFactorEnabled ? <Pill tone="green">on</Pill> : <Pill tone="red">off</Pill>}</Td>
                <Td>{when(u.lastLoginAt, true)}</Td>
              </tr>
            );
          })}
        </Table>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {can(actor, "roles.request") && (
          <Panel title="Request a role change">
            <ActionForm action={requestRoleChangeAction} className="flex flex-col gap-3" resetOnSuccess success="Requested. Another administrator with approval authority must approve it.">
              <Field label="Account email" htmlFor="re">
                <input id="re" name="email" type="email" required className={FIELD} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Change" htmlFor="ra">
                  <select id="ra" name="action" className={FIELD}>
                    <option value="grant">Grant</option>
                    <option value="revoke">Remove</option>
                  </select>
                </Field>
                <Field label="Role" htmlFor="rr">
                  <select id="rr" name="role" className={FIELD}>
                    {requestable.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Reason" htmlFor="rz">
                <input id="rz" name="reason" required placeholder="Business need and expected duration" className={FIELD} />
              </Field>
              <button className={`${BTN} w-fit`}>Request</button>
            </ActionForm>
            {pending.length > 0 && (
              <ul className="mt-4 text-[12.5px] text-warning">
                {pending.map((p) => (
                  <li key={p.id}>Pending: {p.summary}</li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        <Panel title="What each role can do">
          <ul className="flex flex-col gap-2 text-[12.5px]">
            {STAFF_ROLES.map((r) => (
              <li key={r}>
                <span className="font-medium">{ROLE_LABEL[r]}</span>{" "}
                <span className="text-muted-foreground">{r === "SUPER_ADMIN" ? "every permission" : [...ROLE_PERMISSIONS[r]].join(", ")}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
