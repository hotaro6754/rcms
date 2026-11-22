import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireActor, can } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { BoardView } from "@/components/admin/BoardView";
import { BOARDS, board, boardsFor, type BoardKey } from "@/lib/services/reports/dashboards";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };

const PERIODS = [7, 30, 90, 365];

/** The dashboards, each limited to the people whose role covers it. */
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
    <div className="mx-auto max-w-[1440px] px-[clamp(16px,2.4vw,32px)] pb-16 pt-4">
      <PageHead kicker="Reports and dashboards" title={`${BOARDS[key]} dashboard`} lede="Every figure is counted from stored records when the page loads. Open “How it is counted” on any figure to see exactly what it includes." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Dashboards" className="flex flex-wrap gap-1 rounded-full bg-secondary p-1">
          {allowed.map((b) => (
            <Link
              key={b}
              href={`/admin/reports/${b}?days=${days}`}
              aria-current={b === key ? "page" : undefined}
              className={cn("rounded-full px-4 py-2 text-[13px] font-semibold transition-colors", b === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {BOARDS[b]}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Period" className="flex gap-1 rounded-full bg-secondary p-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin/reports/${key}?days=${p}`}
                aria-current={p === days ? "true" : undefined}
                className={cn("rounded-full px-3.5 py-2 text-[12.5px] font-semibold", p === days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {p === 365 ? "1Y" : `${p}D`}
              </Link>
            ))}
          </div>
          {can(actor, "reports.export") && (
            <a href={`/api/reports/${key}?days=${days}`} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-transform hover:-translate-y-px">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          )}
        </div>
      </div>
      <div className="mt-4">
        <BoardView board={data} />
      </div>
    </div>
  );
}
