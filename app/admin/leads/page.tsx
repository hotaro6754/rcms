import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Leads" };

const STAGE_TONE: Record<string, string> = {
  NEW: "bg-accent text-accent-foreground",
  QUALIFIED: "bg-warning-bg text-warning",
  CONSULTATION: "bg-warning-bg text-warning",
  WON: "bg-success-bg text-success",
  LOST: "bg-secondary text-muted-foreground",
};

export default async function LeadsPage() {
  await requireAdmin();

  const leads = await prisma.lead.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    include: {
      owner: { select: { name: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 1, select: { kind: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Sales</p>
          <h1 className="mt-2 text-[clamp(1.6rem,2.4vw,2rem)] leading-tight">Leads</h1>
        </div>
        <p className="max-w-[52ch] text-micro leading-relaxed text-muted-foreground">
          Sorted by score, highest first. The pipeline board, behavioural scoring and
          WhatsApp arrive in Phase 5; this is capture and triage.
        </p>
      </header>

      {leads.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-card px-5 py-8">
          <p className="text-[13.5px] text-muted-foreground">
            No leads yet. Every submission on the public contact form lands here with a score
            and an activity record.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
          <Table className="min-w-[58rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="label-caps px-4">Name</TableHead>
                <TableHead className="label-caps px-4">Role now</TableHead>
                <TableHead className="label-caps px-4">Interested in</TableHead>
                <TableHead className="label-caps px-4">Source</TableHead>
                <TableHead className="label-caps px-4 text-right">Score</TableHead>
                <TableHead className="label-caps px-4">Owner</TableHead>
                <TableHead className="label-caps px-4">Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="px-4">
                    <span className="block text-[13.5px] font-medium">{l.name}</span>
                    <span className="text-data block text-micro text-muted-foreground">{l.email}</span>
                  </TableCell>
                  <TableCell className="px-4 text-[13.5px] text-muted-foreground">
                    {l.currentRole ?? "—"}
                  </TableCell>
                  <TableCell className="px-4 text-[13.5px] text-muted-foreground">
                    {l.interestedIn ?? "—"}
                  </TableCell>
                  <TableCell className="text-data px-4 text-micro text-muted-foreground">
                    {l.activities[0]?.kind ?? l.source}
                  </TableCell>
                  <TableCell className="text-data px-4 text-right text-[13.5px] font-medium">
                    {l.score}
                  </TableCell>
                  <TableCell className="px-4 text-[13.5px] text-muted-foreground">
                    {l.owner?.name ?? "Unassigned"}
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge className={`rounded-full border-transparent text-micro font-semibold ${STAGE_TONE[l.stage]}`}>
                      {l.stage.toLowerCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
