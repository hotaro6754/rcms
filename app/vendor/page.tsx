import Link from "next/link";
import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { Empty, inr, Panel, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { portalOverview } from "@/lib/services/vendors/vendors";

export const metadata = { title: "Overview" };

export default async function VendorHome() {
  const { vendor, deliverables, invoices, documents } = await portalOverview(await requireActor());
  const open = deliverables.filter((d) => !["ACCEPTED", "REJECTED", "CANCELLED"].includes(d.status));
  const overdue = open.filter((d) => d.dueDate && d.dueDate < new Date());
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker={`${vendor.code} · ${vendor.status.replace(/_/g, " ").toLowerCase()}`} title={vendor.tradingName ?? vendor.legalName} lede="Your assigned work, submissions and invoices. Anything you upload is reviewed by RCMExcel before it reaches learners." />
      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Open deliverables", open.length],
          ["Overdue", overdue.length],
          ["Invoices awaiting payment", invoices.filter((i) => ["SUBMITTED", "VALIDATED", "APPROVED"].includes(i.status)).length],
          ["Contract ends", when(vendor.contractEnd)],
        ].map(([l, v]) => (
          <div key={String(l)} className="border-t-2 border-foreground pt-2">
            <dt className="text-data text-[10.5px] tracking-[0.1em] text-subtle">{String(l).toUpperCase()}</dt>
            <dd className="font-serif-display mt-1 text-[1.6rem] leading-none">{v}</dd>
          </div>
        ))}
      </dl>
      <section className="mt-10">
        <h2 className="label-caps mb-3">Deliverables</h2>
        {deliverables.length === 0 ? (
          <Empty title="Nothing assigned yet." />
        ) : (
          <Table head={["Deliverable", "Course", "Due", "Fee", "Status"]}>
            {deliverables.map((d) => (
              <tr key={d.id}>
                <Td>
                  <Link href={`/vendor/deliverables/${d.id}`} className="font-medium hover:underline">
                    {d.title}
                  </Link>
                </Td>
                <Td>{d.program?.name ?? "—"}</Td>
                <Td className={d.dueDate && d.dueDate < new Date() && open.includes(d) ? "text-danger" : ""}>{when(d.dueDate)}</Td>
                <Td>{inr(d.fee)}</Td>
                <Td>
                  <StatusPill status={d.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Panel title="Contracts and documents">
          <ul className="text-[13.5px]">
            {documents.length === 0 && <li className="text-muted-foreground">No documents shared with you.</li>}
            {documents.map((d) => (
              <li key={d.id} className="py-1">
                <a href={`/api/vendor-files/document/${d.id}`} className="underline">
                  {d.title}
                </a>{" "}
                <span className="text-micro text-muted-foreground">
                  {d.kind}
                  {d.expiresAt ? ` · expires ${when(d.expiresAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Recent invoices">
          <ul className="text-[13.5px]">
            {invoices.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center gap-2 py-1">
                {i.number} · {inr(i.amount)} <StatusPill status={i.status} />
              </li>
            ))}
            {invoices.length === 0 && <li className="text-muted-foreground">No invoices yet.</li>}
          </ul>
          <Link href="/vendor/invoices" className="mt-2 inline-block text-micro underline">
            All invoices
          </Link>
        </Panel>
      </div>
    </div>
  );
}
