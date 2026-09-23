import { RCA } from "@/lib/data/governance";
import { money } from "@/lib/utils";

/**
 * Five whys, connected to the telemetry rather than written as prose. The subject is the
 * denial category actually flagged in the data, and every step carries the evidence that
 * moves you to the next one.
 */
export function RcaBoard() {
  const d = RCA.subject;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--radius)] border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-data rounded-[5px] bg-danger-bg px-2 py-1 text-micro font-semibold text-danger">
            {d.code}
          </span>
          <span className="text-[13.5px] font-medium">{d.reason}</span>
          <span className="text-data ml-auto text-micro text-muted-foreground">
            {d.claims.toLocaleString("en-US")} claims · {money(d.value)} · {d.overturnRate}% historical overturn
          </span>
        </div>
        <p className="mt-3 border-t border-border pt-3 text-[13.5px] text-secondary-foreground">
          {RCA.statement}
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {RCA.steps.map((step, i) => (
          <li
            key={step.question}
            className="relative flex flex-col rounded-[var(--radius)] border border-border bg-card p-4"
          >
            <span className="text-data text-micro font-semibold text-primary">
              Why {i + 1}
            </span>
            <p className="mt-2 text-micro leading-snug text-muted-foreground">{step.question}</p>
            <p className="mt-2 text-[13.5px] font-medium leading-snug">{step.answer}</p>
            <p className="mt-auto border-t border-border pt-2.5 text-micro leading-snug text-subtle">
              {step.evidence}
            </p>
          </li>
        ))}
      </ol>

      <div className="rounded-[var(--radius)] border border-primary/40 bg-accent p-4">
        <p className="text-micro font-semibold uppercase tracking-[0.06em] text-accent-foreground">
          Conclusion
        </p>
        <p className="mt-2 max-w-[76ch] text-[13.5px] leading-relaxed text-accent-foreground">
          {RCA.conclusion}
        </p>
      </div>
    </div>
  );
}
