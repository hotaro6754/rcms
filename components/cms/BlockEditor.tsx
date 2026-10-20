"use client";

import { useState } from "react";
import type { BlockKind } from "@prisma/client";
import { ChevronDown, ChevronUp, Copy, Pencil, Trash2 } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { addBlockAction, blockOpAction, updateBlockAction } from "@/lib/actions/cms";
import { BLOCK_LABEL } from "@/lib/cms/blocks";

export interface EditorBlock {
  id: string;
  kind: BlockKind;
  data: Record<string, unknown>;
  updatedAt: string;
}

const KINDS = Object.keys(BLOCK_LABEL) as BlockKind[];
const IN = "min-h-9 w-full rounded-[3px] border border-input bg-card px-2.5 text-[13.5px]";
const TA = "w-full rounded-[3px] border border-input bg-card px-2.5 py-2 text-[13.5px] leading-relaxed";
const s = (v: unknown) => (typeof v === "string" ? v : "");

function L({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-[12.5px] font-medium">
      {label}
      {children}
      {hint && <span className="text-[11.5px] font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

const MD_HINT = "Blank line = new paragraph. ## heading, - bullet, 1. step, **bold**, *italic*, [link](https://…).";

/** The fields for one block kind, pre-filled from `d`. Names match lib/actions/cms.ts blockData. */
function KindFields({ kind, d, images, audio = [], documents = [], blockId }: { kind: BlockKind; d: Record<string, unknown>; images: { id: string; title: string }[]; audio?: { id: string; title: string }[]; documents?: { id: string; title: string }[]; blockId?: string }) {
  switch (kind) {
    case "DESIGN":
      return (
        <>
          <L label="Name (for authors; not shown to learners)">
            <input name="title" defaultValue={s(d.title)} maxLength={200} className={IN} placeholder="e.g. Denial categories explained" />
          </L>
          {blockId ? (
            <a href={`/admin/content/design/${blockId}`} className="w-fit rounded-[3px] bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground">
              Open the visual designer
            </a>
          ) : (
            <>
              <L label="Start from a document (optional)" hint="PDF or Word (.docx), up to 25 MB. Headings become sections, lists become steps or flip cards, tables become tables and charts, and pictures are kept in place. You can change everything afterwards in the designer.">
                <input type="file" name="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="text-[13px]" />
              </L>
              <label className="flex items-start gap-2 text-[12.5px]">
                <input type="checkbox" name="keepOriginal" value="true" className="mt-0.5" />
                For a PDF, also add the original as a view-only document after the design.
              </label>
            </>
          )}
        </>
      );
    case "DOCUMENT":
      return (
        <>
          <L label="PDF from the media library" hint={documents.length ? "Learners read it page by page and cannot download it. Only PDFs are listed here; upload a Word file below." : "No PDFs in the media library yet. Upload a PDF or Word file below."}>
            <select name="mediaId" defaultValue={s(d.mediaId)} className={IN}>
              <option value="">Choose…</option>
              {documents.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </L>
          <L label="Or upload a PDF or Word file here" hint="PDF or Word (.docx), up to 25 MB. A Word file is turned into a PDF (simple layout: headings, text, lists, tables and pictures; use a PDF export from Word for an exact copy). It is added to the media library as a PDF.">
            <input type="file" name="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="text-[13px]" />
          </L>
          <L label="Title">
            <input name="title" defaultValue={s(d.title)} required minLength={3} maxLength={200} className={IN} />
          </L>
          <L label="Caption (optional)">
            <input name="caption" defaultValue={s(d.caption)} maxLength={600} className={IN} />
          </L>
        </>
      );
    case "TEXT":
      return (
        <L label="Text" hint={MD_HINT}>
          <textarea name="text" rows={8} defaultValue={s(d.text)} required className={TA} />
        </L>
      );
    case "HEADING":
      return (
        <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
          <L label="Heading">
            <input name="text" defaultValue={s(d.text)} required className={IN} />
          </L>
          <L label="Size">
            <select name="level" defaultValue={String(d.level ?? 2)} className={IN}>
              <option value="2">Section</option>
              <option value="3">Sub-section</option>
            </select>
          </L>
        </div>
      );
    case "CALLOUT":
      return (
        <>
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
            <L label="Tone">
              <select name="tone" defaultValue={s(d.tone) || "info"} className={IN}>
                <option value="info">Note</option>
                <option value="tip">Tip</option>
                <option value="warning">Warning</option>
                <option value="compliance">Compliance</option>
              </select>
            </L>
            <L label="Title (optional)">
              <input name="title" defaultValue={s(d.title)} className={IN} />
            </L>
          </div>
          <L label="Text" hint={MD_HINT}>
            <textarea name="text" rows={4} defaultValue={s(d.text)} required className={TA} />
          </L>
        </>
      );
    case "IMAGE":
      return (
        <>
          <L label="Image" hint={images.length ? undefined : "Upload images in the media library first."}>
            <select name="mediaId" defaultValue={s(d.mediaId)} required className={IN}>
              <option value="">Choose…</option>
              {images.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </L>
          <L label="Alternative text" hint="What the image shows, for people who cannot see it. Required.">
            <input name="alt" defaultValue={s(d.alt)} required minLength={3} className={IN} />
          </L>
          <L label="Caption (optional)">
            <input name="caption" defaultValue={s(d.caption)} className={IN} />
          </L>
        </>
      );
    case "AUDIO":
      return (
        <>
          <L label="Audio file" hint={audio.length ? undefined : "Upload MP3, M4A, OGG or WAV files in the media library first."}>
            <select name="mediaId" defaultValue={s(d.mediaId)} required className={IN}>
              <option value="">Choose…</option>
              {audio.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </L>
          <L label="Title">
            <input name="title" defaultValue={s(d.title)} required minLength={3} className={IN} />
          </L>
          <L label="Transcript" hint="Required: learners who cannot listen read this instead.">
            <textarea name="transcript" rows={5} defaultValue={s(d.transcript)} required minLength={20} className={TA} />
          </L>
        </>
      );
    case "VIDEO":
      return (
        <>
          <L label="Video URL" hint="YouTube, Vimeo, Bunny Stream, Mux or Cloudflare Stream (https).">
            <input name="url" type="url" defaultValue={s(d.url)} required className={IN} />
          </L>
          <L label="Title">
            <input name="title" defaultValue={s(d.title)} required className={IN} />
          </L>
          <label className="flex items-center gap-2 text-[12.5px]">
            <input type="hidden" name="captions" value="" />
            <input type="checkbox" name="captions" value="true" defaultChecked={!!d.captions} /> The video has captions
          </label>
          <L label="Transcript (optional, recommended)">
            <textarea name="transcript" rows={4} defaultValue={s(d.transcript)} className={TA} />
          </L>
        </>
      );
    case "LINK":
      return (
        <>
          <L label="URL">
            <input name="url" type="url" defaultValue={s(d.url)} required className={IN} placeholder="https://www.cms.gov/…" />
          </L>
          <L label="Label">
            <input name="label" defaultValue={s(d.label)} required className={IN} />
          </L>
          <L label="Description (optional)">
            <input name="description" defaultValue={s(d.description)} className={IN} />
          </L>
        </>
      );
    case "TABLE":
      return (
        <>
          <L label="Caption (optional)">
            <input name="caption" defaultValue={s(d.caption)} className={IN} />
          </L>
          <L label="Header" hint="Columns separated by |">
            <input name="header" defaultValue={((d.header as string[]) ?? []).join(" | ")} required className={IN} placeholder="KPI | Numerator | Denominator" />
          </L>
          <L label="Rows" hint="One row per line, columns separated by |">
            <textarea name="rows" rows={5} defaultValue={((d.rows as string[][]) ?? []).map((r) => r.join(" | ")).join("\n")} required className={TA} />
          </L>
        </>
      );
    case "STEPS":
      return (
        <>
          <L label="Title (optional)">
            <input name="title" defaultValue={s(d.title)} className={IN} />
          </L>
          <L label="Steps" hint="One step per line.">
            <textarea name="steps" rows={6} defaultValue={((d.steps as string[]) ?? []).join("\n")} required className={TA} />
          </L>
        </>
      );
    case "SCENARIO":
      return (
        <>
          <L label="Title">
            <input name="title" defaultValue={s(d.title)} required className={IN} />
          </L>
          <L label="Scenario" hint={MD_HINT}>
            <textarea name="context" rows={6} defaultValue={s(d.context)} required className={TA} />
          </L>
          <L label="Question for the learner (optional)">
            <input name="question" defaultValue={s(d.question)} className={IN} />
          </L>
          <L label="Discussion, revealed on request (optional)">
            <textarea name="discussion" rows={4} defaultValue={s(d.discussion)} className={TA} />
          </L>
          <label className="flex items-start gap-2 text-[12.5px]">
            <input type="hidden" name="synthetic" value="" />
            <input type="checkbox" name="synthetic" value="true" defaultChecked={!!d.synthetic} required className="mt-0.5" />
            I confirm this scenario is synthetic: no real patient, client or payer-identifying data.
          </label>
        </>
      );
    case "CODE":
      return (
        <>
          <L label="Label (optional)">
            <input name="language" defaultValue={s(d.language)} className={IN} placeholder="837P segment" />
          </L>
          <L label="Example">
            <textarea name="code" rows={6} defaultValue={s(d.code)} required className={`${TA} font-mono text-[12.5px]`} />
          </L>
        </>
      );
  }
}

function summary(b: EditorBlock) {
  const d = b.data;
  if (b.kind === "DESIGN") return `${s(d.title) || "Untitled design"} · ${((d.design as { content?: unknown[] } | undefined)?.content ?? []).length} sections`;
  if (b.kind === "DOCUMENT") return `${s(d.title)} · ${Number(d.pages) || "?"} pages, view only`;
  const t = s(d.text) || s(d.title) || s(d.label) || s(d.alt) || s(d.caption) || s(d.code) || ((d.steps as string[]) ?? [])[0] || ((d.header as string[]) ?? []).join(" · ");
  return t.length > 140 ? t.slice(0, 140) + "…" : t;
}

export function BlockEditor({ courseId, lessonId, blocks, images, audio = [], documents = [], canEdit }: { courseId: string; lessonId: string; blocks: EditorBlock[]; images: { id: string; title: string }[]; audio?: { id: string; title: string }[]; documents?: { id: string; title: string }[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [newKind, setNewKind] = useState<BlockKind | "">("");

  return (
    <div className="flex flex-col gap-2">
      {blocks.length === 0 && <p className="rounded-[3px] border border-dashed border-input px-4 py-5 text-center text-micro text-muted-foreground">No content yet. Add a block below.</p>}
      <ol className="flex flex-col gap-2">
        {blocks.map((b, i) => (
          <li key={b.id} className="rounded-[3px] border border-border bg-card">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-data text-[10.5px] tracking-[0.08em] text-subtle">{BLOCK_LABEL[b.kind].toUpperCase()}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">{summary(b)}</span>
              {canEdit && (
                <span className="flex items-center gap-0.5">
                  <button type="button" onClick={() => setEditing(editing === b.id ? null : b.id)} className="rounded p-1.5 hover:bg-secondary" aria-label={`Edit block ${i + 1}`} aria-expanded={editing === b.id}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  {i > 0 && (
                    <ActionButton action={blockOpAction} fields={{ id: b.id, op: "up", courseId }} size="icon" variant="ghost" title={`Move block ${i + 1} up`}>
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    </ActionButton>
                  )}
                  {i < blocks.length - 1 && (
                    <ActionButton action={blockOpAction} fields={{ id: b.id, op: "down", courseId }} size="icon" variant="ghost" title={`Move block ${i + 1} down`}>
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </ActionButton>
                  )}
                  <ActionButton action={blockOpAction} fields={{ id: b.id, op: "duplicate", courseId }} size="icon" variant="ghost" title={`Duplicate block ${i + 1}`}>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </ActionButton>
                  <ActionButton action={blockOpAction} fields={{ id: b.id, op: "delete", courseId }} size="icon" variant="ghost" title={`Delete block ${i + 1}`} confirm="Remove this block from the draft? It stays in the version history.">
                    <Trash2 className="h-3.5 w-3.5 text-danger" aria-hidden />
                  </ActionButton>
                </span>
              )}
            </div>
            {editing === b.id && (
              <ActionForm action={updateBlockAction} className="flex flex-col gap-3 border-t border-border px-3 py-3" onSuccess={() => setEditing(null)}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="kind" value={b.kind} />
                <input type="hidden" name="updatedAt" value={b.updatedAt} />
                <input type="hidden" name="courseId" value={courseId} />
                <KindFields kind={b.kind} d={b.data} images={images} audio={audio} documents={documents} blockId={b.id} />
                <div className="flex gap-2">
                  <button className="min-h-9 rounded-[3px] bg-primary px-3 text-[13px] font-medium text-primary-foreground">Save block</button>
                  <button type="button" onClick={() => setEditing(null)} className="min-h-9 rounded-[3px] px-3 text-[13px] hover:bg-secondary">
                    Cancel
                  </button>
                </div>
              </ActionForm>
            )}
          </li>
        ))}
      </ol>

      {canEdit && (
        <div className="rounded-[3px] border border-dashed border-input px-3 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={`kind-${lessonId}`} className="text-[12.5px] font-medium">
              Add a block
            </label>
            <select id={`kind-${lessonId}`} value={newKind} onChange={(e) => setNewKind(e.target.value as BlockKind)} className="min-h-9 rounded-[3px] border border-input bg-card px-2 text-[13px]">
              <option value="">Choose type…</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {BLOCK_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          {newKind && (
            <ActionForm action={addBlockAction} className="mt-3 flex flex-col gap-3" onSuccess={() => setNewKind("")}>
              <input type="hidden" name="lessonId" value={lessonId} />
              <input type="hidden" name="kind" value={newKind} />
              <input type="hidden" name="courseId" value={courseId} />
              <KindFields kind={newKind} d={{}} images={images} audio={audio} documents={documents} />
              <div className="flex gap-2">
                <button className="min-h-9 rounded-[3px] bg-primary px-3 text-[13px] font-medium text-primary-foreground">Add {BLOCK_LABEL[newKind].toLowerCase()}</button>
                <button type="button" onClick={() => setNewKind("")} className="min-h-9 rounded-[3px] px-3 text-[13px] hover:bg-secondary">
                  Cancel
                </button>
              </div>
            </ActionForm>
          )}
        </div>
      )}
    </div>
  );
}
