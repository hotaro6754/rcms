import { requireActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, TEXTAREA } from "@/components/admin/kit";
import { openTicketAction } from "@/lib/actions/support";
import { categoryOptions } from "@/lib/services/support/tickets";
import { PHI_WARNING } from "@/components/support/Thread";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "New support conversation" };

/**
 * Raising a case. Pages link here with context (?course=slug&from=/path&ref=…&category=…), which
 * is stored with the case so the team does not have to ask where the learner was.
 */
export default async function NewTicket({ searchParams }: { searchParams: Promise<{ category?: string; subject?: string; course?: string; from?: string; ref?: string; source?: string }> }) {
  const actor = await requireActor();
  const sp = await searchParams;
  const [hours, categories, enrolments] = await Promise.all([
    getSetting("support.hours"),
    categoryOptions(),
    prisma.enrolment.findMany({ where: { userId: actor.id }, select: { program: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  const courses = enrolments.map((e) => e.program);
  const course = courses.find((c) => c.slug === sp.course);
  const from = sp.from?.startsWith("/") ? sp.from.slice(0, 200) : "";
  const source = sp.source === "COURSE_PAGE" || sp.source === "ACCOUNT" ? sp.source : course ? "COURSE_PAGE" : "WEB_FORM";
  const category = categories.find((c) => c.value === sp.category)?.value ?? "OTHER";
  return (
    <div className="mx-auto max-w-[760px] px-6 py-12">
      <PageHead kicker="Support" title="Start a conversation" lede={`Support hours: ${hours}. We reply in the conversation and notify you.`} />
      <p role="note" className="mt-6 rounded-[3px] border border-warning/40 bg-warning-bg px-4 py-3 text-[13.5px] text-warning">
        {PHI_WARNING}
      </p>
      <ActionForm action={openTicketAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="pageContext" value={from} />
        <Field label="Topic" htmlFor="category">
          <select id="category" name="category" defaultValue={category} className={FIELD}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Course (if it is about one)" htmlFor="programId">
          <select id="programId" name="programId" defaultValue={course?.id ?? ""} className={FIELD}>
            <option value="">Not about a particular course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {sp.ref && <input type="hidden" name="relatedRef" value={sp.ref.slice(0, 200)} />}
        {(sp.ref || from) && <p className="text-[12.5px] text-muted-foreground">We will include where you came from{sp.ref ? `: ${sp.ref.slice(0, 120)}` : ""}.</p>}
        <Field label="Subject" htmlFor="subject">
          <input id="subject" name="subject" required minLength={4} maxLength={160} defaultValue={sp.subject} className={FIELD} />
        </Field>
        <Field label="Message" htmlFor="body" hint="What happened, what you expected, and anything you already tried.">
          <textarea id="body" name="body" required minLength={10} rows={6} className={TEXTAREA} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How much does it affect you?" htmlFor="impact">
            <select id="impact" name="impact" defaultValue="1" className={FIELD}>
              <option value="1">A little: I can carry on</option>
              <option value="2">It stops me finishing something</option>
              <option value="3">I cannot use the academy at all</option>
            </select>
          </Field>
          <Field label="How soon do you need it?" htmlFor="urgency">
            <select id="urgency" name="urgency" defaultValue="1" className={FIELD}>
              <option value="1">No deadline</option>
              <option value="2">This week</option>
              <option value="3">Today (a deadline or exam)</option>
            </select>
          </Field>
        </div>
        <Field label="Attachment (optional)" htmlFor="attachment" hint="A screenshot or document, up to 10 MB: PNG, JPEG, WebP, GIF, PDF or Office files. Never attach anything with patient information.">
          <input id="attachment" name="attachment" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt" className="text-[13px]" />
        </Field>
        <fieldset className="flex flex-col gap-2 text-[14px]">
          <legend className="text-micro font-medium">How would you like to talk?</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="channel" value="TICKET" defaultChecked /> Message: we reply in the thread and notify you
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="channel" value="CHAT" /> Chat: the page updates as we reply
          </label>
        </fieldset>
        <button className={`${BTN} w-fit`}>Send</button>
      </ActionForm>
    </div>
  );
}
