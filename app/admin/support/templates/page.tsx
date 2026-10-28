import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Empty, Field, FIELD, Pill, TEXTAREA } from "@/components/admin/kit";
import { approveTemplateAction, saveTemplateAction } from "@/lib/actions/support";
import { CATEGORY_LABEL } from "@/lib/services/support/tickets";

export const metadata = { title: "Approved responses" };

/** The standard response library. Agents can insert only approved responses; edits need re-approval. */
export default async function TemplatesPage() {
  const actor = await requirePagePermission(["support.respond", "support.templates.manage"]);
  const templates = await prisma.responseTemplate.findMany({ where: { archivedAt: null }, orderBy: [{ approved: "asc" }, { title: "asc" }] });
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead kicker="Chat and support" title="Approved responses" lede="Standard answers for common questions. They must not state policy RCMExcel has not adopted, or give legal, coding, clinical or payer-specific decisions." />
      <div className="mt-8 flex flex-col gap-4">
        {templates.length === 0 && <Empty title="No responses yet." />}
        {templates.map((t) => (
          <section key={t.id} className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[14.5px] font-semibold">{t.title}</h2>
              {t.approved ? <Pill tone="green">approved</Pill> : <Pill tone="amber">awaiting approval</Pill>}
              {t.category && <Pill>{CATEGORY_LABEL[t.category]}</Pill>}
            </div>
            <p className="mt-2 whitespace-pre-line text-[13.5px]">{t.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!t.approved && can(actor, "support.templates.approve") && (
                <ActionButton action={approveTemplateAction} fields={{ id: t.id, approve: "true" }}>
                  Approve
                </ActionButton>
              )}
              {can(actor, "support.templates.approve") && (
                <ActionButton action={approveTemplateAction} fields={{ id: t.id, approve: "false" }} variant="ghost" confirm="Retire this response?">
                  Retire
                </ActionButton>
              )}
            </div>
            {can(actor, "support.templates.manage") && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[12.5px] underline">Edit</summary>
                <ActionForm action={saveTemplateAction} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="id" value={t.id} />
                  <input name="title" defaultValue={t.title} aria-label="Title" className={FIELD} />
                  <textarea name="body" defaultValue={t.body} rows={4} aria-label="Body" className={TEXTAREA} />
                  <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Save (needs re-approval)</button>
                </ActionForm>
              </details>
            )}
          </section>
        ))}
      </div>
      {can(actor, "support.templates.manage") && (
        <ActionForm action={saveTemplateAction} className="mt-8 grid gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4" resetOnSuccess success="Saved; it needs approval before agents can use it.">
          <Field label="Title" htmlFor="t-title">
            <input id="t-title" name="title" required className={FIELD} />
          </Field>
          <Field label="Topic" htmlFor="t-cat">
            <select id="t-cat" name="category" className={FIELD}>
              <option value="">Any</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Response" htmlFor="t-body">
            <textarea id="t-body" name="body" required rows={4} className={TEXTAREA} />
          </Field>
          <button className={`${BTN} w-fit`}>Add response</button>
        </ActionForm>
      )}
    </div>
  );
}
