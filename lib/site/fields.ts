import { z } from "zod";
import { EMPTY_DESIGN, validateDesign, type Design } from "@/lib/design/schema";

/**
 * Editable website content: the shape of each page's copy, its defaults, and how stored
 * edits are checked and read back.
 *
 * A page declares its fields once (lib/site/pages). The defaults are the copy that ships with
 * the code; an administrator's published edits replace them field by field. Everything here
 * is plain text, links and media-library images. No HTML, scripts or styles can be entered,
 * so an edit can change what a page says but not what it does.
 *
 * Pure module: safe for client components (the editor renders forms from these definitions).
 */

export interface TextField {
  kind: "text";
  label: string;
  default: string;
  max: number;
  multiline: boolean;
  optional: boolean;
  help?: string;
}
export interface LinkField {
  kind: "link";
  label: string;
  default: LinkValue;
  help?: string;
}
export interface ImageField {
  kind: "image";
  label: string;
  default: ImageValue;
  /** An optional image may be left empty (src ""), and the page shows its no-image layout. */
  optional: boolean;
  help?: string;
}
export interface ToggleField {
  kind: "toggle";
  label: string;
  default: boolean;
  help?: string;
}
export interface ChoiceField<O extends string = string> {
  kind: "choice";
  label: string;
  options: readonly { value: O; label: string }[];
  default: O;
  help?: string;
}
export interface TextsField {
  kind: "texts";
  label: string;
  default: string[];
  max: number;
  maxItems: number;
  multiline: boolean;
  help?: string;
}
export interface GroupField<F extends Fields = Fields> {
  kind: "group";
  label: string;
  fields: F;
  help?: string;
}
export interface ListField<F extends Fields = Fields> {
  kind: "list";
  label: string;
  fields: F;
  default: ValuesOf<F>[];
  minItems: number;
  maxItems: number;
  /** The item field used as each row's title in the editor. */
  titleField?: keyof F & string;
  help?: string;
}

/** A layout made in the visual designer (custom pages). */
export interface DesignField {
  kind: "design";
  label: string;
  default: Design;
  help?: string;
}
/** A theme colour (six-digit hex). */
export interface ColorField {
  kind: "color";
  label: string;
  default: string;
  help?: string;
}

export type Field = TextField | LinkField | ImageField | ToggleField | ChoiceField | TextsField | GroupField | ListField | DesignField | ColorField;
export type Fields = { [key: string]: Field };

export interface LinkValue {
  label: string;
  href: string;
}
export interface ImageValue {
  /** A path that ships with the site (/media/...) or a public media-library image (/api/media/<id>). */
  src: string;
  alt: string;
}

export type ValueOf<F extends Field> = F extends TextField
  ? string
  : F extends LinkField
    ? LinkValue
    : F extends ImageField
      ? ImageValue
      : F extends ToggleField
        ? boolean
        : F extends DesignField
          ? Design
          : F extends ColorField
            ? string
        : F extends ChoiceField<infer O>
          ? O
          : F extends TextsField
            ? string[]
            : F extends GroupField<infer G>
              ? ValuesOf<G>
              : F extends ListField<infer L>
                ? ValuesOf<L>[]
                : never;

export type ValuesOf<F extends Fields> = { [K in keyof F]: ValueOf<F[K]> };

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

type Opts = { help?: string };

export const text = (label: string, value: string, o: Opts & { max?: number; optional?: boolean } = {}): TextField => ({
  kind: "text",
  label,
  default: value,
  max: o.max ?? 200,
  multiline: false,
  optional: o.optional ?? false,
  help: o.help,
});

export const area = (label: string, value: string, o: Opts & { max?: number; optional?: boolean } = {}): TextField => ({
  kind: "text",
  label,
  default: value,
  max: o.max ?? 2000,
  multiline: true,
  optional: o.optional ?? false,
  help: o.help,
});

