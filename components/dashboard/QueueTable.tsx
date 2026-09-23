import { DENIALS } from "@/lib/data/telemetry";
import { cn, money } from "@/lib/utils";

const STATUS: Record<string, string> = {
  working: "bg-success-bg text-success",
  queued: "bg-warning-bg text-warning",
  "front-end": "bg-warning-bg text-warning",
  "not-appealable": "bg-danger-bg text-danger",
  "write-off": "bg-danger-bg text-danger",
};

const LABEL: Record<string, string> = {
  working: "Working",
  queued: "Queued",
  "front-end": "Front-end fix",
  "not-appealable": "Not appealable",
  "write-off": "Write-off",
};

export function QueueTable() {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
      <table className="w-full min-w-[54rem] border-collapse text-left">
        <caption className="sr-only">
          Denial inventory by CARC code, with owner, value and historical overturn rate.
        </caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="label-caps px-4 py-3 font-medium">CARC</th>
            <th scope="col" className="label-caps px-4 py-3 font-medium">Reason</th>
            <th scope="col" className="label-caps px-4 py-3 font-medium">Owner</th>
            <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Claims</th>
            <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Value</th>
            <th scope="col" className="label-caps px-4 py-3 text-right font-medium">Overturn</th>
            <th scope="col" className="label-caps px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {DENIALS.map((d) => (
            <tr
              key={d.code}
              className={cn(
                "border-b border-border last:border-0 hover:bg-secondary/60",
                d.underRca && "bg-accent/40",
              )}
            >
              <td className="text-data px-4 py-3 text-[13px] font-semibold">
                {d.code}
                {d.underRca && (
                  <span className="ml-2 rounded-[4px] bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    RCA
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-[13.5px]">{d.reason}</td>
              <td className="px-4 py-3 text-[13.5px] text-muted-foreground">{d.owner}</td>
              <td className="text-data px-4 py-3 text-right text-[13px]">
                {d.claims.toLocaleString("en-US")}
              </td>
              <td className="text-data px-4 py-3 text-right text-[13px]">{money(d.value)}</td>
              <td className="text-data px-4 py-3 text-right text-[13px] text-muted-foreground">
                {d.overturnRate}%
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-[5px] px-2 py-0.5 text-micro font-semibold",
                    STATUS[d.status],
                  )}
                >
                  {LABEL[d.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
