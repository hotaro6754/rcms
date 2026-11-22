import Link from "next/link";
import { BookOpen, Eye, Layers, Presentation } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { humanSize, isAvailable } from "@/lib/storage";
import { storedPageCount } from "@/lib/documents/pages";
import { LibraryBrowser, type Material } from "@/components/learning/LibraryBrowser";
import s from "./library-page.module.css";
import Image from "next/image";
import emptyArt from "@/public/images/art3d/learn-read.png";

export const metadata = { title: "Library" };

/**
 * Every slide deck and reading from the courses a learner is enrolled on, searchable and
 * filterable. Nothing is downloadable: each card opens the material inside its lesson, on the
 * right format tab, where it is shown page by page with the learner's watermark.
 */
export default async function LibraryPage() {
  const user = await requireUser();

  const programs = await prisma.program.findMany({
    where: { enrolments: { some: { userId: user.id, state: { in: ["ACTIVE", "COMPLETED"] } } } },
    orderBy: { level: "asc" },
    select: {
      slug: true,
      name: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        select: {
          title: true,
          lessons: {
            where: { state: "PUBLISHED", resources: { some: { archivedAt: null, format: { in: ["SLIDES", "READING"] } } } },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              resources: {
                where: { archivedAt: null, format: { in: ["SLIDES", "READING"] } },
                orderBy: { createdAt: "asc" },
                select: { id: true, title: true, format: true, sizeBytes: true, fileKey: true },
              },
            },
          },
        },
      },
    },
  });

  const flat = programs.flatMap((p) => p.modules.flatMap((m) => m.lessons.flatMap((l) => l.resources.map((r) => ({ p, m, l, r })))));
  const items: Material[] = await Promise.all(
    flat.map(async ({ p, m, l, r }) => {
      const ready = isAvailable(r.fileKey);
      const pages = ready ? await storedPageCount(r.fileKey).catch(() => 0) : 0;
      return {
        id: r.id,
        title: r.title,
        format: r.format as "SLIDES" | "READING",
        size: r.sizeBytes ? humanSize(r.sizeBytes) : null,
        pages: pages || null,
        ready,
        course: p.name,
        courseSlug: p.slug,
        module: m.title,
        lesson: l.title,
        lessonId: l.id,
      };
    }),
  );
  const decks = items.filter((i) => i.format === "SLIDES").length;
  const readings = items.length - decks;

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div className={s.heroCopy}>
          <p className="x-kicker">Library</p>
          <h1 className={`x-display ${s.title}`}>Slides and reading, in one place</h1>
          <p className={s.lede}>Every deck and study document from your courses. Search or filter, then open it inside its lesson.</p>
          <p className={s.viewOnly}>
            <Eye aria-hidden /> View-only: materials open inside RCMExcel and are not downloadable.
          </p>
        </div>
        <dl className={s.stats}>
          <div className="x-slab x-sand">
            <dt>
              <Presentation aria-hidden /> Slide decks
            </dt>
            <dd className="x-fig">{decks}</dd>
          </div>
          <div className="x-slab x-mint">
            <dt>
              <BookOpen aria-hidden /> Readings
            </dt>
            <dd className="x-fig">{readings}</dd>
          </div>
          <div className="x-slab x-night">
            <dt>
              <Layers aria-hidden /> Courses
            </dt>
            <dd className="x-fig">{programs.length}</dd>
          </div>
        </dl>
      </header>

      {programs.length === 0 ? (
        <div className={s.empty}>
          <Image src={emptyArt} alt="" aria-hidden className="x-empty-art" sizes="260px" />
          <p>You are not enrolled on a course yet, so there is nothing here.</p>
          <Link href="/catalog" className={s.emptyBtn}>
            Find your level
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className={s.empty}>
          <p>Your courses have no slide decks or readings yet. They appear here as they are published.</p>
          <Link href="/academy" className={s.emptyBtn}>
            Back to My learning
          </Link>
        </div>
      ) : (
        <LibraryBrowser items={items} />
      )}
    </div>
  );
}
