import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, Panel, Pill, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { Markdown } from "@/lib/cms/markdown";
import { entryWorkflowAction, updateEntryAction } from "@/lib/actions/library";
import { LIBRARY_KINDS, LIBRARY_LABEL, LIBRARY_PATH, type PublishedEntry } from "@/lib/services/cms/library";

export const metadata = { title: "Library entry" };

export default async function LibraryEntryAdmin({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("content.view");
  const { id } = await params;
  const e = await prisma.libraryEntry.findUnique({ where: { id } });
  if (!e) notFound();
  const [levels, people] = await Promise.all([
    prisma.learningLevel.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { sequence: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: [e.authorId, e.submittedById, e.reviewerId].filter(Boolean) as string[] } }, select: { id: true, name: true } }),
  ]);
  const name = (uid: string | null) => people.find((p) => p.id === uid)?.name ?? "—";
  const editable = can(actor, "content.edit") && e.status !== "IN_REVIEW" && e.status !== "ARCHIVED";
  const reviewer = can(actor, "content.review.academic") || can(actor, "content.review.compliance");
  const pub = e.published as unknown as PublishedEntry | null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-8">
      <Link href="/admin/content/library" className="text-micro text-muted-foreground hover:text-foreground">
        ← Library
      </Link>
      <PageHead
        kicker={LIBRARY_LABEL[e.kind]}
        title={e.title}
        lede={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={e.status} />
            {e.hasDraftChanges && <Pill tone="amber">edits awaiting approval</Pill>}
            {pub && e.status !== "ARCHIVED" && (
              <Link href={`/resources/${LIBRARY_PATH[e.kind]}/${e.slug}`} className="text-[13px] underline underline-offset-4">
                View public page
              </Link>
            )}
          </span>
        }
      />
      <p className="mt-2 text-micro text-muted-foreground">
        Author {name(e.authorId)} · submitted by {name(e.submittedById)} · reviewed by {name(e.reviewerId)} {e.lastReviewedAt ? `on ${when(e.lastReviewedAt)}` : ""} · next review {when(e.nextReviewAt)}
      </p>
      {e.reviewNote && <p className="mt-3 border-l-2 border-warning pl-3 text-[13.5px]">Reviewer note: {e.reviewNote}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title="Draft">
          <ActionForm action={updateEntryAction} className="grid gap-3" success="Saved.">
            <input type="hidden" name="id" value={e.id} />
            <input type="hidden" name="lockVersion" value={e.lockVersion} />
            <fieldset disabled={!editable} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Kind" htmlFor="k">
                  <select id="k" name="kind" defaultValue={e.kind} className={FIELD}>
                    {LIBRARY_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {LIBRARY_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Level" htmlFor="lv">
                  <select id="lv" name="levelId" defaultValue={e.levelId ?? ""} className={FIELD}>
                    <option value="">Any level</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Title" htmlFor="t">
                <input id="t" name="title" defaultValue={e.title} required className={FIELD} />
              </Field>
              <Field label="Summary" htmlFor="s" hint="Shown in lists and search results.">
                <textarea id="s" name="summary" rows={2} defaultValue={e.summary} required className={TEXTAREA} />
              </Field>
              <Field label="Body" htmlFor="b" hint="Markdown subset: paragraphs, **bold**, lists, ## headings, [links](https://…). Synthetic examples only.">
                <textarea id="b" name="body" rows={14} defaultValue={e.body} className={`${TEXTAREA} font-mono text-[13px]`} />
              </Field>
              <Field label="Tags" htmlFor="tg" hint="Comma-separated.">
                <input id="tg" name="tags" defaultValue={e.tags.join(", ")} className={FIELD} />
              </Field>
              <Field label="Sources" htmlFor="src" hint="One per line: regulation, manual section or standard, with its date.">
                <textarea id="src" name="sources" rows={3} defaultValue={e.sources.join("\n")} className={TEXTAREA} />
              </Field>
            </fieldset>
            {editable && <button className={`${BTN} w-fit`}>Save draft</button>}
          </ActionForm>
          {e.status === "IN_REVIEW" && <p className="mt-3 text-micro text-muted-foreground">In review: editing is locked until a reviewer decides or the submitter withdraws it.</p>}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Workflow">
            <div className="flex flex-wrap gap-2">
              {can(actor, "content.submit") && (e.status === "DRAFT" || (e.status === "PUBLISHED" && e.hasDraftChanges)) && (
                <ActionButton action={entryWorkflowAction} fields={{ id: e.id, op: "submit" }} variant="default">
                  Submit for review
                </ActionButton>
              )}
              {e.status === "IN_REVIEW" && (e.submittedById === actor.id || can(actor, "content.edit")) && (
                <ActionButton action={entryWorkflowAction} fields={{ id: e.id, op: "withdraw" }}>
                  Withdraw from review
                </ActionButton>
              )}
              {can(actor, "content.archive") && e.status !== "ARCHIVED" && (
                <ActionButton action={entryWorkflowAction} fields={{ id: e.id, op: "archive" }} variant="danger" confirm="Archive this entry? It disappears from the public site.">
                  Archive
                </ActionButton>
              )}
              {can(actor, "content.archive") && e.status === "ARCHIVED" && (
                <ActionButton action={entryWorkflowAction} fields={{ id: e.id, op: "restore" }}>
                  Restore to draft
                </ActionButton>
              )}
            </div>
            {e.status === "IN_REVIEW" && reviewer && e.submittedById !== actor.id && (
              <ActionForm action={entryWorkflowAction} className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <input type="hidden" name="id" value={e.id} />
                <textarea name="note" rows={2} placeholder="Review note (required to request changes)" aria-label="Review note" className={TEXTAREA} />
                <p className="text-[12px] text-muted-foreground">Check accuracy against the listed sources and that every example is synthetic.</p>
                <span className="flex gap-2">
                  <button name="op" value="approve" className="rounded-[3px] bg-primary px-3 py-1.5 text-[13px] text-primary-foreground">
                    Approve and publish
                  </button>
                  <button name="op" value="reject" className="rounded-[3px] border border-input px-3 py-1.5 text-[13px]">
                    Request changes
                  </button>
                </span>
              </ActionForm>
            )}
            {e.status === "IN_REVIEW" && e.submittedById === actor.id && <p className="mt-3 text-[12.5px] text-muted-foreground">You submitted this entry; another reviewer must decide it.</p>}
          </Panel>
          <Panel title="Draft preview">
            <h3 className="text-[1.1rem] font-semibold">{e.title}</h3>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{e.summary}</p>
            {e.body && <Markdown text={e.body} className="mt-3 flex flex-col gap-2 text-[14px]" />}
          </Panel>
          {pub && (
            <Panel title="Live version">
              <p className="text-[13px] text-muted-foreground">Published {when(e.publishedAt)}. This is what the public sees.</p>
              <p className="mt-2 text-[13.5px]">{pub.summary}</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
