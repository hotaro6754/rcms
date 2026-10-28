import { prisma } from "@/lib/db";
import { designText, type Design } from "@/lib/design/schema";
import { can, type Actor } from "@/lib/actor";
import { flatLessons, type CourseSnapshot, type SnapshotBlock } from "@/lib/cms/snapshot";
import { courseAccess } from "@/lib/services/learning/catalog";
import { publicEntries, LIBRARY_PATH } from "@/lib/services/cms/library";
import { HELP } from "./help";
import { chunk, type Passage } from "./search";

/**
 * What the assistant may draw on for one person, decided before any search runs:
 *
 * - platform help articles (everyone);
 * - approved library entries (public);
 * - released courses: the catalogue description for every released course; lesson text only for
 *   lessons this person can open (enrolled, subscribed, staff preview, or free preview).
 *
 * Only teaching text is indexed. Assessments (questions and answer keys), case simulations and
 * drafts are never read here, so the assistant cannot leak them however it is asked.
 */

function blockText(b: SnapshotBlock): string {
  const d = b.data as Record<string, unknown>;
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  switch (b.kind) {
    case "TEXT":
    case "HEADING":
      return s("text");
    case "CALLOUT":
      return [s("title"), s("text")].filter(Boolean).join(": ");
    case "STEPS":
      return [s("title"), ...((d.steps as string[]) ?? []).map((x, i) => `${i + 1}. ${x}`)].filter(Boolean).join("\n");
    case "TABLE":
      return [s("caption"), ((d.header as string[]) ?? []).join(" | "), ...((d.rows as string[][]) ?? []).map((r) => r.join(" | "))].filter(Boolean).join("\n");
    case "SCENARIO":
      return [s("title"), s("context"), s("question"), s("discussion")].filter(Boolean).join("\n\n");
    case "VIDEO":
    case "AUDIO":
      return [s("title"), s("transcript")].filter(Boolean).join("\n\n");
    case "IMAGE":
      return [s("alt"), s("caption")].filter(Boolean).join(". ");
    case "LINK":
      return [s("label"), s("description")].filter(Boolean).join(": ");
    case "DESIGN":
      return [s("title"), d.design ? designText(d.design as Design) : ""].filter(Boolean).join("\n\n");
    default:
      // CODE and anything new: not prose; leave out until there is a reason to index it.
      return "";
  }
}

// Released snapshots never change, so their passages can be cached by version.
const lessonCache = new Map<string, { lessonId: string; passages: Passage[] }[]>();

function lessonPassages(courseSlug: string, versionKey: string, s: CourseSnapshot) {
  const hit = lessonCache.get(versionKey);
  if (hit) return hit;
  const out = flatLessons(s).map((l) => {
    const text = [l.objectives.length ? `Objectives: ${l.objectives.join("; ")}` : "", ...l.blocks.map(blockText)].filter(Boolean).join("\n\n");
    return {
      lessonId: l.id,
      passages: chunk(text).map((t, i) => ({
        id: `lesson:${l.id}:${i}`,
        kind: "lesson" as const,
        title: l.title,
        context: `${s.course.name} › ${l.moduleTitle}`,
        href: `/academy/${courseSlug}/${l.id}`,
        text: t,
      })),
    };
  });
  if (lessonCache.size > 200) lessonCache.clear();
  lessonCache.set(versionKey, out);
  return out;
}

export interface Knowledge {
  passages: Passage[];
  /** Lesson passages by lesson id, for "explain this lesson". */
  byLesson: Map<string, Passage[]>;
}

export async function knowledgeFor(actor: Actor): Promise<Knowledge> {
  const passages: Passage[] = [...HELP];
  const byLesson = new Map<string, Passage[]>();

  for (const e of await publicEntries()) {
    passages.push({ id: `library:${e.slug}`, kind: "library", title: e.title, context: "Library", href: `/resources/${LIBRARY_PATH[e.kind]}/${e.slug}`, text: [e.summary, e.body].filter(Boolean).join("\n\n") });
  }

  const courses = await prisma.program.findMany({
    where: { state: "PUBLISHED", publishedVersionId: { not: null } },
    select: { id: true, slug: true, levelId: true, publishedVersion: { select: { id: true, snapshot: true } } },
  });
  const staff = can(actor, "content.view");
  for (const c of courses) {
    const s = c.publishedVersion!.snapshot as unknown as CourseSnapshot;
    passages.push({
      id: `course:${c.id}`,
      kind: "course",
      title: s.course.name,
      context: "Course catalogue",
      href: `/catalog/${c.slug}`,
      text: [s.course.description, s.course.outcomes.length ? `Outcomes: ${s.course.outcomes.join("; ")}` : "", s.course.prerequisites.length ? `Prerequisites: ${s.course.prerequisites.join("; ")}` : ""].filter(Boolean).join("\n\n"),
    });
    const access = staff ? { full: true } : await courseAccess(actor, { id: c.id, levelId: c.levelId, snapshot: s });
    const previews = new Set(flatLessons(s).filter((l) => l.freePreview).map((l) => l.id));
    for (const l of lessonPassages(c.slug, c.publishedVersion!.id, s)) {
      if (!access.full && !previews.has(l.lessonId)) continue;
      passages.push(...l.passages);
      byLesson.set(l.lessonId, l.passages);
    }
  }
  return { passages, byLesson };
}