export const link = (label: string, value: LinkValue, o: Opts = {}): LinkField => ({ kind: "link", label, default: value, help: o.help });
export const image = (label: string, value: ImageValue, o: Opts & { optional?: boolean } = {}): ImageField => ({
  kind: "image",
  label,
  default: value,
  optional: o.optional ?? false,
  help: o.help,
});
export const toggle = (label: string, value: boolean, o: Opts = {}): ToggleField => ({ kind: "toggle", label, default: value, help: o.help });

export const choice = <O extends string>(label: string, options: readonly { value: O; label: string }[], value: NoInfer<O>, o: Opts = {}): ChoiceField<O> => ({
  kind: "choice",
  label,
  options,
  default: value,
  help: o.help,
});

export const texts = (label: string, value: string[], o: Opts & { max?: number; maxItems?: number; multiline?: boolean } = {}): TextsField => ({
  kind: "texts",
  label,
  default: value,
  max: o.max ?? 2000,
  maxItems: o.maxItems ?? 30,
  multiline: o.multiline ?? true,
  help: o.help,
});

export const design = (label: string, o: Opts = {}): DesignField => ({ kind: "design", label, default: EMPTY_DESIGN, help: o.help });
export const color = (label: string, value: string, o: Opts = {}): ColorField => ({ kind: "color", label, default: value, help: o.help });

export const group = <F extends Fields>(label: string, fields: F, o: Opts = {}): GroupField<F> => ({ kind: "group", label, fields, help: o.help });

export const list = <F extends Fields>(
  label: string,
  fields: F,
  value: ValuesOf<F>[],
  o: Opts & { min?: number; max?: number; titleField?: keyof F & string } = {},
): ListField<F> => ({
  kind: "list",
  label,
  fields,
  default: value,
  minItems: o.min ?? 0,
  maxItems: o.max ?? 40,
  titleField: o.titleField,
  help: o.help,
});

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export interface PageDef<F extends Fields = Fields> {
  key: string;
  /** Where the page lives, for preview and "view page". */
  path: string;
  label: string;
  group: "Site-wide" | "Pages" | "Legal" | "Custom pages";
  /** Legal pages are published only after a second person approves. */
  legal?: boolean;
  description?: string;
  fields: F;
}

export const definePage = <F extends Fields>(def: PageDef<F>): PageDef<F> => def;

export type PageContent<D extends PageDef> = ValuesOf<D["fields"]>;

export function defaultsOf<F extends Fields>(fields: F): ValuesOf<F> {
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(fields)) out[k] = defaultOf(f);
  return out as ValuesOf<F>;
}

export function defaultOf(f: Field): unknown {
  return f.kind === "group" ? defaultsOf(f.fields) : structuredClone(f.default);
}

// ---------------------------------------------------------------------------
// Checking edits
// ---------------------------------------------------------------------------

export { safeHref, safeImageSrc } from "@/lib/links";
import { safeHref, safeImageSrc } from "@/lib/links";

const LINK = z.object({
  label: z.string().trim().max(120, "Keep link text under 120 characters."),
  href: z.string().trim().min(1, "Enter where the link goes.").max(500).refine(safeHref, "Links must start with /, #, https:// or mailto:."),
});
const imageSchema = (optional: boolean) =>
  z.object({
    src: z
      .string()
      .trim()
      .refine((s) => (optional && s === "") || safeImageSrc(s), "Choose an image from the media library."),
    alt: z.string().trim().max(300, "Keep the description under 300 characters."),
  });

