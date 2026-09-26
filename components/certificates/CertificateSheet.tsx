import { cn } from "@/lib/utils";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export interface CertificateData {
  serial: string;
  holderName: string;
  programName: string;
  level: number;
  issuedAt: Date;
  revokedAt?: Date | null;
}

/**
 * The certificate, set as a document rather than a badge: a landscape sheet with a double
 * rule, the Academy's masthead, the holder's name set large, what they completed, and at
 * the foot the date, the serial and the address where anyone can check it. The seal is
 * type on a circle, not an emblem: the Academy's name and the level.
 *
 * Server component. Prints on one landscape page (see the print rules in globals.css).
 */
export function CertificateSheet({ cert, origin, className }: { cert: CertificateData; origin: string; className?: string }) {
  const revoked = !!cert.revokedAt;
  const verifyUrl = `${origin.replace(/^https?:\/\//, "")}/certificates/${cert.serial}`;

  return (
    <div
      className={cn(
        "certificate-sheet env-paper relative aspect-[297/210] w-full overflow-hidden bg-[#fcfaf5] text-foreground shadow-[0_1px_2px_rgb(22_21_19/0.06),0_40px_80px_-40px_rgb(22_21_19/0.45)]",
        className,
      )}
    >
      <div aria-hidden="true" className="grain absolute inset-0 !opacity-[0.07]" />
      {/* Double rule */}
      <div aria-hidden="true" className="absolute inset-[2.2%] border border-foreground/70" />
      <div aria-hidden="true" className="absolute inset-[2.9%] border border-foreground/25" />

      <div className="relative flex h-full flex-col px-[8%] pb-[6.5%] pt-[7%] [container-type:inline-size]">
        <header className="flex items-baseline justify-between">
          <p className="flex items-baseline gap-[1cqw]">
            <span className="text-data text-[1.35cqw] font-semibold tracking-[0.18em]">RCMS</span>
            <span className="font-serif-display text-[1.9cqw] leading-none">Operations Academy</span>
          </p>
          <p className="text-data text-[1.05cqw] tracking-[0.16em] text-subtle">LEVEL {String(cert.level).padStart(2, "0")}</p>
        </header>

        <div className="flex flex-1 flex-col justify-center pb-[2%]">
          <p className="text-data text-[1.15cqw] tracking-[0.22em] text-subtle">CERTIFICATE OF COMPLETION</p>
          <p className="mt-[2.4cqw] text-[1.5cqw] text-muted-foreground">This certifies that</p>
          <p className="font-serif-display mt-[0.8cqw] text-[6.6cqw] italic leading-[1] tracking-[-0.02em]">{cert.holderName}</p>
          <div aria-hidden="true" className="mt-[1.6cqw] h-px w-[58%] bg-foreground/40" />
          <p className="mt-[2cqw] max-w-[60%] text-[1.45cqw] leading-relaxed text-muted-foreground">
            has completed every lesson and assessment of the program
          </p>
          <p className="font-serif-display mt-[0.6cqw] text-[3.6cqw] leading-tight">{cert.programName}</p>
        </div>

        <footer className="grid grid-cols-[1fr_1fr_auto] items-end gap-[3cqw]">
          <div>
            <div aria-hidden="true" className="h-px w-full bg-foreground/60" />
            <p className="mt-[0.8cqw] text-[1.15cqw]">V K Chakradhar Gangaraju</p>
            <p className="text-data text-[0.95cqw] tracking-[0.1em] text-subtle">FOUNDER, FOR THE ACADEMY</p>
          </div>
          <dl className="text-data grid grid-cols-[auto_1fr] gap-x-[1.4cqw] gap-y-[0.5cqw] text-[1cqw]">
            <dt className="tracking-[0.12em] text-subtle">ISSUED</dt>
            <dd>{DATE.format(cert.issuedAt)}</dd>
            <dt className="tracking-[0.12em] text-subtle">SERIAL</dt>
            <dd className="tracking-[0.06em]">{cert.serial}</dd>
            <dt className="tracking-[0.12em] text-subtle">VERIFY</dt>
            <dd className="break-all">{verifyUrl}</dd>
          </dl>
          <Seal level={cert.level} />
        </footer>
      </div>

      {revoked && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fcfaf5]/60">
          <p className="stamp rotate-[-8deg] border-[0.35cqw] border-danger px-[2cqw] py-[0.6cqw] font-mono text-[5cqw] font-semibold tracking-[0.1em] text-danger">
            REVOKED
          </p>
        </div>
      )}
    </div>
  );
}

function Seal({ level }: { level: number }) {
  const text = "RCMS OPERATIONS ACADEMY · CERTIFIED · ";
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="w-[10.5cqw] text-foreground">
      <defs>
        <path id="seal-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="0.75" />
      <text fontSize="8.4" letterSpacing="1.6" fill="currentColor" style={{ fontFamily: "var(--font-mono)" }}>
        <textPath href="#seal-ring" textLength="272">
          {text}
        </textPath>
      </text>
      <text x="60" y="58" textAnchor="middle" fontSize="8" letterSpacing="2" fill="currentColor" style={{ fontFamily: "var(--font-mono)" }}>
        LEVEL
      </text>
      <text x="60" y="80" textAnchor="middle" fontSize="24" fill="currentColor" style={{ fontFamily: "var(--font-serif)" }}>
        {String(level).padStart(2, "0")}
      </text>
    </svg>
  );
}
