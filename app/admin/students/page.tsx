import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { EnrolControl } from "@/components/admin/EnrolControl";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Students" };

export default async function StudentsPage() {
  await requireAdmin();

  const [users, programs] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        enrolments: {
          where: { state: "ACTIVE" },
          include: { program: { select: { id: true, name: true } } },
        },
        _count: { select: { progress: true } },
      },
    }),
    prisma.program.findMany({
      where: { state: "PUBLISHED" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Students</p>
          <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">People</h1>
        </div>
        <p className="max-w-[54ch] text-micro leading-relaxed text-muted-foreground">
          Access is granted here. That stays true after payments land: corporate cohorts,
          comped seats and support recovery all need a human to be able to grant a seat.
        </p>
      </header>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
        <Table className="min-w-[62rem]">
          <TableHeader>
            <TableRow>
              <TableHead className="label-caps px-4">Person</TableHead>
              <TableHead className="label-caps px-4">Role</TableHead>
              <TableHead className="label-caps px-4">Verified</TableHead>
              <TableHead className="label-caps px-4">Enrolled on</TableHead>
              <TableHead className="label-caps px-4 text-right">Lessons touched</TableHead>
              <TableHead className="label-caps px-4">Grant access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const enrolledIds = new Set(u.enrolments.map((e) => e.program.id));
              const available = programs.filter((p) => !enrolledIds.has(p.id));
              return (
                <TableRow key={u.id}>
                  <TableCell className="px-4">
                    <span className="block text-[13.5px] font-medium">{u.name}</span>
                    <span className="text-data block text-micro text-muted-foreground">{u.email}</span>
                  </TableCell>
                  <TableCell className="text-data px-4 text-micro">{u.role}</TableCell>
                  <TableCell className="px-4">
                    <Badge
                      className={`rounded-full border-transparent text-micro ${
                        u.emailVerified
                          ? "bg-success-bg text-success"
                          : "bg-warning-bg text-warning"
                      }`}
                    >
                      {u.emailVerified ? "yes" : "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 text-micro text-muted-foreground">
                    {u.enrolments.length === 0
                      ? "—"
                      : u.enrolments.map((e) => e.program.name).join(", ")}
                  </TableCell>
                  <TableCell className="text-data px-4 text-right text-[13px]">
                    {u._count.progress}
                  </TableCell>
                  <TableCell className="px-4">
                    <EnrolControl userId={u.id} programs={available} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
