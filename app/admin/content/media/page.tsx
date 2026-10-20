import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, Checkbox, Empty, Field, FIELD, Pill, when } from "@/components/admin/kit";
import { archiveMediaAction, updateMediaAction, uploadMediaAction } from "@/lib/actions/cms";
import { humanSize } from "@/lib/storage";

export const metadata = { title: "Media library" };

/**
 * Images and documents for lessons. Uploads are checked by content (not file name), kept
 * private, and served only through an access check. Replace an image by uploading a new one
 * and pointing the block at it: released versions keep showing what was approved.
 */
export default async function MediaPage({ searchParams }: { searchParams: Promise<{ archived?: string }> }) {
  const actor = await requirePagePermission("content.view");
  const { archived } = await searchParams;
  const assets = await prisma.mediaAsset.findMany({ where: archived ? {} : { archivedAt: null }, orderBy: { createdAt: "desc" }, take: 200 });
  const canManage = can(actor, "media.manage");
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Learning management" title="Media library" lede="Images need alternative text. Files must be under 5 MB (images) or 25 MB (documents). Never upload screenshots of real claims, patient records or payer portals." />

      {canManage && (
        <ActionForm action={uploadMediaAction} className="mt-8 grid gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4 sm:grid-cols-2" resetOnSuccess success="Uploaded.">
          <Field label="File" htmlFor="file">
            <input id="file" name="file" type="file" required accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.docx,.xlsx,.pptx,.csv,.txt,audio/mpeg,audio/mp4,audio/ogg,audio/wav,.mp3,.m4a,.ogg,.wav" className="text-[13px]" />
          </Field>
          <Field label="Title" htmlFor="title">
            <input id="title" name="title" required className={FIELD} />
          </Field>
          <Field label="Alternative text (images)" htmlFor="alt" className="sm:col-span-2">
            <input id="alt" name="altText" className={FIELD} placeholder="Diagram of the claim lifecycle from eligibility to payment posting" />
          </Field>
          <p className="text-[12.5px] text-muted-foreground sm:col-span-2">
            Which files work where: <strong>PDFs</strong> can be shown in a lesson as a view-only document (Document block). <strong>Word files</strong> can be turned into a designed
            lesson page (add a Design block and start it from the document); uploaded here they are only stored. Images are chosen in lessons and on the website.
          </p>
          <Checkbox name="isPublic" label="Public (for catalogue images only)" />
          <div>
            <button className={BTN}>Upload</button>
          </div>
        </ActionForm>
      )}

      <p className="mt-6 text-[13px]">
        <a href={archived ? "?" : "?archived=1"} className="underline underline-offset-4">
          {archived ? "Hide archived" : "Show archived"}
        </a>
      </p>

      <div className="mt-4">
        {assets.length === 0 ? (
          <Empty title="No media yet" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-3">
                {a.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served through an access-checked route
                  <img src={`/api/media/${a.id}?c=preview`} alt={a.altText ?? ""} className="h-40 w-full rounded-[3px] bg-secondary object-contain" />
                ) : (
                  <a href={`/api/media/${a.id}?c=preview`} className="flex h-40 items-center justify-center rounded-[3px] bg-secondary text-[13px] underline">
                    Open document
                  </a>
                )}
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                  <Pill>{a.kind.toLowerCase()}</Pill>
                  {a.isPublic && <Pill tone="amber">public</Pill>}
                  {a.archivedAt && <Pill tone="red">archived</Pill>}
                  {humanSize(a.sizeBytes)} · {when(a.createdAt)}
                </div>
                {canManage ? (
                  <ActionForm action={updateMediaAction} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <input name="title" defaultValue={a.title} aria-label="Title" className={FIELD} />
                    <input name="altText" defaultValue={a.altText ?? ""} aria-label="Alternative text" placeholder="Alternative text" className={FIELD} />
                    <Checkbox name="isPublic" label="Public" defaultChecked={a.isPublic} />
                    <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[12.5px] hover:bg-secondary">Save</button>
                  </ActionForm>
                ) : (
                  <p className="text-[13px]">{a.title}</p>
                )}
                {canManage && (
                  <ActionButton action={archiveMediaAction} fields={{ id: a.id, archived: a.archivedAt ? "false" : "true" }} variant="ghost" confirm={a.archivedAt ? undefined : "Archive this file? It must not be used in any draft lesson."}>
                    {a.archivedAt ? "Restore" : "Archive"}
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
