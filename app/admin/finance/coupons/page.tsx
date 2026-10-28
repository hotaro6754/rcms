import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, inr, Pill, Table, Td, when } from "@/components/admin/kit";
import { couponActiveAction, createCouponAction } from "@/lib/actions/commerce";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const actor = await requirePagePermission("finance.view");
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Payments and finance" title="Discounts and coupons" lede="Applied at checkout; redemptions are counted when a payment is verified." />
      <div className="mt-8">
        {coupons.length === 0 ? (
          <Empty title="No coupons." />
        ) : (
          <Table head={["Code", "Discount", "Used", "Expires", "Status", ""]}>
            {coupons.map((c) => (
              <tr key={c.id}>
                <Td className="text-data">{c.code}</Td>
                <Td>{c.percentOff ? `${c.percentOff}%` : inr(c.amountOff)}</Td>
                <Td>
                  {c.redeemed}
                  {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                </Td>
                <Td>{when(c.expiresAt)}</Td>
                <Td>{c.active ? <Pill tone="green">active</Pill> : <Pill>inactive</Pill>}</Td>
                <Td>
                  {can(actor, "coupon.manage") && (
                    <ActionButton action={couponActiveAction} fields={{ id: c.id, active: c.active ? "false" : "true" }} variant="ghost">
                      {c.active ? "Deactivate" : "Activate"}
                    </ActionButton>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {can(actor, "coupon.manage") && (
        <ActionForm action={createCouponAction} className="mt-8 grid gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4 sm:grid-cols-5" resetOnSuccess success="Coupon created.">
          <Field label="Code" htmlFor="c-code">
            <input id="c-code" name="code" required className={FIELD} placeholder="SCHOLAR2026" />
          </Field>
          <Field label="% off" htmlFor="c-pct">
            <input id="c-pct" name="percentOff" type="number" min="1" max="100" className={FIELD} />
          </Field>
          <Field label="or ₹ off" htmlFor="c-amt">
            <input id="c-amt" name="amountOff" type="number" min="1" className={FIELD} />
          </Field>
          <Field label="Max uses" htmlFor="c-max">
            <input id="c-max" name="maxRedemptions" type="number" min="1" className={FIELD} />
          </Field>
          <Field label="Expires" htmlFor="c-exp">
            <input id="c-exp" name="expiresAt" type="date" className={FIELD} />
          </Field>
          <button className={`${BTN} w-fit`}>Create coupon</button>
        </ActionForm>
      )}
    </div>
  );
}
