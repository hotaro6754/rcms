import { z } from "zod";
import { safeHref } from "@/lib/links";
import { videoEmbedUrl } from "@/lib/cms/video";

/**
 * Designed content: the drag-and-drop layouts made in the visual designer (lesson design
 * blocks and custom website pages).
 *
 * A design is a tree of components from a fixed list. Each component's props are checked
 * here before anything is stored: text is plain text or the restricted Markdown in
 * lib/cms/markdown.tsx, colours are hex values, sizes come from fixed scales, links are
 * site paths, https, mailto or anchors, and images are media-library ids. There is no HTML,
 * CSS or script anywhere in a design, so a design can change how content looks and is laid
 * out but cannot run code or load anything from elsewhere.
 *
 * Pure module: used by the server (validation), the designer and the renderers.
 */

export const LIMITS = { nodes: 800, depth: 7, text: 300_000 } as const;

// A colour that is not a six-digit hex value is dropped (the theme colour applies).
const hex = z
  .string()
  .trim()
  .regex(/^(#[0-9a-fA-F]{6})?$/)
  .catch("")
  .default("");
const str = (max: number) => z.string().max(max).default("");
const md = (max = 20_000) => z.string().max(max, `Text must be ${max} characters or fewer.`).default("");
const int = (min: number, max: number, def: number) => z.coerce.number().int().min(min).max(max).catch(def).default(def);
const oneOf = <T extends readonly [string, ...string[]]>(values: T, def: T[number]) => z.enum(values).catch(def).default(def);
const href = z
  .string()
  .trim()
  .max(500)
  .default("")
  .refine((h) => h === "" || safeHref(h), "Links must start with /, #, https:// or mailto:.");
const mediaId = z
  .string()
  .trim()
  .regex(/^([a-z0-9]{10,40})?$/i, "Choose an image from the media library.")
  .default("");

export const FONT_SIZES = ["", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"] as const;
export const FONTS = ["", "display", "sans", "serif", "mono"] as const;
export const WEIGHTS = ["", "400", "500", "600", "700", "800"] as const;
export const ALIGNS = ["", "left", "center", "right", "justify"] as const;
export const TONES = ["info", "tip", "warning", "compliance"] as const;

/** Visual settings any component can carry. Empty values mean "use the theme". */
const StyleShape = z.object({
    color: hex,
    background: hex,
    border: hex,
    align: oneOf(ALIGNS, ""),
    size: oneOf(FONT_SIZES, ""),
    weight: oneOf(WEIGHTS, ""),
    font: oneOf(FONTS, ""),
    italic: z.boolean().catch(false).default(false),
    uppercase: z.boolean().catch(false).default(false),
    padding: int(0, 160, 0),
    radius: int(0, 48, 0),
});
export const Style = StyleShape.catch(() => StyleShape.parse({})).default(() => StyleShape.parse({}));
export type StyleValue = z.infer<typeof Style>;

const item = <T extends z.ZodRawShape>(shape: T, max: number) => z.array(z.object(shape)).max(max).default([]);

/** Free-placed items on a canvas. Positions are percentages of the canvas, so it scales. */
export const CanvasItem = z.object({
  id: z.string().max(40).default(""),
  kind: oneOf(["text", "heading", "image", "shape", "badge"] as const, "text"),
  x: z.coerce.number().min(0).max(100).catch(0).default(0),
  y: z.coerce.number().min(0).max(100).catch(0).default(0),
  w: z.coerce.number().min(2).max(100).catch(30).default(30),
  h: z.coerce.number().min(2).max(100).catch(20).default(20),
  z: int(0, 50, 1),
  text: md(4000),
  mediaId,
  alt: str(300),
  style: Style,
});
export type CanvasItemValue = z.infer<typeof CanvasItem>;

/** Props of each component, without its slots (child areas). */
export const COMPONENTS = {
  Section: z.object({ style: Style, width: oneOf(["narrow", "normal", "wide", "full"] as const, "normal") }),
  Columns: z.object({
    columns: oneOf(["2", "3", "4"] as const, "2"),
    ratio: oneOf(["equal", "wide-left", "wide-right"] as const, "equal"),
    gap: int(0, 96, 24),
    align: oneOf(["start", "center", "end", "stretch"] as const, "start"),
    style: Style,
  }),
  Canvas: z.object({
    canvas: z
      .object({
        height: int(120, 2000, 480),
        background: hex,
        mobile: oneOf(["stack", "scale"] as const, "stack"),
        items: z.array(CanvasItem).max(60, "A canvas can hold at most 60 items.").default([]),
      })
      .default({ height: 480, background: "", mobile: "stack", items: [] }),
  }),
  Heading: z.object({ text: str(300), level: oneOf(["1", "2", "3", "4"] as const, "2"), style: Style }),
  Text: z.object({ text: md(), style: Style }),
  Image: z.object({
    mediaId,
    alt: str(300),
    caption: str(300),
    width: int(10, 100, 100),
    align: oneOf(["left", "center", "right"] as const, "center"),
    rounded: z.boolean().catch(false).default(false),
  }),
  Video: z.object({
    url: z
      .string()
      .trim()
      .max(500)
      .default("")
      .refine((u) => u === "" || !!videoEmbedUrl(u), "Video can be embedded from YouTube, Vimeo, Bunny Stream, Mux or Cloudflare Stream."),
    title: str(200),
  }),
  Button: z.object({ label: str(120), href, variant: oneOf(["solid", "outline", "link"] as const, "solid"), align: oneOf(["left", "center", "right"] as const, "left"), style: Style }),
  Callout: z.object({ tone: oneOf(TONES, "info"), title: str(200), text: md(4000) }),
  Quote: z.object({ text: md(2000), cite: str(200), style: Style }),
  List: z.object({ marker: oneOf(["bullet", "number", "check"] as const, "bullet"), items: item({ text: md(1000) }, 60), style: Style }),
  Table: z.object({ caption: str(200), header: str(1000), rows: item({ cells: str(4000) }, 80), style: Style }),
  Stats: z.object({ columns: oneOf(["2", "3", "4"] as const, "3"), accent: hex, items: item({ value: str(40), label: str(120), note: str(300) }, 12) }),
  Process: z.object({ title: str(200), accent: hex, steps: item({ title: str(160), body: md(1500) }, 12) }),
  Timeline: z.object({ accent: hex, items: item({ when: str(80), title: str(160), body: md(1500) }, 30) }),
  Cards: z.object({ columns: oneOf(["2", "3", "4"] as const, "3"), items: item({ title: str(160), body: md(1500), mediaId }, 24), style: Style }),
  BarChart: z.object({ title: str(200), unit: str(20), color: hex, items: item({ label: str(80), value: z.coerce.number().min(-1e9).max(1e9).catch(0).default(0) }, 24) }),
  Accordion: z.object({ items: item({ title: str(200), body: md(4000) }, 40) }),
  Tabs: z.object({ items: item({ title: str(80), body: md(8000) }, 10) }),
  FlipCards: z.object({ columns: oneOf(["2", "3", "4"] as const, "3"), items: item({ front: str(200), back: md(1000) }, 24) }),
  Reveal: z.object({ prompt: md(2000), answer: md(4000), button: str(60) }),
  KnowledgeCheck: z.object({ question: md(1000), options: item({ text: str(300) }, 8), correct: int(0, 7, 0), explanation: md(2000) }),
  Divider: z.object({ color: hex, spacing: int(0, 96, 24) }),
  Spacer: z.object({ height: int(4, 400, 32) }),
} as const;

export type ComponentType = keyof typeof COMPONENTS;
export const COMPONENT_TYPES = Object.keys(COMPONENTS) as ComponentType[];

/** Child areas each container component has. */
export const SLOTS: Partial<Record<ComponentType, readonly string[]>> = {
  Section: ["content"],
  Columns: ["col1", "col2", "col3", "col4"],
};

export type DesignNode = { type: ComponentType; props: Record<string, unknown> & { id: string } };
export type Design = { root: { props: { title?: string; background?: string } }; content: DesignNode[] };

export const EMPTY_DESIGN: Design = { root: { props: {} }, content: [] };

type Result = { ok: true; design: Design } | { ok: false; error: string };

/**
 * Checks a design from the designer and returns a clean copy (unknown props dropped, out-of-
 * range values clamped to defaults). Fails only for things a person must fix: an unknown
 * component, a bad link or video address, or a design that is too large.
 */
export function validateDesign(input: unknown): Result {
  let nodes = 0;
  let text = 0;
  const fail = (error: string): Result => ({ ok: false, error });
  if (!input || typeof input !== "object") return fail("The design is empty or damaged.");
  const src = input as { root?: { props?: Record<string, unknown> }; content?: unknown };

  function node(raw: unknown, depth: number, where: string): DesignNode | string {
    if (depth > LIMITS.depth) return `Designs can nest at most ${LIMITS.depth} levels deep.`;
    if (++nodes > LIMITS.nodes) return `A design can have at most ${LIMITS.nodes} components. Split it into more lessons or pages.`;
    if (!raw || typeof raw !== "object") return `${where}: a component is damaged.`;
    const { type, props } = raw as { type?: unknown; props?: Record<string, unknown> };
    if (typeof type !== "string" || !(type in COMPONENTS)) return `${where}: “${String(type)}” is not a component the designer offers.`;
    const t = type as ComponentType;
    const parsed = COMPONENTS[t].safeParse(props ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return `${where} › ${t}: ${issue.message}`;
    }
    const clean: Record<string, unknown> = { ...parsed.data, id: typeof props?.id === "string" ? props.id.slice(0, 80) : `${t}-${nodes}` };
    text += JSON.stringify(parsed.data).length;
    for (const slot of SLOTS[t] ?? []) {
      const children = props?.[slot];
      const out: DesignNode[] = [];
      if (Array.isArray(children)) {
        for (const c of children) {
          const r = node(c, depth + 1, `${where} › ${t}`);
          if (typeof r === "string") return r;
          out.push(r);
        }
      }
      clean[slot] = out;
    }
    return { type: t, props: clean as DesignNode["props"] };
  }

  const content: DesignNode[] = [];
  for (const c of Array.isArray(src.content) ? src.content : []) {
    const r = node(c, 1, "Page");
    if (typeof r === "string") return fail(r);
    content.push(r);
  }
  if (text > LIMITS.text) return fail("This design holds too much text for one page. Split it up.");
  const rp = src.root?.props ?? {};
  const bg = typeof rp.background === "string" && /^#[0-9a-fA-F]{6}$/.test(rp.background) ? rp.background : "";
  const title = typeof rp.title === "string" ? rp.title.slice(0, 200) : "";
  return { ok: true, design: { root: { props: { title, background: bg } }, content } };
}

/** Every media-library id a design uses (to check access and to list it with the course). */
export function designMediaIds(design: Design): string[] {
  const ids = new Set<string>();
  walk(design, (n) => {
    const p = n.props as Record<string, unknown>;
    if (typeof p.mediaId === "string" && p.mediaId) ids.add(p.mediaId);
    const lists = [p.items, (p.canvas as { items?: unknown } | undefined)?.items];
    for (const arr of lists) if (Array.isArray(arr)) for (const it of arr) if (it && typeof it.mediaId === "string" && it.mediaId) ids.add(it.mediaId);
  });
  return [...ids];
}

/** All readable text in a design (for search, screening for identifiers, and the assistant). */
export function designText(design: Design): string {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim() && !/^[a-z0-9]{10,40}$/i.test(v) && !/^#[0-9a-f]{6}$/i.test(v)) out.push(v);
  };
  walk(design, (n) => {
    for (const [k, v] of Object.entries(n.props)) {
      if (k === "id" || k === "style" || k === "href" || k === "url") continue;
      if (k === "canvas" && v && typeof v === "object") {
        for (const it of (v as { items?: { text?: unknown; alt?: unknown }[] }).items ?? []) {
          push(it.text);
          push(it.alt);
        }
      } else if (Array.isArray(v)) {
        for (const it of v) if (it && typeof it === "object" && !("type" in it)) for (const [ik, iv] of Object.entries(it)) if (ik !== "id" && ik !== "style") push(iv);
      } else push(v);
    }
  });
  return out.join("\n");
}

export function walk(design: Design, fn: (n: DesignNode) => void) {
  const visit = (n: DesignNode) => {
    fn(n);
    for (const slot of SLOTS[n.type] ?? []) for (const c of (n.props[slot] as DesignNode[] | undefined) ?? []) visit(c);
  };
  for (const n of design.content) visit(n);
}

export function countNodes(design: Design) {
  let n = 0;
  walk(design, () => n++);
  return n;
}
