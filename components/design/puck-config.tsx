"use client";

import { useState, type ReactNode } from "react";
import type { Config, Field, Fields } from "@puckeditor/core";
import { COMPONENTS, type ComponentType, type StyleValue } from "@/lib/design/schema";
import { ComponentView, type DesignContext } from "./views";
import { ColorInput, MediaPicker, StyleEditor, type MediaOption } from "./fields";
import { CanvasEditor, type CanvasValue } from "./CanvasEditor";

/**
 * The designer's component list for Puck. Each component's settings panel is defined here;
 * what it looks like comes from ComponentView, shared with the learner and website renderers.
 * Whatever the designer produces is checked again on the server (lib/design/schema.ts).
 */

const text = (label: string): Field => ({ type: "text", label });
const area = (label: string): Field => ({ type: "textarea", label });
const select = (label: string, options: [string, string][]): Field => ({ type: "select", label, options: options.map(([value, l]) => ({ value, label: l })) });
const num = (label: string, min: number, max: number, step = 1): Field => ({ type: "number", label, min, max, step });
const radio = (label: string, options: [string, string][]): Field => ({ type: "radio", label, options: options.map(([value, l]) => ({ value, label: l })) });

const styleField: Field = {
  type: "custom",
  label: "Style",
  render: ({ value, onChange }) => <StyleEditor value={value as Partial<StyleValue>} onChange={onChange} />,
};
const colorField = (label: string): Field => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => <ColorInput label={label} value={(value as string) ?? ""} onChange={onChange} />,
});
const COLS: [string, string][] = [
  ["2", "2"],
  ["3", "3"],
  ["4", "4"],
];
const ALIGN3: [string, string][] = [
  ["left", "Left"],
  ["center", "Centre"],
  ["right", "Right"],
];
const MD_HELP = "Use **bold**, *italic*, - bullets, 1. numbered lists and [links](https://…).";

function defaults(type: ComponentType) {
  return COMPONENTS[type].parse({}) as Record<string, unknown>;
}

function CanvasButton({ value, onChange, media, ctx }: { value: CanvasValue; onChange: (v: CanvasValue) => void; media: MediaOption[]; ctx: DesignContext }) {
  const [open, setOpen] = useState(false);
  const v = value ?? { height: 480, background: "", mobile: "stack", items: [] };
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen(true)} className="rounded bg-[#161513] px-3 py-2 text-[13px] font-medium text-white">
        Open the canvas editor
      </button>
      <span className="text-[12px] text-[#555]">
        {v.items.length} item{v.items.length === 1 ? "" : "s"} · {v.height}px tall · on phones: {v.mobile === "scale" ? "shrink" : "stack"}
      </span>
      <ColorInput label="Canvas background" value={v.background} onChange={(bg) => onChange({ ...v, background: bg })} />
      {open && <CanvasEditor value={v} onChange={onChange} onClose={() => setOpen(false)} media={media} ctx={ctx} />}
    </div>
  );
}

