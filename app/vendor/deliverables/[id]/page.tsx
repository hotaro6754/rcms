import Link from "next/link";
import { requireActor } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, inr, Panel, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { commentDeliverableAction, submitDeliverableAction } from "@/lib/actions/vendors";
import { portalDeliverable } from "@/lib/services/vendors/vendors";

export const metadata = { title: "Deliverable" };

export default async function VendorDeliverable({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;
  const { del, names } = await portalDeliverable(actor, id);
  const canSubmit = ["ASSIGNED", "IN_PROGRESS", "CHANGES_REQUESTED"].includes(del.status);
  return (
    <div className="mx-auto max-w-[1000px] px-6 py-8">
      <Link href="/vendor" className="text-micro text-muted-foreground hover:text-foreground">
        ← Overview
      </Link>
      <PageHead kicker={del.program?.name ?? "Deliverable"} title={del.title} lede={<span className="flex flex-wrap items-center gap-2"><StatusPill status={del.status} /> due {when(del.dueDate)} · fee {inr(del.fee)}</span>} />
      {del.description && <p className="mt-4 max-w-[65ch] whitespace-pre-wrap text-[14.5px] leading-relaxed">{del.description}</p>}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Panel title="Submissions">
          <ul className="divide-y divide-border text-[13.5px]">
            {del.submissions.length === 0 && <li className="py-2 text-muted-foreground">Nothing submitted yet.</li>}
            {del.submissions.map((s) => (
              <li key={s.id} className="py-2">
                {when(s.createdAt, true)}
                {s.fileKey && (
                  <>
                    {" · "}
                    <a href={`/api/vendor-files/submission/${s.id}`} className="underline">
                      {s.fileName}
                    </a>
                  </>
                )}
                {s.link && (
                  <>
                    {" · "}
                    <a href={s.link} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                      link
                    </a>
                  </>
                )}
                {s.note && <span className="block text-muted-foreground">{s.note}</span>}
              </li>
            ))}
          </ul>
          {canSubmit && (
            <ActionForm action={submitDeliverableAction} className="mt-4 flex flex-col gap-3 border-t border-border pt-4" resetOnSuccess success="Submitted for review.">
              <input type="hidden" name="id" value={del.id} />
              <Field label="File (PDF, Office document, image or ZIP)" htmlFor="f">
                <input id="f" name="file" type="file" className="text-[13px]" />
              </Field>
              <Field label="Or a link" htmlFor="l">
                <input id="l" name="link" type="url" placeholder="https://" className={FIELD} />
              </Field>
              <Field label="Note to the reviewer" htmlFor="n">
                <textarea id="n" name="note" rows={3} className={TEXTAREA} />
              </Field>
              <p className="text-[12px] text-muted-foreground">Use only synthetic or de-identified examples. Never include patient information, real claim data or card numbers.</p>
              <button className={`${BTN} w-fit`}>Submit for review</button>
            </ActionForm>
          )}
        </Panel>
        <Panel title="Conversation">
          <ul className="flex flex-col gap-3 text-[13.5px]">
            {del.comments.length === 0 && <li className="text-muted-foreground">No comments yet.</li>}
            {del.comments.map((c) => (
              <li key={c.id}>
                <span className="text-micro text-muted-foreground">
                  {c.authorId === actor.id ? "You" : (names[c.authorId] ?? "Academy")} · {when(c.createdAt, true)}
                </span>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ul>
          <ActionForm action={commentDeliverableAction} className="mt-4 flex flex-col gap-2" resetOnSuccess>
            <input type="hidden" name="id" value={del.id} />
            <textarea name="body" required rows={3} aria-label="Comment" className={TEXTAREA} />
            <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Comment</button>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
