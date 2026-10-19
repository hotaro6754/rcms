"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { FIELD, TEXTAREA } from "@/components/admin/kit";
import { defaultOf, defaultsOf, type Field, type Fields, type ImageValue, type LinkValue } from "@/lib/site/fields";

export type MediaOption = { src: string; title: string; alt: string };

type Common = { path: string; media: MediaOption[]; openDesigner?: (path: string) => void };

const id = (path: string) => `f-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`;
const SMALL_BTN = "inline-flex min-h-8 items-center gap-1 rounded-[3px] border border-input bg-card px-2 text-[12px] hover:bg-secondary disabled:opacity-40";

/** One field of a page, rendered from its definition. */
export function FieldEditor({ field, value, onChange, path, media, openDesigner }: Common & { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const help = field.help && <p className="text-[12px] text-muted-foreground">{field.help}</p>;
  const label = (
    <label htmlFor={id(path)} className="text-[13px] font-medium">
      {field.label}
    </label>
  );

  switch (field.kind) {
    case "color": {
      const v = String(value ?? field.default);
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <span className="flex items-center gap-2">
            <input type="color" aria-label={`${field.label}: pick`} value={/^#[0-9a-f]{6}$/i.test(v) ? v : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded-[3px] border border-input bg-card p-0.5" />
            <input id={id(path)} value={v} maxLength={7} onChange={(e) => onChange(e.target.value)} className={`${FIELD} max-w-[9rem] font-mono`} />
            {v !== field.default && (
              <button type="button" className="text-[12px] underline underline-offset-2" onClick={() => onChange(field.default)}>
                Use original
              </button>
            )}
          </span>
          {help}
        </div>
      );
    }
    case "design": {
      const n = (value as { content?: unknown[] } | undefined)?.content?.length ?? 0;
      return (
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-[13px] font-medium">{field.label}</p>
          <p className="text-[12.5px] text-muted-foreground">{n ? `${n} section${n === 1 ? "" : "s"} designed.` : "Nothing designed yet."} Arrange sections, columns, images, infographics and interactive parts, and place anything freely on a canvas.</p>
          <button type="button" className="w-fit rounded-[3px] bg-primary px-3 py-2 text-[13px] font-medium text-primary-foreground" onClick={() => openDesigner?.(path)}>
            Open the visual designer
          </button>
          {help}
        </div>
      );
    }
    case "text": {
      const v = String(value ?? "");
      const changed = v !== field.default;
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {label}
            <span className="text-[11.5px] text-muted-foreground">
              {v.length}/{field.max}
              {changed && field.default !== "" && (
                <button type="button" className="ml-3 underline underline-offset-2" onClick={() => onChange(field.default)}>
                  Use original
                </button>
              )}
            </span>
          </div>
          {field.multiline ? (
            <textarea id={id(path)} value={v} maxLength={field.max} rows={Math.min(10, Math.max(3, Math.ceil(v.length / 90)))} onChange={(e) => onChange(e.target.value)} className={TEXTAREA} />
          ) : (
            <input id={id(path)} value={v} maxLength={field.max} onChange={(e) => onChange(e.target.value)} className={FIELD} />
          )}
          {help}
        </div>
      );
    }
    case "toggle":
      return (
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-[13px] font-medium">
            <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
            {field.label}
          </label>
          {help}
        </div>
      );
    case "choice":
      return (
        <div className="flex flex-col gap-1.5">
          {label}
          <select id={id(path)} value={String(value)} onChange={(e) => onChange(e.target.value)} className={FIELD}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {help}
        </div>
      );
    case "link": {
      const v = (value ?? field.default) as LinkValue;
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-medium">{field.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
              Link text
              <input value={v.label} maxLength={120} onChange={(e) => onChange({ ...v, label: e.target.value })} className={FIELD} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
              Goes to
              <input value={v.href} maxLength={500} placeholder="/contact or https://…" onChange={(e) => onChange({ ...v, href: e.target.value })} className={FIELD} />
            </label>
          </div>
          {help}
        </fieldset>
      );
    }
    case "image": {
      const v = (value ?? field.default) as ImageValue;
      const options = [...(field.optional ? [{ src: "", title: "No image", alt: "" }] : []), ...(field.default.src ? [{ src: field.default.src, title: "Original image", alt: field.default.alt }] : []), ...media];
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-medium">{field.label}</legend>
          <div className="flex flex-wrap items-start gap-3">
            {v.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.src} alt="" className="h-20 w-28 rounded-[3px] border border-border object-cover" />
            ) : (
              <span className="grid h-20 w-28 place-items-center rounded-[3px] border border-dashed border-border text-[11px] text-muted-foreground">No image</span>
            )}
            <div className="flex min-w-[16rem] flex-1 flex-col gap-2">
              <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
                Image
                <select
                  value={v.src}
                  onChange={(e) => {
                    const pick = options.find((o) => o.src === e.target.value);
                    onChange({ src: e.target.value, alt: v.alt || pick?.alt || "" });
                  }}
                  className={FIELD}
                >
                  {!options.some((o) => o.src === v.src) && <option value={v.src}>Current image</option>}
                  {options.map((o) => (
                    <option key={o.src || "none"} value={o.src}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[12px] text-muted-foreground">
                Description for screen readers
                <input value={v.alt} maxLength={300} onChange={(e) => onChange({ ...v, alt: e.target.value })} className={FIELD} />
              </label>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">Upload new images in the media library and tick “Public”; they then appear in this list.</p>
          {help}
        </fieldset>
      );
    }
    case "texts": {
      const items = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-medium">{field.label}</legend>
          {items.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <label className="sr-only" htmlFor={id(`${path}.${i}`)}>
                {field.label} {i + 1}
              </label>
              {field.multiline ? (
                <textarea id={id(`${path}.${i}`)} value={t} rows={3} maxLength={field.max} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={TEXTAREA} />
              ) : (
                <input id={id(`${path}.${i}`)} value={t} maxLength={field.max} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} className={FIELD} />
              )}
              <RowButtons i={i} n={items.length} label={`${field.label} ${i + 1}`} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
            </div>
          ))}
          <button type="button" disabled={items.length >= field.maxItems} className={`${SMALL_BTN} w-fit`} onClick={() => onChange([...items, ""])}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
          </button>
          {help}
        </fieldset>
      );
    }
    case "group":
      return (
        <fieldset className="flex flex-col gap-4 rounded-[var(--radius)] border border-border p-4">
          <legend className="px-1 text-[13.5px] font-semibold">{field.label}</legend>
          {help}
          <FieldsEditor fields={field.fields} value={value as Record<string, unknown>} onChange={onChange} path={path} media={media} openDesigner={openDesigner} />
        </fieldset>
      );
    case "list": {
      const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      const title = (item: Record<string, unknown>, i: number) => {
        const t = field.titleField ? String(item[field.titleField] ?? "") : "";
        return `${i + 1}. ${t.trim().slice(0, 70) || "Untitled"}`;
      };
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-medium">
            {field.label} <span className="font-normal text-muted-foreground">({items.length})</span>
          </legend>
          {help}
          {items.map((item, i) => (
            <details key={i} className="rounded-[3px] border border-border bg-card">
              <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-[13px]">
                <span className="min-w-0 truncate">{title(item, i)}</span>
                <RowButtons i={i} n={items.length} label={title(item, i)} min={field.minItems} onMove={(to) => onChange(move(items, i, to))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
              </summary>
              <div className="border-t border-border p-3">
                <FieldsEditor fields={field.fields} value={item} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} path={`${path}.${i}`} media={media} />
              </div>
            </details>
          ))}
          <button
            type="button"
            disabled={items.length >= field.maxItems}
            className={`${SMALL_BTN} w-fit`}
            onClick={() => onChange([...items, field.default[0] ? blankLike(field.fields) : defaultsOf(field.fields)])}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add to {field.label.toLowerCase()}
          </button>
        </fieldset>
      );
    }
  }
}

