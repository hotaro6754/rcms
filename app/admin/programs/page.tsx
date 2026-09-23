import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { inr } from "@/lib/data/catalog";

export const metadata = { title: "Programs" };

export default async function AdminProgramsPage() {
  await requireAdmin();

  const programs = await prisma.program.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      products: { select: { amount: true } },
      modules: {
        orderBy: { sortOrder: "asc" },
        include: { lessons: { select: { id: true, state: true } } },
      },
      _count: { select: { enrolments: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Academy</p>
          <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Programs</h1>
        </div>
        <p className="max-w-[52ch] text-micro leading-relaxed text-muted-foreground">
          Read-only for now. Authoring — drag curriculum, upload video, build quizzes —
          is Trainer Studio in Phase 3.
        </p>
      </header>

      <div className="grid gap-4">
        {programs.map((p) => {
          const lessons = p.modules.flatMap((m) => m.lessons);
          const published = lessons.filter((l) => l.state === "PUBLISHED").length;
          return (
            <Card key={p.id} className="gap-0 py-0">
              <CardHeader className="gap-0 border-b border-border px-5 py-4 [.border-b]:pb-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-data text-micro text-muted-foreground">{p.tier}</span>
                  <h2 className="text-[1.05rem]">{p.name}</h2>
                  <span className="text-data ml-auto text-micro text-muted-foreground">
                    {p.products[0] ? inr(p.products[0].amount / 100) : "no product"}
                    {" · "}
                    {p._count.enrolments} enrolled
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border-transparent bg-secondary text-micro text-secondary-foreground">
                    {p.modules.length} modules
                  </Badge>
                  <Badge
                    className={`rounded-full border-transparent text-micro ${
                      published > 0
                        ? "bg-success-bg text-success"
                        : "bg-warning-bg text-warning"
                    }`}
                  >
                    {published > 0 ? `${published} lessons published` : "no lessons yet"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
