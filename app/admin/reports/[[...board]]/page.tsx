import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor, can } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { BoardView } from "@/components/admin/BoardView";
import { BOARDS, board, boardsFor, type BoardKey } from "@/lib/services/reports/dashboards";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };

const PERIODS = [7, 30, 90, 365];

/** The seven dashboards, each limited to the people whose role covers it. */
export default async function ReportsPage({ params, searchParams }: { params: Promise<{ board?: string[] }>; searchParams: Promise<{ days?: string }> }) {
  const actor = await requireActor();
  const allowed = boardsFor(actor);
  if (!allowed.length) notFound();
  const { board: seg } = await params;
  const key = (seg?.[0] ?? allowed[0]) as BoardKey;
  if (!(key in BOARDS)) notFound();
  const days = PERIODS.includes(Number((await searchParams).days)) ? Number((await searchParams).days) : 30;
  const data = await board(actor, key, days);

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Reports and dashboards" title={`${BOARDS[key]} dashboard`} lede="Every figure is counted from stored records at the moment the page loads. Open a figure's definition to see exactly what it includes." />
      <nav aria-label="Dashboards" className="mt-6 flex flex-wrap gap-x-1 border-b border-border">
        {allowed.map((b) => (
          <Link key={b} href={`/admin/reports/${b}?days=${days}`} aria-current={b === key ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2.5 text-[13px]", b === key ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {BOARDS[b]}
          </Link>
        ))}
      </nav>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="text-muted-foreground">Period:</span>
        {PERIODS.map((p) => (
          <Link key={p} href={`/admin/reports/${key}?days=${p}`} className={cn("underline-offset-4", p === days ? "font-semibold underline" : "hover:underline")}>
            {p} days
          </Link>
        ))}
        {can(actor, "reports.export") && (
          <a href={`/api/reports/${key}?days=${days}`} className="ml-auto rounded-[3px] border border-input px-3 py-1.5 hover:bg-secondary">
            Export CSV
          </a>
        )}
      </div>
      <div className="mt-8">
        <BoardView board={data} />
      </div>
    </div>
  );
}
