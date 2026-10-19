"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { BTN, BTN_OUTLINE, FIELD, Pill } from "@/components/admin/kit";
import type { PageDef } from "@/lib/site/fields";
import { deleteCustomPageAction, discardSiteDraftAction, publishSiteAction, renameCustomPageAction, resetSitePageAction, restoreSiteVersionAction, saveSiteDraftAction } from "@/lib/actions/site";
import { FieldsEditor, type MediaOption } from "./FieldEditor";

type Version = { version: number; createdAt: string; by: string | null; note: string | null; reset: boolean };

/**
 * The page editor: every field of one page, with save, preview, publish and history.
 * Work is saved as a draft that only preview shows; visitors see it once it is published.
 */
export function SiteEditor(props: {
  pageKey: string;
  def: PageDef;
  custom: boolean;
  title: string;
  initial: Record<string, unknown>;
  hasDraft: boolean;
  published: boolean;
  lockVersion: number;
  version: number;
  status: string;
  versions: Version[];
  media: MediaOption[];
}) {
  const { pageKey, def } = props;
  const router = useRouter();
  const [value, setValue] = useState(props.initial);
  const [saved, setSaved] = useState(JSON.stringify(props.initial));
  const [lock, setLock] = useState(props.lockVersion);
  const [hasDraft, setHasDraft] = useState(props.hasDraft);
  const [note, setNote] = useState("");
  const [legalOk, setLegalOk] = useState(false);
  const [title, setTitle] = useState(props.title);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = useMemo(() => JSON.stringify(value) !== saved, [value, saved]);

  // A fresh server render (after publish, restore or another save) replaces the local copy.
  useEffect(() => {
    setValue(props.initial);
    setSaved(JSON.stringify(props.initial));
    setLock(props.lockVersion);
    setHasDraft(props.hasDraft);
  }, [props.initial, props.lockVersion, props.hasDraft]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Saves if there are unsaved edits; returns false (and shows why) when saving fails. */
  async function save(): Promise<boolean> {
    if (!dirty) return true;
    const r = await saveSiteDraftAction(pageKey, value, lock);
    if (!r.ok) {
      setMsg({ ok: false, text: r.error });
      return false;
    }
    setLock(r.data.lockVersion);
    setSaved(JSON.stringify(value));
    setHasDraft(true);
    return true;
  }

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setMsg(null);
      await fn();
    });

  const onSave = () =>
    run(async () => {
      if (await save()) {
        setMsg({ ok: true, text: "Draft saved. Visitors still see the published page." });
        router.refresh();
      }
    });

  const onPreview = () => {
    // Open the tab synchronously (pop-up blockers), then point it at the page once saved.
    const tab = window.open("about:blank", "_blank");
    run(async () => {
      if (!(await save())) return tab?.close();
      router.refresh();
      if (tab) tab.location.href = `/api/site/preview?key=${encodeURIComponent(pageKey)}`;
    });
  };

  const onPublish = () =>
    run(async () => {
      if (!(await save())) return;
      const r = await publishSiteAction(pageKey, { note, confirmLegal: legalOk });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setNote("");
      setMsg({ ok: true, text: `Published as version ${r.data.version}. The live page now shows these changes.` });
      router.refresh();
    });

  const onDiscard = () => {
    if (!window.confirm("Discard the draft and go back to the published page?")) return;
    run(async () => {
      const r = await discardSiteDraftAction(pageKey);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: "Draft discarded." });
      router.refresh();
    });
  };

  const onReset = () => {
    if (!window.confirm("Publish the original copy again? Your edits stay in the history and can be restored.")) return;
    run(async () => {
      const r = await resetSitePageAction(pageKey, { confirmLegal: legalOk });
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: "The page shows its original copy again." });
      router.refresh();
    });
  };

  const onRestore = (v: number) => {
    if (dirty && !window.confirm("You have unsaved edits. Replace them with this version?")) return;
    run(async () => {
      const r = await restoreSiteVersionAction(pageKey, v);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: `Version ${v} is now in the draft. Check it, then publish.` });
      router.refresh();
    });
  };

  const onDelete = () => {
    if (!window.confirm(`Delete “${props.title}”? It stops being shown at ${def.path} straight away.`)) return;
    run(async () => {
      const r = await deleteCustomPageAction(pageKey);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      router.push("/admin/site");
    });
  };

  // The designer edits the saved draft, so unsaved edits here are saved first.
  const onOpenDesigner = (path: string) =>
    run(async () => {
      if (!(await save())) return;
      router.push(`/admin/site/${pageKey}/design?field=${encodeURIComponent(path)}`);
    });

  const onRename = () =>
    run(async () => {
      const r = await renameCustomPageAction(pageKey, title);
      setMsg(r.ok ? { ok: true, text: "Renamed." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });

  return (
    <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {props.custom && (
          <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius)] border border-border p-4">
            <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-[13px] font-medium">
              Page name (in this list)
              <input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} className={FIELD} />
            </label>
            <button type="button" className={BTN_OUTLINE} disabled={pending || title.trim() === props.title} onClick={onRename}>
              Rename
            </button>
          </div>
        )}
        <FieldsEditor fields={def.fields} value={value} onChange={setValue} path="" media={props.media} openDesigner={onOpenDesigner} />
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            {dirty ? <Pill tone="amber">Unsaved edits</Pill> : hasDraft ? <Pill tone="amber">Draft not published</Pill> : <Pill tone="green">Up to date</Pill>}
            {def.legal && <Pill>Legal page</Pill>}
          </div>
          <p className="text-[12.5px] text-muted-foreground">{props.status}</p>
          <button type="button" className={BTN} disabled={pending || !dirty} onClick={onSave}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save draft
          </button>
          <button type="button" className={BTN_OUTLINE} disabled={pending} onClick={onPreview}>
            Preview on the site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <label className="flex flex-col gap-1 text-[12.5px] font-medium">
              What changed (optional)
              <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className={FIELD} placeholder="e.g. New mentoring prices" />
            </label>
            {def.legal && (
              <label className="flex items-start gap-2 text-[12.5px]">
                <input type="checkbox" checked={legalOk} onChange={(e) => setLegalOk(e.target.checked)} className="mt-0.5 h-4 w-4" />
                I have checked this legal text (ideally with a lawyer) and it is ready to go live.
              </label>
            )}
            <button type="button" className={BTN} disabled={pending || (!dirty && !hasDraft)} onClick={onPublish}>
              Publish
            </button>
          </div>
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`text-[12.5px] ${msg.ok ? "text-success" : "text-danger"}`}>
              {msg.text}
            </p>
          )}
          <div className="flex flex-col gap-2 border-t border-border pt-3 text-[12.5px]">
            {props.published && (
              <a href={def.path} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                View the live page
              </a>
            )}
            {hasDraft && (
              <button type="button" className="w-fit underline underline-offset-4" disabled={pending} onClick={onDiscard}>
                Discard draft
              </button>
            )}
            {!props.custom && props.version > 0 && (
              <button type="button" className="w-fit underline underline-offset-4" disabled={pending} onClick={onReset}>
                Reset to the original copy
              </button>
            )}
            {props.custom && (
              <button type="button" className="w-fit text-danger underline underline-offset-4" disabled={pending} onClick={onDelete}>
                Delete this page
              </button>
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <h2 className="text-[13.5px] font-semibold">History</h2>
          {props.versions.length === 0 ? (
            <p className="mt-2 text-[12.5px] text-muted-foreground">Nothing published yet. The page shows its original copy.</p>
          ) : (
            <ol className="mt-2 flex flex-col gap-2">
              {props.versions.map((v) => (
                <li key={v.version} className="flex items-start justify-between gap-2 text-[12.5px]">
                  <span>
                    <span className="font-medium">Version {v.version}</span> · {v.createdAt}
                    {v.by && <span className="block text-muted-foreground">by {v.by}</span>}
                    {(v.note || v.reset) && <span className="block text-muted-foreground">{v.note ?? "Original copy"}</span>}
                  </span>
                  <button type="button" className="shrink-0 underline underline-offset-4" disabled={pending} onClick={() => onRestore(v.version)}>
                    Restore
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}
