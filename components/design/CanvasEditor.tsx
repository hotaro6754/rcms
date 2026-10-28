"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CanvasItemValue } from "@/lib/design/schema";
import { css } from "./style";
import { CanvasItemView, type DesignContext } from "./views";
import { MediaPicker, StyleEditor, type MediaOption } from "./fields";

/**
 * The free-placement editor for a Canvas component: drag items anywhere, resize them from the
 * corner, and fine-tune position, layering, text and style on the right. Positions are stored
 * as percentages of the canvas, so the layout keeps its proportions at any width.
 */

export type CanvasValue = { height: number; background: string; mobile: string; items: CanvasItemValue[] };

const KINDS: { value: CanvasItemValue["kind"]; label: string }[] = [
  { value: "heading", label: "Heading" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "shape", label: "Shape (coloured box)" },
  { value: "badge", label: "Badge" },
];

const INPUT = "min-h-9 w-full rounded-[3px] border border-input bg-white px-2 text-[13px]";
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n * 10) / 10));
const newId = () => Math.random().toString(36).slice(2, 10);

export function CanvasEditor({ value, onChange, onClose, media, ctx }: { value: CanvasValue; onChange: (v: CanvasValue) => void; onClose: () => void; media: MediaOption[]; ctx: DesignContext }) {
  const [sel, setSel] = useState<string | null>(value.items[0]?.id ?? null);
  const box = useRef<HTMLDivElement>(null);
  const items = value.items;
  const cur = items.find((i) => i.id === sel) ?? null;
  const update = (id: string, patch: Partial<CanvasItemValue>) => onChange({ ...value, items: items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  function startDrag(e: React.PointerEvent, it: CanvasItemValue, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    setSel(it.id);
    const rect = box.current!.getBoundingClientRect();
    const start = { x: e.clientX, y: e.clientY, it };
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - start.x) / rect.width) * 100;
      const dy = ((ev.clientY - start.y) / rect.height) * 100;
      if (mode === "move") update(it.id, { x: clamp(start.it.x + dx, 0, 100 - start.it.w), y: clamp(start.it.y + dy, 0, 100 - start.it.h) });
      else update(it.id, { w: clamp(start.it.w + dx, 2, 100 - start.it.x), h: clamp(start.it.h + dy, 2, 100 - start.it.y) });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function nudge(e: React.KeyboardEvent, it: CanvasItemValue) {
    const step = e.shiftKey ? 5 : 0.5;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    update(it.id, { x: clamp(it.x + d[0], 0, 100 - it.w), y: clamp(it.y + d[1], 0, 100 - it.h) });
  }

  const add = (kind: CanvasItemValue["kind"]) => {
    const it: CanvasItemValue = {
      id: newId(),
      kind,
      x: 10,
      y: 10,
      w: kind === "heading" ? 50 : kind === "badge" ? 20 : 30,
      h: kind === "heading" ? 14 : kind === "badge" ? 8 : 30,
      z: Math.max(1, ...items.map((i) => i.z)) + 1,
      text: kind === "heading" ? "Heading" : kind === "text" ? "Write here." : kind === "badge" ? "New" : "",
      mediaId: "",
      alt: "",
      style: { color: "", background: kind === "shape" ? "#e2eae3" : kind === "badge" ? "#161513" : "", border: "", align: "", size: kind === "heading" ? "3xl" : "", weight: "", font: "", italic: false, uppercase: false, padding: kind === "text" ? 8 : 0, radius: kind === "badge" ? 48 : 0 },
    };
    if (kind === "badge") it.style.color = "#ffffff";
    onChange({ ...value, items: [...items, it] });
    setSel(it.id);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Canvas editor" className="fixed inset-0 z-[1000] flex bg-black/60 p-4">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-[#f6f5f2] text-[#161513] shadow-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#ddd] bg-white px-4 py-2.5">
          <strong className="mr-3 text-[14px]">Canvas</strong>
          {KINDS.map((k) => (
            <button key={k.value} type="button" onClick={() => add(k.value)} className="rounded border border-[#ccc] bg-white px-2.5 py-1 text-[12.5px] hover:bg-[#f0f0f0]">
              + {k.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-[12.5px]">
            Height
            <input type="number" min={120} max={2000} step={20} value={value.height} onChange={(e) => onChange({ ...value, height: Math.min(2000, Math.max(120, Number(e.target.value) || 480)) })} className={`${INPUT} w-24`} />
          </label>
          <label className="flex items-center gap-2 text-[12.5px]">
            On phones
            <select value={value.mobile} onChange={(e) => onChange({ ...value, mobile: e.target.value })} className={`${INPUT} w-36`}>
              <option value="stack">Stack in order</option>
              <option value="scale">Shrink the layout</option>
            </select>
          </label>
          <button type="button" onClick={onClose} className="rounded bg-[#161513] px-3 py-1.5 text-[13px] font-medium text-white">
            Done
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto p-6" onPointerDown={() => setSel(null)}>
            <div
              ref={box}
              className="relative mx-auto w-full max-w-[1000px] overflow-hidden rounded border border-[#ccc] bg-white [container-type:inline-size]"
              style={{ aspectRatio: `1000 / ${value.height}`, background: value.background || undefined, backgroundImage: "linear-gradient(#0000000d 1px, transparent 1px), linear-gradient(90deg, #0000000d 1px, transparent 1px)", backgroundSize: "5% 5%" }}
            >
              {[...items]
                .sort((a, b) => a.z - b.z)
                .map((it) => (
                  <div
                    key={it.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${it.kind} ${it.text.slice(0, 30)}`}
                    onPointerDown={(e) => startDrag(e, it, "move")}
                    onKeyDown={(e) => nudge(e, it)}
                    onFocus={() => setSel(it.id)}
                    className={`absolute cursor-move select-none overflow-hidden outline-none ${sel === it.id ? "ring-2 ring-[#2f5d9a]" : "hover:ring-1 hover:ring-[#2f5d9a]/50"}`}
                    style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.w}%`, height: `${it.h}%`, zIndex: it.z, ...css(it.style, { canvas: true }) }}
                  >
                    <CanvasItemView item={it} ctx={ctx} />
                    {sel === it.id && <span onPointerDown={(e) => startDrag(e, it, "resize")} className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize bg-[#2f5d9a]" aria-hidden />}
                  </div>
                ))}
            </div>
            <p className="mx-auto mt-3 max-w-[1000px] text-[12px] text-[#555]">Drag to move, drag the blue corner to resize. With an item selected, arrow keys nudge it (Shift for bigger steps).</p>
          </div>
          <aside className="w-[20rem] shrink-0 overflow-y-auto border-l border-[#ddd] bg-white p-4" onPointerDown={(e) => e.stopPropagation()}>
            {cur ? (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-[12px] font-medium">
                  Type
                  <select value={cur.kind} onChange={(e) => update(cur.id, { kind: e.target.value as CanvasItemValue["kind"] })} className={INPUT}>
                    {KINDS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </label>
                {cur.kind === "image" ? (
                  <>
                    <MediaPicker value={cur.mediaId} media={media} onChange={(v) => update(cur.id, { mediaId: v })} />
                    <label className="flex flex-col gap-1 text-[12px] font-medium">
                      Description for screen readers
                      <input value={cur.alt} maxLength={300} onChange={(e) => update(cur.id, { alt: e.target.value })} className={INPUT} />
                    </label>
                  </>
                ) : cur.kind !== "shape" ? (
                  <label className="flex flex-col gap-1 text-[12px] font-medium">
                    Text
                    <textarea value={cur.text} rows={4} maxLength={4000} onChange={(e) => update(cur.id, { text: e.target.value })} className={`${INPUT} py-1.5`} />
                  </label>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y", "w", "h"] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1 text-[12px] font-medium">
                      {{ x: "Left %", y: "Top %", w: "Width %", h: "Height %" }[k]}
                      <input type="number" step={0.5} min={0} max={100} value={cur[k]} onChange={(e) => update(cur.id, { [k]: clamp(Number(e.target.value), k === "w" || k === "h" ? 2 : 0, 100) })} className={INPUT} />
                    </label>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 text-[12px]">
                  <button type="button" className="rounded border px-2 py-1" onClick={() => update(cur.id, { z: Math.min(50, Math.max(...items.map((i) => i.z)) + 1) })}>
                    Bring to front
                  </button>
                  <button type="button" className="rounded border px-2 py-1" onClick={() => update(cur.id, { z: Math.max(0, Math.min(...items.map((i) => i.z)) - 1) })}>
                    Send to back
                  </button>
                  <button type="button" className="rounded border px-2 py-1" onClick={() => onChange({ ...value, items: [...items, { ...cur, id: newId(), x: clamp(cur.x + 3, 0, 100 - cur.w), y: clamp(cur.y + 3, 0, 100 - cur.h) }] })}>
                    Duplicate
                  </button>
                  <button type="button" className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => (onChange({ ...value, items: items.filter((i) => i.id !== cur.id) }), setSel(null))}>
                    Delete
                  </button>
                </div>
                <StyleEditor value={cur.style} onChange={(st) => update(cur.id, { style: { ...cur.style, ...st } })} />
              </div>
            ) : (
              <p className="text-[13px] text-[#555]">Select an item to change it, or add one from the bar above.</p>
            )}
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
