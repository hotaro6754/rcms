"use client";

import { useState } from "react";
import { ALIGNS, FONT_SIZES, FONTS, WEIGHTS, type StyleValue } from "@/lib/design/schema";
import { contrast } from "./style";

/** Custom controls for the designer's settings panel. */

export type MediaOption = { id: string; title: string; url: string };

const INPUT = "min-h-9 w-full rounded-[3px] border border-input bg-white px-2 text-[13px]";
const LABEL = "flex flex-col gap-1 text-[12px] font-medium text-[#333]";

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <div className={LABEL}>
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" aria-label={`${label}: pick`} value={value || "#ffffff"} onChange={(e) => (setText(e.target.value), onChange(e.target.value))} className="h-9 w-10 cursor-pointer rounded border border-input bg-white p-0.5" />
        <input
          aria-label={`${label}: hex value`}
          value={text}
          placeholder="Theme"
          onChange={(e) => {
            setText(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value) || e.target.value === "") onChange(e.target.value);
          }}
          className={INPUT}
        />
        {value && (
          <button type="button" className="text-[12px] underline" onClick={() => (setText(""), onChange(""))}>
            Clear
          </button>
        )}
      </span>
    </div>
  );
}

export function MediaPicker({ value, onChange, media }: { value: string; onChange: (v: string) => void; media: MediaOption[] }) {
  const cur = media.find((m) => m.id === value);
  return (
    <div className="flex flex-col gap-2">
      {cur ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cur.url} alt="" className="max-h-32 w-full rounded border border-input object-contain" />
      ) : (
        <span className="text-[12px] text-[#666]">{value ? "Image not in the library any more" : "No image chosen"}</span>
      )}
      <select aria-label="Image" value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
        <option value="">No image</option>
        {media.map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}
          </option>
        ))}
      </select>
      <span className="text-[11.5px] text-[#666]">Upload images in Learning › Media library{media.length === 0 ? " first" : ""}.</span>
    </div>
  );
}

export function StyleEditor({ value, onChange }: { value: Partial<StyleValue> | undefined; onChange: (v: Partial<StyleValue>) => void }) {
  const v = value ?? {};
  const set = (k: keyof StyleValue, x: unknown) => onChange({ ...v, [k]: x });
  const ratio = v.color && v.background ? contrast(v.color, v.background) : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <label className={LABEL}>
          Font
          <select value={v.font ?? ""} onChange={(e) => set("font", e.target.value)} className={INPUT}>
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f ? f[0].toUpperCase() + f.slice(1) : "Theme"}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Size
          <select value={v.size ?? ""} onChange={(e) => set("size", e.target.value)} className={INPUT}>
            {FONT_SIZES.map((f) => (
              <option key={f} value={f}>
                {f || "Theme"}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Weight
          <select value={v.weight ?? ""} onChange={(e) => set("weight", e.target.value)} className={INPUT}>
            {WEIGHTS.map((f) => (
              <option key={f} value={f}>
                {f || "Theme"}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Alignment
          <select value={v.align ?? ""} onChange={(e) => set("align", e.target.value)} className={INPUT}>
            {ALIGNS.map((f) => (
              <option key={f} value={f}>
                {f || "Theme"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-[12px]">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={!!v.italic} onChange={(e) => set("italic", e.target.checked)} /> Italic
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={!!v.uppercase} onChange={(e) => set("uppercase", e.target.checked)} /> Capitals
        </label>
      </div>
      <ColorInput label="Text colour" value={v.color ?? ""} onChange={(x) => set("color", x)} />
      <ColorInput label="Background" value={v.background ?? ""} onChange={(x) => set("background", x)} />
      <ColorInput label="Border" value={v.border ?? ""} onChange={(x) => set("border", x)} />
      {ratio !== null && ratio < 4.5 && (
        <p role="alert" className="rounded border border-amber-500 bg-amber-50 px-2 py-1.5 text-[12px] text-amber-900">
          Text and background contrast is {ratio.toFixed(1)}:1. Aim for at least 4.5:1 so everyone can read it.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <label className={LABEL}>
          Padding (px)
          <input type="number" min={0} max={160} value={v.padding ?? 0} onChange={(e) => set("padding", Number(e.target.value))} className={INPUT} />
        </label>
        <label className={LABEL}>
          Corner radius (px)
          <input type="number" min={0} max={48} value={v.radius ?? 0} onChange={(e) => set("radius", Number(e.target.value))} className={INPUT} />
        </label>
      </div>
    </div>
  );
}
