import { LAB } from "@/lib/data/lab";
import { cn } from "@/lib/utils";

/**
 * The evidence an operator actually starts from: the payer's remittance (835), summarised.
 * Same paper language as the claim in the hero, so the Lab reads as the next page of the
 * same file: line items denied CO-50 with remark N706, the total at the foot, and an
 * "under review" stamp because that is where the reader comes in.
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
      <div className="relative rotate-[0.6deg] overflow-hidden rounded-[6px] border border-border bg-[#fcfaf5] shadow-[0_1px_2px_rgb(22_21_19/0.05),0_24px_48px_-24px_rgb(22_21_19/0.35)]">
        <div aria-hidden="true" className="grain absolute inset-0 !opacity-[0.1]" />
        <header className="relative flex items-start justify-between gap-4 border-b border-foreground/15 px-5 pb-3 pt-4">
          <div>
            <p className="text-data text-[10.5px] tracking-[0.14em] text-muted-foreground">REMITTANCE ADVICE · 835</p>
            <p className="font-serif-display mt-1 text-[1.3rem] leading-none">01 – 29 August</p>
          </div>
          <p className="text-data text-right text-[10.5px] leading-relaxed tracking-[0.06em] text-muted-foreground">
            CARDIOLOGY
            <br />
            TRAINING RECORD
          </p>
        </header>

        <table className="relative w-full text-left">
          <thead>
            <tr className="border-b border-dashed border-foreground/12">
              {["Claim", "Date", "Billed", "Paid", "CARC", "RARC"].map((h) => (
                <th key={h} className="text-data px-3 py-2 text-[9.5px] font-medium uppercase tracking-[0.1em] text-subtle first:pl-5 last:pr-5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-data text-[12px]">
            {LINES.map((l) => (
              <tr key={l.claim} className="border-b border-dashed border-foreground/12">
                <td className="px-3 py-2 pl-5">{l.claim}</td>
                <td className="px-3 py-2 text-muted-foreground">{l.date}</td>
                <td className="px-3 py-2">{l.billed}</td>
                <td className="px-3 py-2 text-muted-foreground">0.00</td>
                <td className="px-3 py-2 font-medium text-danger">{LAB.code}</td>
                <td className="px-3 py-2 pr-5 text-danger">N706</td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} className="px-5 py-2 text-[11px] text-subtle">
                … {(LAB.claims - LINES.length).toLocaleString("en-US")} more lines, same codes
              </td>
            </tr>
          </tbody>
        </table>

        <footer className="relative flex items-baseline justify-between gap-4 border-t border-foreground/15 px-5 py-3">
          <span className="text-data text-[11px] tracking-[0.04em] text-muted-foreground">
            {LAB.claims.toLocaleString("en-US")} claims denied
          </span>
          <span className="text-data text-[15px] font-medium text-danger">{usd(LAB.value)}</span>
        </footer>

        <div
          aria-hidden="true"
          className="stamp absolute left-[40%] top-[63%] flex rotate-[-7deg] flex-col items-center rounded-[5px] border-[2.5px] border-foreground/70 px-3 pb-1 pt-1.5 leading-none text-foreground/80"
        >
          <span className="text-data text-[17px] font-semibold uppercase tracking-[0.16em]">Under review</span>
          <span className="text-data mt-1 text-[9px] tracking-[0.12em]">OPS LAB · RCA OPEN</span>
        </div>
      </div>
      <figcaption className="mt-3 text-micro text-subtle">
        Illustrative teaching data. No real patient, provider or payer information.
      </figcaption>
    </figure>
  );
}
