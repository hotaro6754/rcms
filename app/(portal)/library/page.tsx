import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { humanSize, isAvailable, typeLabel } from "@/lib/storage";
import { PageHead, Ruled } from "@/components/platform/PlatformShell";

export const metadata = { title: "Library" };

/**
 * Every material from the programs a student is enrolled on, in curriculum order: program,
 * then module, then the lesson it belongs to. Downloads go through the access-checked
 * route, so a link copied out of here is useless to anyone not enrolled.
 */
export default async function LibraryPage() {
  const user = await requireUser();

  const programs = await prisma.program.findMany({
    where: {
      enrolments: {
        some: { userId: user.id, state: { in: ["ACTIVE", "COMPLETED"] } },
      },
    },
    orderBy: { level: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      level: true,
      modules: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            where: { state: "PUBLISHED", resources: { some: {} } },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              resources: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  title: true,
                  mimeType: true,
                  sizeBytes: true,
                  fileKey: true,
                  downloadable: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const count = programs.reduce(
    (n, p) =>
      n +
      p.modules.reduce(
        (m, mod) =>
          m + mod.lessons.reduce((k, l) => k + l.resources.filter((r) => isAvailable(r.fileKey)).length, 0),
        0,
      ),
    0,
  );

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <PageHead
        kicker="Library"
        title="Course materials"
        lede={
          count
            ? `${count} ${count === 1 ? "material" : "materials"} ready across your programs: SOPs, templates, worked examples and reference sheets.`
            : "Materials your trainers attach to lessons collect here, in the order the curriculum uses them."
        }
      />

      {programs.length === 0 && (
        <p className="mt-10 text-[15px] text-muted-foreground">
          You are not enrolled on a program yet.{" "}
          <Link href="/learning-paths" className="underline underline-offset-4">
            Find your level
          </Link>
          .
        </p>
      )}

      <div className="mt-12 flex flex-col gap-16">
        {programs.map((p) => {
          const modules = p.modules.filter((m) => m.lessons.length > 0);
          return (
            <Ruled
              key={p.id}
              label={`Level ${String(p.level).padStart(2, "0")} · ${p.name}`}
              aside={
                <Link
                  href={`/academy/${p.slug}`}
                  className="text-data text-[10.5px] tracking-[0.1em] text-subtle hover:text-foreground"
                >
                  CURRICULUM →
                </Link>
              }
            >
              {modules.length === 0 ? (
                <p className="py-5 text-[14px] text-muted-foreground">
                  No materials attached to this program yet.
                </p>
              ) : (
                modules.map((m) => (
                  <div
                    key={m.id}
                    className="grid gap-x-10 border-b border-border py-6 md:grid-cols-[16rem_minmax(0,1fr)]"
                  >
                    <h3 className="font-serif-display text-[1.25rem] leading-snug">
                      {m.title}
                    </h3>
                    <ul className="mt-3 md:mt-0">
                      {m.lessons.flatMap((l) =>
                        l.resources.map((r) =>
                          !isAvailable(r.fileKey) ? (
                            <li
                              key={r.id}
                              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-border py-3 last:border-b-0"
                            >
                              <span className="min-w-0">
                                <span className="block text-[14.5px] text-foreground/55">
                                  {r.title}
                                </span>
                                <span className="block text-[12.5px] text-muted-foreground">
                                  {l.title}
                                </span>
                              </span>
                              <span className="text-data text-[10.5px] tracking-[0.08em] text-subtle">
                                NOT YET UPLOADED
                              </span>
                            </li>
                          ) : (
                            <li
                              key={r.id}
                              className="border-b border-border last:border-b-0"
                            >
                              <a
                                // View-only materials are read inside their lesson, not downloaded.
                                href={r.downloadable ? `/api/materials/${r.id}` : `/academy/${p.slug}/${l.id}#material-${r.id}`}
                                className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 py-3"
                              >
                                <span className="min-w-0">
                                  <span className="block text-[14.5px] group-hover:underline group-hover:underline-offset-4">
                                    {r.title}
                                  </span>
                                  <span className="block text-[12.5px] text-muted-foreground">
                                    {l.title}
                                  </span>
                                </span>
                                <span className="text-data text-[10.5px] tracking-[0.08em] text-subtle">
                                  {typeLabel(r.mimeType)}
                                  {r.sizeBytes
                                    ? ` · ${humanSize(r.sizeBytes)}`
                                    : ""}
                                  <span
                                    aria-hidden="true"
                                    className="ml-3 text-foreground"
                                  >
                                    ↓
                                  </span>
                                </span>
                              </a>
                            </li>
                          ),
                        ),
                      )}
                    </ul>
                  </div>
                ))
              )}
            </Ruled>
          );
        })}
      </div>
    </div>
  );
}
