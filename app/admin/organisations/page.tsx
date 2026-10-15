import Link from "next/link";
import { requirePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, Pill, Table, Td, when } from "@/components/admin/kit";
import { createOrganisationAction } from "@/lib/actions/admin";

export const metadata = { title: "Corporate accounts" };

export default async function OrganisationsPage() {
  await requirePermission("org.manage");
  const orgs = await prisma.organisation.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { members: true, groups: true, enrolments: true } } } });
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Subscribers" title="Corporate accounts" lede="Organisations buying seats for their teams: seats, members, groups, assigned courses and team progress." />
      <div className="mt-8">
        {orgs.length === 0 ? (
          <Empty title="No corporate accounts yet." />
        ) : (
          <Table head={["Organisation", "Seats used", "Groups", "Corporate enrolments", "Contract", "Status"]}>
            {orgs.map((o) => (
              <tr key={o.id}>
                <Td>
                  <Link href={`/admin/organisations/${o.id}`} className="font-medium hover:underline">
                    {o.name}
                  </Link>
                </Td>
                <Td className={o._count.members >= o.seats ? "text-warning" : ""}>
                  {o._count.members} / {o.seats}
                </Td>
                <Td>{o._count.groups}</Td>
                <Td>{o._count.enrolments}</Td>
                <Td>
                  {when(o.contractStart)} – {when(o.contractEnd)}
                </Td>
                <Td>
                  <Pill tone={o.active ? "green" : "grey"}>{o.active ? "active" : "inactive"}</Pill>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <ActionForm action={createOrganisationAction} className="mt-8 grid gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4 sm:grid-cols-4">
        <Field label="Organisation name" htmlFor="on" className="sm:col-span-2">
          <input id="on" name="name" required className={FIELD} />
        </Field>
        <Field label="Seats" htmlFor="os">
          <input id="os" name="seats" type="number" min="0" required defaultValue={10} className={FIELD} />
        </Field>
        <Field label="Billing email" htmlFor="ob">
          <input id="ob" name="billingEmail" type="email" className={FIELD} />
        </Field>
        <button className={`${BTN} w-fit`}>Create account</button>
      </ActionForm>
    </div>
  );
}