export function designConfig({ media, ctx }: { media: MediaOption[]; ctx: DesignContext }): Config {
  const mediaField: Field = {
    type: "custom",
    label: "Image",
    render: ({ value, onChange }) => <MediaPicker value={(value as string) ?? ""} media={media} onChange={onChange} />,
  };

  const component = (type: ComponentType, label: string, fields: Fields, slots: string[] = []) => ({
    label,
    fields: { ...fields, ...Object.fromEntries(slots.map((s) => [s, { type: "slot" } as Field])) },
    defaultProps: { ...defaults(type), ...Object.fromEntries(slots.map((s) => [s, []])) },
    render: (props: Record<string, unknown>) => {
      const slotNodes: Record<string, ReactNode> = {};
      for (const s of slots) {
        const Slot = props[s] as (p?: { minEmptyHeight?: number }) => ReactNode;
        slotNodes[s] = typeof Slot === "function" ? <Slot minEmptyHeight={64} /> : null;
      }
      return <ComponentView type={type} props={props} ctx={ctx} slots={slotNodes} />;
    },
  });

  return {
    categories: {
      layout: { title: "Layout", components: ["Section", "Columns", "Canvas", "Spacer", "Divider"] },
      text: { title: "Text", components: ["Heading", "Text", "List", "Quote", "Callout", "Button"] },
      media: { title: "Media", components: ["Image", "Video", "Table"] },
      infographics: { title: "Infographics", components: ["Stats", "Process", "Timeline", "Cards", "BarChart"] },
      interactive: { title: "Interactive", components: ["Accordion", "Tabs", "FlipCards", "Reveal", "KnowledgeCheck"] },
    },
    root: {
      fields: { title: text("Name (for your reference)"), background: colorField("Page background") },
      render: ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-6 p-4">{children}</div>,
    },
    components: {
      Section: component("Section", "Section", { width: select("Width", [["narrow", "Narrow"], ["normal", "Normal"], ["wide", "Wide"], ["full", "Full width"]]), style: styleField }, ["content"]),
      Columns: component(
        "Columns",
        "Columns",
        {
          columns: radio("Columns", COLS),
          ratio: select("Widths (2 columns)", [["equal", "Equal"], ["wide-left", "Wide left"], ["wide-right", "Wide right"]]),
          gap: num("Gap (px)", 0, 96, 4),
          align: select("Vertical alignment", [["start", "Top"], ["center", "Middle"], ["end", "Bottom"], ["stretch", "Stretch"]]),
          style: styleField,
        },
        ["col1", "col2", "col3", "col4"],
      ),
      Canvas: component("Canvas", "Freeform canvas", {
        canvas: {
          type: "custom",
          label: "Canvas",
          render: ({ value, onChange }) => <CanvasButton value={value as CanvasValue} onChange={onChange} media={media} ctx={ctx} />,
        },
      }),
      Heading: component("Heading", "Heading", { text: text("Text"), level: radio("Level", [["1", "H1"], ["2", "H2"], ["3", "H3"], ["4", "H4"]]), style: styleField }),
      Text: component("Text", "Text", { text: { type: "textarea", label: `Text — ${MD_HELP}` }, style: styleField }),
      List: component("List", "List", {
        marker: radio("Marker", [["bullet", "Bullets"], ["number", "Numbers"], ["check", "Ticks"]]),
        items: { type: "array", label: "Items", arrayFields: { text: area("Text") }, defaultItemProps: { text: "" }, getItemSummary: (i: { text?: string }) => i.text?.slice(0, 40) || "Item" },
        style: styleField,
      }),
      Quote: component("Quote", "Quote", { text: area("Quote"), cite: text("Who said it"), style: styleField }),
      Callout: component("Callout", "Callout", { tone: select("Type", [["info", "Note"], ["tip", "Tip"], ["warning", "Warning"], ["compliance", "Compliance"]]), title: text("Title"), text: area("Text") }),
      Button: component("Button", "Button", { label: text("Label"), href: text("Goes to (/page, https://…, mailto:…)"), variant: radio("Look", [["solid", "Solid"], ["outline", "Outline"], ["link", "Link"]]), align: radio("Alignment", ALIGN3), style: styleField }),
      Image: component("Image", "Image", { mediaId: mediaField, alt: text("Description for screen readers"), caption: text("Caption"), width: num("Width (%)", 10, 100, 5), align: radio("Alignment", ALIGN3), rounded: { type: "radio", label: "Corners", options: [{ label: "Square", value: false }, { label: "Rounded", value: true }] } }),
      Video: component("Video", "Video", { url: text("Video link (YouTube, Vimeo, Bunny, Mux, Cloudflare)"), title: text("Title") }),
      Table: component("Table", "Table", {
        caption: text("Caption"),
        header: text("Column headings, separated by |"),
        rows: { type: "array", label: "Rows", arrayFields: { cells: text("Cells, separated by |") }, defaultItemProps: { cells: "" }, getItemSummary: (r: { cells?: string }) => r.cells?.slice(0, 40) || "Row" },
        style: styleField,
      }),
      Stats: component("Stats", "Key numbers", {
        columns: radio("Columns", COLS),
        accent: colorField("Accent colour"),
        items: { type: "array", label: "Numbers", arrayFields: { value: text("Number"), label: text("Label"), note: text("Note") }, defaultItemProps: { value: "0", label: "Label", note: "" }, getItemSummary: (i: { label?: string }) => i.label || "Number" },
      }),
      Process: component("Process", "Process steps", {
        title: text("Title"),
        accent: colorField("Accent colour"),
        steps: { type: "array", label: "Steps", arrayFields: { title: text("Step"), body: area("Description") }, defaultItemProps: { title: "Step", body: "" }, getItemSummary: (i: { title?: string }) => i.title || "Step" },
      }),
      Timeline: component("Timeline", "Timeline", {
        accent: colorField("Accent colour"),
        items: { type: "array", label: "Events", arrayFields: { when: text("When"), title: text("Title"), body: area("Description") }, defaultItemProps: { when: "", title: "Event", body: "" }, getItemSummary: (i: { title?: string }) => i.title || "Event" },
      }),
      Cards: component("Cards", "Cards", {
        columns: radio("Columns", COLS),
        items: { type: "array", label: "Cards", arrayFields: { title: text("Title"), body: area("Text"), mediaId: mediaField }, defaultItemProps: { title: "Card", body: "", mediaId: "" }, getItemSummary: (i: { title?: string }) => i.title || "Card" },
        style: styleField,
      }),
      BarChart: component("BarChart", "Bar chart", {
        title: text("Title"),
        unit: text("Unit (e.g. %)"),
        color: colorField("Bar colour"),
        items: { type: "array", label: "Bars", arrayFields: { label: text("Label"), value: num("Value", -1e9, 1e9, 0.1) }, defaultItemProps: { label: "Item", value: 10 }, getItemSummary: (i: { label?: string }) => i.label || "Bar" },
      }),
      Accordion: component("Accordion", "Accordion", { items: { type: "array", label: "Panels", arrayFields: { title: text("Title"), body: area("Text") }, defaultItemProps: { title: "Question", body: "" }, getItemSummary: (i: { title?: string }) => i.title || "Panel" } }),
      Tabs: component("Tabs", "Tabs", { items: { type: "array", label: "Tabs", arrayFields: { title: text("Tab name"), body: area("Text") }, defaultItemProps: { title: "Tab", body: "" }, getItemSummary: (i: { title?: string }) => i.title || "Tab" } }),
      FlipCards: component("FlipCards", "Flip cards", {
        columns: radio("Columns", COLS),
        items: { type: "array", label: "Cards", arrayFields: { front: text("Front (term or question)"), back: area("Back (definition or answer)") }, defaultItemProps: { front: "Term", back: "" }, getItemSummary: (i: { front?: string }) => i.front || "Card" },
      }),
      Reveal: component("Reveal", "Reveal answer", { prompt: area("Question or prompt"), answer: area("Answer"), button: text("Button label") }),
      KnowledgeCheck: component("KnowledgeCheck", "Knowledge check", {
        question: area("Question"),
        options: { type: "array", label: "Options", arrayFields: { text: text("Option") }, defaultItemProps: { text: "Option" }, getItemSummary: (i: { text?: string }) => i.text || "Option", max: 8 },
        correct: { type: "select", label: "Correct option", options: ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"].map((label, value) => ({ label, value })) },
        explanation: area("Explanation"),
      }),
      Divider: component("Divider", "Divider", { color: colorField("Colour"), spacing: num("Space around (px)", 0, 96, 4) }),
      Spacer: component("Spacer", "Spacer", { height: num("Height (px)", 4, 400, 4) }),
    },
  } as Config;
}
