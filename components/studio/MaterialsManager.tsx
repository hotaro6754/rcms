"use client";

import { useRef, useState, useTransition } from "react";
import { BookOpen, Eye, MonitorPlay, Presentation, Trash2, Upload } from "lucide-react";
import { addMaterial, deleteMaterial } from "@/lib/actions/materials";
import { DocumentReader } from "@/components/cms/DocumentReader";

export interface MaterialRow {
  id: string;
  title: string;
  format: "SLIDES" | "READING" | "OTHER";
  size: string;
  source: string | null;
  pages: number;
}

const FORMATS = {
  SLIDES: {
    label: "Slides",
    icon: Presentation,
    help: "The deck with the additional points, in clear bullets. Upload the PowerPoint (.pptx) or the PDF exported from it. Learners see it slide by slide.",
    accept: ".pptx,.pdf",
    placeholder: "Claim lifecycle — slide deck",
  },
  READING: {
    label: "Reading",
    icon: BookOpen,
    help: "The extensive study material. Upload a PDF or a Word (.docx) file. Learners read it page by page.",
    accept: ".pdf,.docx",
    placeholder: "Claim lifecycle — study material",
  },
} as const;

/**
 * The lesson's three formats in the CMS: the video (a Video block in the lesson content), the
 * slide deck and the reading material. Learners choose which to use; every format is view-only.
 * Files are converted to PDF on upload and shown to learners only as page images.
 */
export function LessonFormats({ lessonId, rows, videos, canEdit }: { lessonId: string; rows: MaterialRow[]; videos: number; canEdit: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Status icon={MonitorPlay} label="Video" ok={videos > 0} detail={videos > 0 ? `${videos} video${videos > 1 ? "s" : ""} in the content` : "Add a Video block under Content"} />
        <Status icon={Presentation} label="Slides" ok={rows.some((r) => r.format === "SLIDES")} detail={summary(rows, "SLIDES")} />
        <Status icon={BookOpen} label="Reading" ok={rows.some((r) => r.format === "READING")} detail={summary(rows, "READING")} />
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        Learners pick the format that suits them. Nothing is downloadable: the video plays in the protected player, and slides and reading are shown as page images with the
        learner&apos;s account watermarked across them. Copying, printing and saving are blocked in the lesson.
      </p>
      {(["SLIDES", "READING"] as const).map((f) => (
        <FormatSection key={f} lessonId={lessonId} format={f} rows={rows.filter((r) => r.format === f)} canEdit={canEdit} />
      ))}
      {rows.some((r) => r.format === "OTHER") && (
        <div className="rounded-[var(--radius)] border border-dashed border-border px-4 py-3 text-[12.5px] text-muted-foreground">
          <p className="font-medium text-foreground">Older attachments (not shown to learners)</p>
          <ul className="mt-1.5">
            {rows
              .filter((r) => r.format === "OTHER")
              .map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-1">
                  <span className="truncate">{r.title}</span>
                  {canEdit && <RemoveButton id={r.id} title={r.title} />}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function summary(rows: MaterialRow[], f: "SLIDES" | "READING") {
  const list = rows.filter((r) => r.format === f);
  if (!list.length) return f === "SLIDES" ? "No deck yet" : "No reading yet";
  const pages = list.reduce((n, r) => n + r.pages, 0);
  return `${list.length} file${list.length > 1 ? "s" : ""} · ${pages} ${f === "SLIDES" ? "slides" : "pages"}`;
}

function Status({ icon: Icon, label, ok, detail }: { icon: typeof MonitorPlay; label: string; ok: boolean; detail: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius)] border px-4 py-3 ${ok ? "border-brand/40 bg-brand/5" : "border-border"}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ok ? "text-brand" : "text-subtle"}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold">
          {label} <span className={`text-data ml-1 text-[10px] tracking-[0.12em] ${ok ? "text-brand" : "text-subtle"}`}>{ok ? "READY" : "MISSING"}</span>
        </p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function RemoveButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-[12px] text-danger">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Remove “${title}” from this lesson?`)) return;
          start(async () => {
            const res = await deleteMaterial(id);
            if (!res.ok) setError(res.error);
          });
        }}
        className="inline-flex items-center gap-1 text-[12px] text-danger hover:underline disabled:opacity-40"
        aria-label={`Remove ${title}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
      </button>
    </span>
  );
}

function FormatSection({ lessonId, format, rows, canEdit }: { lessonId: string; format: "SLIDES" | "READING"; rows: MaterialRow[]; canEdit: boolean }) {
  const meta = FORMATS[format];
  const form = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const Icon = meta.icon;

  return (
    <section className="rounded-[var(--radius)] border border-border bg-card px-4 py-4">
      <h3 className="flex items-center gap-2 text-[14px] font-semibold">
        <Icon className="h-4 w-4 text-brand" aria-hidden /> {meta.label}
      </h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{meta.help}</p>

      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {rows.map((r) => (
            <li key={r.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium">{r.title}</span>
                  <span className="text-data text-[10.5px] text-subtle">
                    {r.pages} {format === "SLIDES" ? "SLIDES" : "PAGES"} · {r.size}
                    {r.source ? ` · FROM ${r.source}` : ""} · VIEW ONLY
                  </span>
                </span>
                <span className="flex items-center gap-4">
                  <button type="button" onClick={() => setPreview(preview === r.id ? null : r.id)} className="inline-flex items-center gap-1 text-[12px] hover:underline" aria-expanded={preview === r.id}>
                    <Eye className="h-3.5 w-3.5" aria-hidden /> {preview === r.id ? "Hide" : "Preview"}
                  </button>
                  {canEdit && <RemoveButton id={r.id} title={r.title} />}
                </span>
              </div>
              {preview === r.id && (
                <div className="mt-3">
                  <DocumentReader mediaId={r.id} pages={r.pages} title={r.title} base={`/api/material-pages/${r.id}`} variant={format === "SLIDES" ? "slides" : "pages"} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form
          ref={form}
          action={(fd) =>
            start(async () => {
              setError(null);
              setNote(null);
              fd.set("format", format);
              const res = await addMaterial(lessonId, fd);
              if (res.ok) {
                form.current?.reset();
                setNote(res.data.note);
              } else setError(res.error);
            })
          }
          className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-muted-foreground">Title learners see</span>
            <input name="title" required minLength={3} maxLength={160} className="min-h-10 rounded-xl border border-input bg-transparent px-3 text-[14px] outline-none focus:border-foreground" placeholder={meta.placeholder} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] text-muted-foreground">File ({format === "SLIDES" ? "PPTX or PDF" : "PDF or DOCX"}, up to 25 MB)</span>
            <input
              name="file"
              type="file"
              required
              accept={meta.accept}
              className="text-[13px] file:mr-3 file:rounded-xl file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-[12.5px]"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13.5px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {pending ? (format === "SLIDES" ? "Converting…" : "Saving…") : `Add ${meta.label.toLowerCase()}`}
          </button>
          {error && (
            <p role="alert" className="text-[13px] text-danger md:col-span-3">
              {error}
            </p>
          )}
          {note && (
            <p role="status" className="text-[12.5px] text-warning md:col-span-3">
              {note}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