export function schemaFor(f: Field): z.ZodType {
  switch (f.kind) {
    case "text": {
      const s = z.string().trim().max(f.max, `“${f.label}” must be ${f.max} characters or fewer.`);
      return f.optional ? s : s.min(1, `“${f.label}” cannot be empty.`);
    }
    case "link":
      return LINK;
    case "image":
      return imageSchema(f.optional);
    case "toggle":
      return z.boolean();
    case "color":
      return z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, `“${f.label}” must be a colour such as #3f6e5e.`);
    case "design":
      return z.unknown().transform((v, ctx) => {
        const r = validateDesign(v);
        if (!r.ok) {
          ctx.addIssue({ code: "custom", message: r.error });
          return z.NEVER;
        }
        return r.design;
      });
    case "choice":
      return z.enum(f.options.map((o) => o.value) as [string, ...string[]]);
    case "texts":
      return z
        .array(z.string().trim().min(1, `Remove empty entries from “${f.label}”.`).max(f.max, `Entries in “${f.label}” must be ${f.max} characters or fewer.`))
        .max(f.maxItems, `“${f.label}” can have at most ${f.maxItems} entries.`);
    case "group":
      return schemaForFields(f.fields);
    case "list":
      return z
        .array(schemaForFields(f.fields))
        .min(f.minItems, `“${f.label}” needs at least ${f.minItems} ${f.minItems === 1 ? "entry" : "entries"}.`)
        .max(f.maxItems, `“${f.label}” can have at most ${f.maxItems} entries.`);
  }
}

export function schemaForFields(fields: Fields) {
  return z.object(Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, schemaFor(f)]))).strict();
}

/**
 * Checks a whole page's content. Returns the cleaned value, or the first problem with a
 * readable path ("Beliefs › 3 › Title cannot be empty").
 */
export function validatePage(def: PageDef, value: unknown): { ok: true; value: Record<string, unknown> } | { ok: false; error: string; path: string } {
  const r = schemaForFields(def.fields).safeParse(value);
  if (r.success) return { ok: true, value: r.data as Record<string, unknown> };
  const issue = r.error.issues[0];
  return { ok: false, error: `${describePath(def.fields, issue.path)}${issue.message}`, path: issue.path.join(".") };
}

function describePath(fields: Fields, path: PropertyKey[]) {
  const parts: string[] = [];
  let cur: Field | undefined;
  let scope: Fields | undefined = fields;
  for (const seg of path.slice(0, -1)) {
    if (typeof seg === "number") {
      parts.push(String(seg + 1));
      continue;
    }
    cur = scope?.[String(seg)];
    if (!cur) break;
    parts.push(cur.label);
    scope = cur.kind === "group" || cur.kind === "list" ? cur.fields : undefined;
  }
  return parts.length ? `${parts.join(" › ")}: ` : "";
}

// ---------------------------------------------------------------------------
// Reading content back
// ---------------------------------------------------------------------------

/**
 * Merges stored content over the defaults, field by field. A stored value that no longer
 * fits its field (the page's fields changed since it was saved, or the row was edited by
 * hand) falls back to the default for that field only, so a bad edit can never break a page.
 */
export function resolvePage<F extends Fields>(fields: F, stored: unknown): ValuesOf<F> {
  const src = isRecord(stored) ? stored : {};
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(fields)) out[k] = resolveField(f, src[k]);
  return out as ValuesOf<F>;
}

function resolveField(f: Field, v: unknown): unknown {
  if (v === undefined) return defaultOf(f);
  if (f.kind === "group") return resolvePage(f.fields, v);
  if (f.kind === "list") {
    if (!Array.isArray(v)) return defaultOf(f);
    const items = v.filter(isRecord).slice(0, f.maxItems).map((item) => resolvePage(f.fields, item));
    return items.length >= f.minItems ? items : defaultOf(f);
  }
  const r = schemaFor(f).safeParse(v);
  return r.success ? r.data : defaultOf(f);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Paths whose value differs between two versions of a page (for "changed" markers). */
export function changedKeys(fields: Fields, a: unknown, b: unknown): Set<string> {
  const out = new Set<string>();
  const ra = resolvePage(fields, a) as Record<string, unknown>;
  const rb = resolvePage(fields, b) as Record<string, unknown>;
  for (const k of Object.keys(fields)) if (JSON.stringify(ra[k]) !== JSON.stringify(rb[k])) out.add(k);
  return out;
}

/** Splits multi-paragraph text on blank lines, for rendering as separate paragraphs. */
export function paragraphs(s: string) {
  return s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
