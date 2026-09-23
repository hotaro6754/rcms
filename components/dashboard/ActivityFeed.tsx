import { ACTIVITY } from "@/lib/data/governance";

const TONE: Record<string, string> = {
  recovery: "bg-success",
  escalation: "bg-danger",
  policy: "bg-warning",
  capacity: "bg-chart-1",
  quality: "bg-chart-2",
};

export function ActivityFeed({ limit }: { limit?: number }) {
  const items = limit ? ACTIVITY.slice(0, limit) : ACTIVITY;

  return (
    <ol className="flex flex-col">
      {items.map((e, i) => (
        <li key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-[2px] ${TONE[e.kind]}`} />
            {i < items.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-5">
            <p className="text-[13.5px] font-medium leading-snug">{e.message}</p>
            <p className="mt-1 max-w-[62ch] text-micro leading-relaxed text-muted-foreground">
              {e.detail}
            </p>
            <p className="text-data mt-1.5 text-micro text-subtle">{e.at}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
