import { z } from "zod";
import type { BlockKind } from "@prisma/client";

/**
 * Content block types and the validation each one gets before it is written.
 *
 * Rich text fields are the restricted Markdown in lib/cms/markdown.tsx. Video is embedded
 * only from an allowlist of hosts and always in a sandboxed iframe; anything else becomes a
 * LINK block. Images must come from the media library and must carry alternative text.
 */

const text = (max: number) => z.string().trim().max(max);
const https = z
  .string()
  .trim()
  .url("That link does not look right.")
  .refine((u) => u.startsWith("https://"), "Links must start with https://.");

export const VIDEO_HOSTS = [
  "www.youtube-nocookie.com",
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
  "iframe.mediadelivery.net",
  "stream.mux.com",
  "customer-",
];

export function videoEmbedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname;
  if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
  if (host.endsWith("youtube.com") || host === "www.youtube-nocookie.com") {
    const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : null);
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com" || host === "iframe.mediadelivery.net" || host === "stream.mux.com") return u.toString();
  if (/^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(host)) return u.toString();
  return null;
}

export const BLOCK_SCHEMAS = {
  TEXT: z.object({ text: text(20_000).min(1, "Write something in the text block.") }),
  HEADING: z.object({ text: text(200).min(1, "A heading needs text."), level: z.coerce.number().int().min(2).max(3).default(2) }),
  CALLOUT: z.object({
    tone: z.enum(["info", "tip", "warning", "compliance"]).default("info"),
    title: text(160).optional(),
    text: text(4_000).min(1, "A callout needs text."),
  }),
  IMAGE: z.object({
    mediaId: z.string().min(1, "Choose an image from the media library."),
    alt: text(300).min(3, "Describe the image for people who cannot see it."),
    caption: text(300).optional(),
  }),
  VIDEO: z
    .object({
      url: https,
      title: text(200).min(3, "Give the video a title."),
      transcript: text(40_000).optional(),
      captions: z.boolean().default(false),
    })
    .refine((v) => !!videoEmbedUrl(v.url), {
      message: "Video can be embedded from YouTube, Vimeo, Bunny Stream, Mux or Cloudflare Stream. Use a link block for anything else.",
      path: ["url"],
    }),
  LINK: z.object({ url: https, label: text(200).min(2, "Give the link a label."), description: text(600).optional() }),
  TABLE: z.object({
    caption: text(200).optional(),
    header: z.array(text(120)).min(1).max(8),
    rows: z.array(z.array(text(400)).max(8)).min(1, "Add at least one row.").max(60),
  }),
  STEPS: z.object({ title: text(200).optional(), steps: z.array(text(1_000).min(1)).min(1, "Add at least one step.").max(30) }),
  SCENARIO: z.object({
    title: text(200).min(3, "Give the scenario a title."),
    context: text(10_000).min(10, "Describe the scenario."),
    question: text(2_000).optional(),
    discussion: text(10_000).optional(),
    synthetic: z.literal(true, { error: "Confirm the scenario uses synthetic data only." }),
  }),
  CODE: z.object({ language: text(40).optional(), code: text(20_000).min(1, "Paste the example.") }),
} satisfies Record<BlockKind, z.ZodType>;

export type BlockData<K extends BlockKind> = z.infer<(typeof BLOCK_SCHEMAS)[K]>;

export const BLOCK_LABEL: Record<BlockKind, string> = {
  TEXT: "Text",
  HEADING: "Heading",
  CALLOUT: "Callout",
  IMAGE: "Image",
  VIDEO: "Video",
  LINK: "Link",
  TABLE: "Table",
  STEPS: "Steps",
  SCENARIO: "Scenario / case study",
  CODE: "Structured example",
};

/** All the human-readable text in a block, for screening and search. */
export function blockText(kind: BlockKind, data: unknown): string {
  const d = (data ?? {}) as Record<string, unknown>;
  const parts: unknown[] = [];
  switch (kind) {
    case "TABLE":
      parts.push(d.caption, ...((d.header as string[]) ?? []), ...(((d.rows as string[][]) ?? []).flat()));
      break;
    case "STEPS":
      parts.push(d.title, ...((d.steps as string[]) ?? []));
      break;
    default:
      parts.push(d.text, d.title, d.caption, d.alt, d.context, d.question, d.discussion, d.code, d.label, d.description, d.transcript);
  }
  return parts.filter((p) => typeof p === "string").join("\n");
}

export function parseBlock(kind: BlockKind, data: unknown) {
  const schema = BLOCK_SCHEMAS[kind] as z.ZodType;
  return schema.safeParse(data);
}