export function FieldsEditor({ fields, value, onChange, path, media, openDesigner }: Common & { fields: Fields; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(fields).map(([k, f]) => (
        <FieldEditor key={k} field={f} value={value?.[k]} path={path ? `${path}.${k}` : k} media={media} openDesigner={openDesigner} onChange={(v) => onChange({ ...value, [k]: v })} />
      ))}
    </div>
  );
}

function RowButtons({ i, n, label, min = 0, onMove, onRemove }: { i: number; n: number; label: string; min?: number; onMove: (to: number) => void; onRemove: () => void }) {
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };
  return (
    <span className="flex shrink-0 gap-1">
      <button type="button" aria-label={`Move ${label} up`} disabled={i === 0} className={SMALL_BTN} onClick={stop(() => onMove(i - 1))}>
        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button type="button" aria-label={`Move ${label} down`} disabled={i === n - 1} className={SMALL_BTN} onClick={stop(() => onMove(i + 1))}>
        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button type="button" aria-label={`Remove ${label}`} disabled={n <= min} className={SMALL_BTN} onClick={stop(onRemove)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

function move<T>(arr: T[], from: number, to: number) {
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/** A new list entry: empty text, but choices, toggles, links and images keep their defaults. */
function blankLike(fields: Fields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(fields)) {
    if (f.kind === "text") out[k] = "";
    else if (f.kind === "texts") out[k] = [];
    else if (f.kind === "list") out[k] = [];
    else if (f.kind === "group") out[k] = blankLike(f.fields);
    else if (f.kind === "design") out[k] = structuredClone(f.default);
    else out[k] = defaultOf(f);
  }
  return out;
}
