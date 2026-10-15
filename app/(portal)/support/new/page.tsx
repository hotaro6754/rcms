import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, TEXTAREA } from "@/components/admin/kit";
import { openTicketAction } from "@/lib/actions/support";
import { CATEGORY_LABEL } from "@/lib/services/support/tickets";
import { PHI_WARNING } from "@/components/support/Thread";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "New support conversation" };

export default async function NewTicket({ searchParams }: { searchParams: Promise<{ category?: string; subject?: string }> }) {
  await requireActor();
  const sp = await searchParams;
  const hours = await getSetting("support.hours");
  return (
    <div className="mx-auto max-w-[760px] px-6 py-12">
      <PageHead kicker="Support" title="Start a conversation" lede={`Welcome to RCMS Operations Academy Support. Support hours: ${hours}.`} />
      <p role="note" className="mt-6 rounded-[3px] border border-warning/40 bg-warning-bg px-4 py-3 text-[13.5px] text-warning">
        {PHI_WARNING}
      </p>
      <ActionForm action={openTicketAction} className="mt-6 flex flex-col gap-4">
        <Field label="Topic" htmlFor="category">
          <select id="category" name="category" defaultValue={sp.category && sp.category in CATEGORY_LABEL ? sp.category : "OTHER"} className={FIELD}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subject" htmlFor="subject">
          <input id="subject" name="subject" required minLength={4} defaultValue={sp.subject} className={FIELD} />
        </Field>
        <Field label="Message" htmlFor="body">
          <textarea id="body" name="body" required minLength={10} rows={6} className={TEXTAREA} />
        </Field>
        <fieldset className="flex flex-col gap-2 text-[14px]">
          <legend className="text-micro font-medium">How would you like to talk?</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="channel" value="CHAT" defaultChecked /> Chat — the page updates as we reply
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="channel" value="TICKET" /> Message — we reply in the thread and notify you
          </label>
        </fieldset>
        <button className={`${BTN} w-fit`}>Send</button>
      </ActionForm>
    </div>
  );
}
