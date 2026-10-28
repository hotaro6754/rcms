"use client";

import { useRef, useState, useTransition } from "react";
import { addMaterial, deleteMaterial, setMaterialDownloadable } from "@/lib/actions/materials";

export interface MaterialRow {
  id: string;
  title: string;
  type: string;
  size: string;
  downloadable: boolean;
}

/**
 * Trainer Studio: attach materials to a lesson. Upload a file (PDF, Office, CSV, ZIP,
 * image, up to 25 MB) or paste an https link to one held elsewhere. Students download
 * through the access-checked route; nothing here is ever public.
 */
export function MaterialsManager({ lessonId, rows }: { lessonId: string; rows: MaterialRow[] }) {
  const form = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"file" | "link">("file");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="border-t-2 border-foreground pt-4">
      <h2 className="text-data text-[10.5px] tracking-[0.14em] text-subtle">MATERIALS</h2>

      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">None attached yet.</p>
      ) : (
        <ul className="mt-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-baseline justify-between gap-3 border-b border-border py-2.5">
              <a href={`/api/materials/${r.id}`} className="min-w-0 truncate text-[13.5px] underline-offset-4 hover:underline">
                {r.title}
              </a>
              <span className="flex shrink-0 items-baseline gap-3">
                <span className="text-data text-[10.5px] text-subtle">
                  {r.type}
                  {r.size && ` · ${r.size}`}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={r.downloadable}
                  title={r.downloadable ? "Learners can download this file. Click to make it view-only." : "View-only: learners cannot download it. Click to allow downloading."}
                  onClick={() =>
                    start(async () => {
                      const res = await setMaterialDownloadable(r.id, !r.downloadable);
                      if (!res.ok) setError(res.error);
                    })
                  }
                  className="text-data text-[10.5px] tracking-[0.08em] hover:underline disabled:opacity-40"
                >
                  {r.downloadable ? "DOWNLOADABLE" : "VIEW ONLY"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteMaterial(r.id);
                      if (!res.ok) setError(res.error);
                    })
                  }
                  className="text-data text-[10.5px] tracking-[0.08em] text-danger hover:underline disabled:opacity-40"
                  aria-label={`Remove ${r.title}`}
                >
                  REMOVE
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={form}
        action={(fd) =>
          start(async () => {
            setError(null);
            const res = await addMaterial(lessonId, fd);
            if (res.ok) form.current?.reset();
            else setError(res.error);
          })
        }
        className="mt-5 flex flex-col gap-3"
      >
        <div role="radiogroup" aria-label="Material source" className="text-data flex gap-4 text-[11px] tracking-[0.1em]">
          {(["file", "link"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={mode === m ? "text-foreground underline underline-offset-4" : "text-subtle hover:text-foreground"}
            >
              {m === "file" ? "UPLOAD A FILE" : "LINK TO A FILE"}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] text-muted-foreground">Title students will see</span>
          <input name="title" required minLength={3} className="min-h-10 border-b border-input bg-transparent text-[14px] outline-none focus:border-foreground" placeholder="Denial reason code sheet" />
        </label>
        {mode === "file" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] text-muted-foreground">File, up to 25 MB</span>
            <input name="file" type="file" required accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt,.zip,.png,.jpg,.jpeg" className="text-[13px] file:mr-3 file:rounded-[3px] file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-[12.5px]" />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] text-muted-foreground">Link (https)</span>
            <input name="url" type="url" required className="min-h-10 border-b border-input bg-transparent text-[14px] outline-none focus:border-foreground" placeholder="https://" />
          </label>
        )}
        <label className="flex items-start gap-2 text-[12.5px] text-muted-foreground">
          <input type="checkbox" name="downloadable" value="true" className="mt-0.5" />
          Learners may download this file. Leave unticked to keep it view-only: PDFs are read in the lesson, page by page.
        </label>
        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex min-h-10 w-fit items-center rounded-[3px] bg-primary px-4 text-[13.5px] font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Saving…" : "Attach"}
        </button>
        {error && (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
