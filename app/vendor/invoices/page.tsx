import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, inr, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { submitInvoiceAction } from "@/lib/actions/vendors";
import { portalOverview } from "@/lib/services/vendors/vendors";

export const metadata = { title: "Invoices" };

export default async function VendorInvoices() {
  const { invoices, deliverables } = await portalOverview(await requireActor());
  const billable = deliverables.filter((d) => d.status === "ACCEPTED");
  return (
    <div className="mx-auto max-w-[1000px] px-6 py-10">
      <PageHead kicker="Billing" title="Invoices" lede="Invoices are validated by finance, approved by a different person, then paid by bank transfer. You can follow each step here." />
      <div className="mt-8">
        {invoices.length === 0 ? (
          <Empty title="No invoices yet." />
        ) : (
          <Table head={["Invoice", "For", "Amount", "Submitted", "Status", "Paid"]}>
            {invoices.map((i) => (
              <tr key={i.id}>
                <Td className="text-data text-[12.5px]">{i.number}</Td>
                <Td>{i.deliverable?.title ?? "General"}</Td>
                <Td>{inr(i.amount)}</Td>
                <Td>{when(i.createdAt)}</Td>
                <Td>
                  <StatusPill status={i.status} />
                  {i.rejectReason && <span className="block text-[12px] text-danger">{i.rejectReason}</span>}
                </Td>
                <Td>{when(i.paidAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <ActionForm action={submitInvoiceAction} className="mt-8 grid gap-3 rounded-[var(--radius)] border border-border bg-card px-5 py-4 sm:grid-cols-2" resetOnSuccess success="Invoice submitted.">
        <Field label="Your invoice number" htmlFor="num">
          <input id="num" name="number" required className={FIELD} />
        </Field>
        <Field label="Amount (₹)" htmlFor="amt">
          <input id="amt" name="amount" type="number" min="1" step="0.01" required className={FIELD} />
        </Field>
        <Field label="For deliverable" htmlFor="del" className="sm:col-span-2">
          <select id="del" name="deliverableId" className={FIELD}>
            <option value="">General / not tied to one deliverable</option>
            {billable.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({inr(d.fee)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note" htmlFor="note" className="sm:col-span-2">
          <input id="note" name="note" className={FIELD} />
        </Field>
        <button className={`${BTN} w-fit`}>Submit invoice</button>
      </ActionForm>
    </div>
  );
}
