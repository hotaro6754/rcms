import Link from "next/link";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, Pill, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { createVendorAction } from "@/lib/actions/vendors";
import { VENDOR_TYPES } from "@/lib/services/vendors/vendors";

export const metadata = { title: "Vendors" };

export default async function VendorsPage() {
  const actor = await requirePagePermission("vendor.view");
  const vendors = await prisma.vendor.findMany({ orderBy: [{ status: "asc" }, { legalName: "asc" }], include: { _count: { select: { deliverables: true, members: true } } } });
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Vendor management" title="Vendor directory" lede="Content authors, subject-matter experts, instructors, production and technology providers. Vendors see only their own records, through the vendor portal." />
      <div className="mt-8">
        {vendors.length === 0 ? (
          <Empty title="No vendors yet." />
        ) : (
          <Table head={["Vendor", "Type", "Status", "Risk", "Data access", "Contract ends", "Deliverables"]}>
            {vendors.map((v) => (
              <tr key={v.id}>
                <Td>
                  <Link href={`/admin/vendors/${v.id}`} className="font-medium hover:underline">
                    {v.legalName}
                  </Link>
                  <span className="text-data block text-[11px] text-subtle">{v.code}</span>
                </Td>
                <Td>{v.type.replace(/_/g, " ").toLowerCase()}</Td>
                <Td>
                  <StatusPill status={v.status} />
                </Td>
                <Td>
                  <Pill tone={v.riskRating === "high" ? "red" : v.riskRating === "medium" ? "amber" : "green"}>{v.riskRating}</Pill>
                </Td>
                <Td>{v.dataAccessClass.replace(/_/g, " ")}</Td>
                <Td className={v.contractEnd && v.contractEnd < new Date(Date.now() + 60 * 86400_000) ? "text-warning" : ""}>{when(v.contractEnd)}</Td>
                <Td>{v._count.deliverables}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {can(actor, "vendor.manage") && (
        <ActionForm action={createVendorAction} className="mt-8 grid gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4 sm:grid-cols-4" resetOnSuccess>
          <Field label="Legal name" htmlFor="v-legal" className="sm:col-span-2">
            <input id="v-legal" name="legalName" required className={FIELD} />
          </Field>
          <Field label="Type" htmlFor="v-type">
            <select id="v-type" name="type" className={FIELD}>
              {VENDOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact email" htmlFor="v-email">
            <input id="v-email" name="contactEmail" type="email" className={FIELD} />
          </Field>
          <button className={`${BTN} w-fit`}>Propose vendor</button>
        </ActionForm>
      )}
    </div>
  );
}
