import Link from "next/link";
import { requireTrainer } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Trainer Studio" };

export default async function StudioPage() {
  await requireTrainer();

  const programs = await prisma.program.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { select: { id: true, state: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <p className="label-caps">Authoring</p>
      <h1 className="mt-2 text-[clamp(1.7rem,3vw,2.3rem)] leading-tight">Programs</h1>
      <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
        Build the curriculum, write the lessons, set the questions, publish. A published
        lesson is visible to every enrolled student immediately.
      </p>

      <div className="mt-9 grid gap-4 md:grid-cols-2">
        {programs.map((p) => {
          const lessons = p.modules.flatMap((m) => m.lessons);
          const published = lessons.filter((l) => l.state === "PUBLISHED").length;
          const drafts = lessons.length - published;
          return (
            <Card key={p.id} className="gap-0 py-0">
              <CardHeader className="gap-0 border-b border-border px-5 py-4 [.border-b]:pb-4">
                <span className="text-data text-micro text-muted-foreground">
                  {p.tier} · Level {p.level}
                </span>
                <h2 className="mt-1.5 text-[1.2rem] leading-snug">{p.name}</h2>
              </CardHeader>
              <CardContent className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border-transparent bg-secondary text-micro text-secondary-foreground">
                    {p.modules.length} modules
                  </Badge>
                  <Badge className="rounded-full border-transparent bg-success-bg text-micro text-success">
                    {published} published
                  </Badge>
                  {drafts > 0 && (
                    <Badge className="rounded-full border-transparent bg-warning-bg text-micro text-warning">
                      {drafts} draft
                    </Badge>
                  )}
                </div>
                <Link
                  href={`/studio/${p.slug}`}
                  className="mt-5 inline-flex min-h-10 items-center rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  Open curriculum
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
