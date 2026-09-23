"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ACTIONS, type ActionStatus } from "@/lib/data/governance";
import { METRICS } from "@/lib/data/telemetry";
import { cn } from "@/lib/utils";

const NEXT: Record<ActionStatus, ActionStatus> = {
  "not-started": "in-progress",
  "in-progress": "complete",
  complete: "not-started",
  blocked: "in-progress",
};

const STATUS_STYLE: Record<ActionStatus, string> = {
  "not-started": "bg-secondary text-muted-foreground",
  "in-progress": "bg-accent text-accent-foreground",
  blocked: "bg-danger-bg text-danger",
  complete: "bg-success-bg text-success",
};

const STATUS_LABEL: Record<ActionStatus, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  blocked: "Blocked",
  complete: "Complete",
};

/**
 * The learner works this register during the review. Motion owns the state transition;
 * status is real component state, so the decisions made here persist through the session.
 */
export function ActionRegister() {
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(
    Object.fromEntries(ACTIONS.map((a) => [a.id, a.status])),
  );

  const advance = (id: string) =>
    setStatuses((s) => ({ ...s, [id]: NEXT[s[id]] }));

  const open = ACTIONS.filter((a) => statuses[a.id] !== "complete").length;

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h3 className="text-[13.5px] font-semibold">Action register</h3>
        <span className="text-data text-micro text-muted-foreground">
          {open} open of {ACTIONS.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[62rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="label-caps px-4 py-3 font-medium">Action</th>
              <th scope="col" className="label-caps px-4 py-3 font-medium">Owner</th>
              <th scope="col" className="label-caps px-4 py-3 font-medium">Due</th>
              <th scope="col" className="label-caps px-4 py-3 font-medium">Expected impact</th>
              <th scope="col" className="label-caps px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ACTIONS.map((a) => {
              const status = statuses[a.id];
              return (
                <tr key={a.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3.5">
                    <span className="text-data block text-micro text-muted-foreground">{a.id}</span>
                    <span className="mt-1 block max-w-[42ch] text-[13.5px] leading-snug">
                      {a.action}
                    </span>
                    {status === "blocked" && a.blockedReason && (
                      <span className="mt-1.5 block max-w-[42ch] text-micro leading-snug text-danger">
                        Blocked: {a.blockedReason}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[13.5px] text-muted-foreground">{a.owner}</td>
                  <td className="text-data px-4 py-3.5 text-[13px] text-muted-foreground">
                    {a.due}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="block max-w-[36ch] text-micro leading-snug text-muted-foreground">
                      {a.expectedImpact}
                    </span>
                    <span className="text-data mt-1 block text-micro text-subtle">
                      {METRICS[a.linkedMetric].label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <motion.button
                      type="button"
                      onClick={() => advance(a.id)}
                      whileTap={{ scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      aria-label={`${a.id} is ${STATUS_LABEL[status]}. Advance status.`}
                      className={cn(
                        "min-h-9 rounded-[5px] px-2.5 text-micro font-semibold transition-colors",
                        STATUS_STYLE[status],
                      )}
                    >
                      {STATUS_LABEL[status]}
                    </motion.button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
