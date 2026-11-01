import { LAB } from "@/lib/data/lab";
import { cn } from "@/lib/utils";

/**
 * The evidence an operator actually starts from: the payer's remittance (835), summarised.
 * Same paper language as the claim in the hero, so the Lab reads as the next page of the
 * same file: line items denied CO-50 with remark N706, the total at the foot, and an
 * "Under review · RCA open" status badge because that is where the reader comes in.
 *
 * Illustrative teaching data only, as the footer says. Static: the Lab's interaction is the
 * question beside it, not this.
 */
const LINES = [
  { claim: "#20481", date: "08/12", billed: "1,240.00" },
  { claim: "#20496", date: "08/13", billed: "980.00" },
  { claim: "#20510", date: "08/14", billed: "1,240.00" },
  { claim: "#20533", date: "08/18", billed: "610.00" },
];

const usd = (n: number) => "$" + n.toLocaleString("en-US");

export function RemittanceSlip({ className }: { className?: string }) {
  return (
    <figure className={cn("relative", className)}>
      <div className="env-paper relative overflow-hidden rounded-[10px] border border-border bg-[var(--paper)] text-foreground shadow-[var(--shadow-card-hover)]">
        <header className="relative flex items-start justify-between gap-4 border-b border-border px-5 pb-3 pt-4">
          <div>
            <p className="text-data text-[11.5px] tracking-[0.14em] text-muted-foreground">REMITTANCE ADVICE · 835</p>
            <p className="mt-1 text-[1.25rem] font-bold leading-none tracking-[-0.015em]">01 – 29 August</p>
          </div>
          <p className="text-data text-right text-[11.5px] leading-relaxed tracking-[0.06em] text-muted-foreground">
            CARDIOLOGY
            <br />
            TRAINING RECORD
          </p>
        </header>

        <table className="relative w-full text-left">
          <thead>
            <tr className="border-b border-dashed border-foreground/12">
              {["Claim", "Date", "Billed", "Paid", "CARC", "RARC"].map((h) => (
                <th key={h} className="text-data whitespace-nowrap px-2 py-2 text-[11.5px] font-medium uppercase tracking-[0.1em] text-subtle sm:px-3 first:!pl-5 last:!pr-5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-data whitespace-nowrap text-[11.5px] sm:text-[12px]">
            {LINES.map((l) => (
              <tr key={l.claim} className="border-b border-dashed border-foreground/12">
                <td className="py-2 pl-5 pr-2 sm:pr-3">{l.claim}</td>
                <td className="px-2 py-2 text-muted-foreground sm:px-3">{l.date}</td>
                <td className="px-2 py-2 sm:px-3">{l.billed}</td>
                <td className="px-2 py-2 text-muted-foreground sm:px-3">0.00</td>
                <td className="px-2 py-2 font-medium text-danger sm:px-3">{LAB.code}</td>
                <td className="py-2 pl-2 pr-5 text-danger sm:pl-3">N706</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="px-5 py-2 text-[12px] text-subtle">
                … {(LAB.claims - LINES.length).toLocaleString("en-US")} more lines, same codes
              </td>
            </tr>
          </tbody>
        </table>

        <footer className="relative flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="flex items-center gap-2.5">
            <span className="text-[12px] text-muted-foreground">{LAB.claims.toLocaleString("en-US")} claims denied</span>
            <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-[11.5px] font-semibold text-warning">Under review · RCA open</span>
          </span>
          <span className="text-data text-[15px] font-medium text-danger">{usd(LAB.value)}</span>
        </footer>

      </div>
      <figcaption className="mt-3 text-micro text-subtle">
        Illustrative teaching data. No real patient, provider or payer information.
      </figcaption>
    </figure>
  );
}
