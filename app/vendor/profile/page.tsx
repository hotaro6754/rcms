import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, Panel, TEXTAREA } from "@/components/admin/kit";
import { portalProfileAction, vendorPayoutRequestAction } from "@/lib/actions/vendors";
import { portalOverview } from "@/lib/services/vendors/vendors";

export const metadata = { title: "Profile" };

export default async function VendorProfile() {
  const { vendor } = await portalOverview(await requireActor());
  return (
    <div className="mx-auto max-w-[900px] px-6 py-10">
      <PageHead kicker={vendor.code} title="Profile" lede="Contact details you can keep current yourself. Legal name, contract terms and access are managed by your vendor manager." />
      <div className="mt-8 grid gap-6">
        <Panel title="Contact">
          <ActionForm action={portalProfileAction} className="grid gap-3 sm:grid-cols-2" success="Saved.">
            <Field label="Contact name" htmlFor="cn">
              <input id="cn" name="contactName" defaultValue={vendor.contactName ?? ""} className={FIELD} />
            </Field>
            <Field label="Contact email" htmlFor="ce">
              <input id="ce" name="contactEmail" type="email" defaultValue={vendor.contactEmail ?? ""} className={FIELD} />
            </Field>
            <Field label="Services" htmlFor="sv" className="sm:col-span-2">
              <textarea id="sv" name="services" rows={3} defaultValue={vendor.services ?? ""} className={TEXTAREA} />
            </Field>
            <button className={`${BTN} w-fit`}>Save</button>
          </ActionForm>
        </Panel>
        <Panel title="Payout details">
          <p className="text-[13.5px]">{vendor.payoutLast4 ? `Payments go to the account ending ${vendor.payoutLast4}.` : "No payout account on file yet."}</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            A change is a request, not an edit: finance verifies it with you on a number already on file, and a different finance reviewer approves it before any payment uses it. Never send full account numbers by email or chat.
          </p>
          <ActionForm action={vendorPayoutRequestAction} className="mt-3 grid gap-2 sm:grid-cols-2" resetOnSuccess success="Request sent. Finance will contact you to verify it.">
            <input name="payoutReference" required placeholder="Payout reference from your bank or provider" aria-label="Payout reference" className={`${FIELD} sm:col-span-2`} />
            <input name="payoutLast4" required pattern="\d{4}" placeholder="Last 4 digits of the account" aria-label="Last four digits" className={FIELD} />
            <input name="taxIdLast4" placeholder="Last 4 of tax ID (optional)" aria-label="Tax ID last four" className={FIELD} />
            <input name="reason" required placeholder="Why the change" aria-label="Reason" className={`${FIELD} sm:col-span-2`} />
            <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Request change</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
