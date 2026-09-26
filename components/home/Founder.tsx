import Image from "next/image";
import Link from "next/link";
import { CAREER, FOUNDER } from "@/lib/data/founder";
import { FOUNDER_PORTRAIT } from "@/lib/data/media";
import { Chapter } from "./Chapter";

/**
 * WHO WROTE IT. Set like a colophon at the back of a book: the years in a large numeral on
 * the page itself (no panel behind it), the author's name and focus, one paragraph in their
 * voice, and the experience as a ruled list. Verified facts only (lib/data/founder.ts).
 * When the real portrait is added (FOUNDER_PORTRAIT in lib/data/media.ts) it sits above the
 * numeral; until then the type carries the section on its own.
 */
export function Founder() {
  return (
    <Chapter folio="08" title="The author" className="border-t border-border">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        {/* The numeral travels with the reading column, so the left half is never a void. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {FOUNDER_PORTRAIT && (
            <figure className="photo mb-8 aspect-[4/5] w-full max-w-[20rem] rounded-[4px]">
              <Image src={FOUNDER_PORTRAIT.src} alt={FOUNDER_PORTRAIT.alt} fill sizes="20rem" className="object-cover" />
            </figure>
          )}
          <p className="font-serif-display text-[clamp(8rem,16vw,14rem)] leading-[0.8] tracking-[-0.04em]">{FOUNDER.years}</p>
          <p className="text-data mt-5 max-w-[22ch] text-[11px] leading-relaxed tracking-[0.1em] text-subtle">
            YEARS INSIDE US HEALTHCARE REVENUE CYCLE OPERATIONS
          </p>
        </div>

        <div>
          <h2 data-reveal className="max-w-[20ch] text-[clamp(2rem,3.2vw,2.9rem)] leading-[1.06]">
            This curriculum was written by someone who ran the floor it describes.
          </h2>
          <p className="mt-8 font-serif-display text-[1.35rem] leading-none">{FOUNDER.name}</p>
          <p className="text-data mt-2 text-[11px] tracking-[0.06em] text-subtle">{FOUNDER.focus.toUpperCase()}</p>
          <p className="mt-6 max-w-[58ch] text-[15.5px] leading-relaxed text-secondary-foreground">
            Most revenue cycle training stops where the job stops being about processing claims and
            starts being about running an operation: capacity models, SLA design, client reviews,
            root cause programs. Those are the skills that decide who becomes a lead, a manager, a
            director, and nobody writes them down. This Academy writes them down.
          </p>

          <dl className="mt-10 border-t-2 border-foreground">
            {CAREER.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-border py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                <dt className="text-[14px] font-medium">{k}</dt>
                <dd className="text-[14px] leading-relaxed text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/about"
            className="mt-8 inline-flex min-h-11 items-center text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground"
          >
            About the author
          </Link>
        </div>
      </div>
    </Chapter>
  );
}
