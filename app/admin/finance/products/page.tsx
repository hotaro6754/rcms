import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, inr, Pill, Table, Td } from "@/components/admin/kit";
import { createProductAction, productActiveAction, requestPriceChangeAction } from "@/lib/actions/commerce";

export const metadata = { title: "Plans and pricing" };

/**
 * Courses, bundles and subscription plans. New products start off sale; putting one on sale
 * and every later price change need the Academy Director's approval with an effective date.
 */
export default async function ProductsPage() {
  const actor = await requirePagePermission("finance.view");
  const [products, courses, pending] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }], include: { program: { select: { name: true } }, _count: { select: { orders: true } } } }),
    prisma.program.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.approvalRequest.findMany({ where: { kind: "PRICE_CHANGE", status: { in: ["PENDING", "APPROVED"] } }, select: { targetId: true, summary: true, status: true } }),
  ]);
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Payments and finance" title="Plans and pricing" lede="Prices are in rupees and include tax where a tax rate is set. Changing a price creates an approval request; it takes effect on the date you give once approved." />
      <div className="mt-8">
        <Table head={["Product", "Kind", "Price", "Terms", "On sale", "Change price"]} minWidth="72rem">
          {products.map((p) => {
            const change = pending.find((c) => c.targetId === p.id);
            return (
              <tr key={p.id}>
                <Td>
                  {p.name}
                  <span className="text-data block text-[11px] text-subtle">{p.sku}</span>
                  {p.program && <span className="block text-[12px] text-muted-foreground">{p.program.name}</span>}
                  {p.includes.length > 0 && <span className="block text-[12px] text-muted-foreground">Includes: {p.includes.join(", ")}</span>}
                </Td>
                <Td>{p.kind.toLowerCase()}</Td>
                <Td>
                  {inr(p.amount)}
                  {p.taxPercent > 0 && <span className="block text-[12px] text-muted-foreground">incl. {p.taxPercent}% tax</span>}
                </Td>
                <Td className="text-[12px] text-muted-foreground">
                  {p.interval ? `per ${p.interval.toLowerCase()}` : "one-time"}
                  {p.trialDays ? ` · ${p.trialDays}-day trial` : ""}
                  {p.graceDays ? ` · ${p.graceDays}-day grace` : ""}
                  <span className="block">{p._count.orders} orders</span>
                </Td>
                <Td>
                  {p.active ? <Pill tone="green">on sale</Pill> : <Pill>off sale</Pill>}
                  <div className="mt-1">
                    {!p.active && can(actor, "price.approve") && (
                      <ActionButton action={productActiveAction} fields={{ id: p.id, active: "true" }} confirm={`Put ${p.name} on sale at ${inr(p.amount)}?`}>
                        Put on sale
                      </ActionButton>
                    )}
                    {p.active && can(actor, "product.manage") && (
                      <ActionButton action={productActiveAction} fields={{ id: p.id, active: "false" }} variant="ghost" confirm="Take this off sale? Existing access is not affected.">
                        Take off sale
                      </ActionButton>
                    )}
                  </div>
                </Td>
                <Td>
                  {change ? (
                    <span className="text-[12px] text-warning">
                      {change.status === "PENDING" ? "Awaiting approval" : "Approved, scheduled"}: {change.summary}
                    </span>
                  ) : can(actor, "price.request") ? (
                    <ActionForm action={requestPriceChangeAction} className="flex flex-col gap-1.5" success="Requested. An Academy Director will decide.">
                      <input type="hidden" name="id" value={p.id} />
                      <span className="flex gap-1.5">
                        <input name="price" type="number" step="1" min="0" required placeholder="New ₹" aria-label="New price in rupees" className="min-h-8 w-24 rounded-[3px] border border-input bg-card px-2 text-[12.5px]" />
                        <input name="effectiveFrom" type="date" required aria-label="Effective from" className="min-h-8 rounded-[3px] border border-input bg-card px-2 text-[12.5px]" />
                      </span>
                      <input name="reason" required minLength={5} placeholder="Reason" aria-label="Reason for the price change" className="min-h-8 rounded-[3px] border border-input bg-card px-2 text-[12.5px]" />
                      <button className="w-fit rounded-[3px] border border-input px-2 py-1 text-[12.5px]">Request change</button>
                    </ActionForm>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </Table>
      </div>
      {can(actor, "product.manage") && (
        <details className="mt-8 rounded-[var(--radius)] border border-border bg-card px-5 py-4">
          <summary className="cursor-pointer text-[14px] font-semibold">Add a product</summary>
          <ActionForm action={createProductAction} className="mt-4 grid gap-3 sm:grid-cols-3" resetOnSuccess success="Created off sale. It needs approval to go on sale.">
            <Field label="Name" htmlFor="p-name" className="sm:col-span-2">
              <input id="p-name" name="name" required className={FIELD} />
            </Field>
            <Field label="Kind" htmlFor="p-kind">
              <select id="p-kind" name="kind" className={FIELD}>
                <option value="PROGRAM">Single course</option>
                <option value="SUBSCRIPTION">Subscription</option>
                <option value="TRACK">Level bundle</option>
              </select>
            </Field>
            <Field label="Course (single course)" htmlFor="p-course">
              <select id="p-course" name="programId" className={FIELD}>
                <option value="">—</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Billing interval (subscription)" htmlFor="p-int">
              <select id="p-int" name="interval" className={FIELD}>
                <option value="">—</option>
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Annual</option>
              </select>
            </Field>
            <Field label="Price (₹)" htmlFor="p-price">
              <input id="p-price" name="price" type="number" min="0" required className={FIELD} />
            </Field>
            <Field label="Grace days" htmlFor="p-grace">
              <input id="p-grace" name="graceDays" type="number" min="0" defaultValue={7} className={FIELD} />
            </Field>
            <Field label="Tax % included" htmlFor="p-tax" hint="Confirm GST treatment with your accountant.">
              <input id="p-tax" name="taxPercent" type="number" min="0" max="28" defaultValue={0} className={FIELD} />
            </Field>
            <div className="flex items-end">
              <button className={BTN}>Create</button>
            </div>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
