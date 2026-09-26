import Image from "next/image";
import Link from "next/link";
import { CAREER, FOUNDER } from "@/lib/data/founder";
import { FOUNDER_PORTRAIT } from "@/lib/data/media";

/**
 * The credibility layer: an operator wrote this curriculum. Verified facts only (see
 * lib/data/founder.ts). Until the real portrait arrives the left side is typographic, the
 * years set as large as a photograph would be, so the section reads as designed, not as
 * an empty frame. Set FOUNDER_PORTRAIT in lib/data/media.ts and the photo takes its place.
 */
export function Founder() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-20 lg:py-32">
        <div className="relative">
          {FOUNDER_PORTRAIT ? (
            <figure className="photo aspect-[4/5] w-full rounded-2xl">
              <Image
                src={FOUNDER_PORTRAIT.src}
                alt={FOUNDER_PORTRAIT.alt}
                fill
                sizes="(min-width: 1024px) 36vw, 100vw"
                className="object-cover"
              />
            </figure>
          ) : (
            <div className="relative flex aspect-[4/5] w-full flex-col justify-between gap-10 overflow-hidden rounded-2xl border border-border bg-accent p-8 max-lg:aspect-auto max-lg:min-h-[22rem]">
              <div aria-hidden="true" className="grain absolute inset-0" />
              <p className="label-caps relative">{FOUNDER.role}</p>
              <p className="relative">
                <span className="font-serif-display block text-[clamp(7rem,14vw,12rem)] leading-[0.85] text-accent-foreground">
                  {FOUNDER.years}
                </span>
                <span className="font-serif-display mt-3 block text-[1.5rem] italic leading-snug text-accent-foreground">
                  years inside US healthcare revenue cycle operations.
                </span>
              </p>
            </div>
          )}
        </div>

        <div>
          <p data-reveal className="label-caps flex items-center gap-3">
            <span className="text-brand">08</span>
            <span aria-hidden="true" className="h-px w-8 bg-input" />
            The experience behind the system
          </p>
          <h2 data-reveal className="mt-6 max-w-[16ch] text-[clamp(2.3rem,4.4vw,3.8rem)] leading-[1.02]">
            An operator wrote <em>this curriculum.</em>
          </h2>
          <p className="mt-8 text-[17px] font-medium">{FOUNDER.name}</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{FOUNDER.focus}</p>
          <p className="mt-6 max-w-[58ch] text-[15px] leading-relaxed text-secondary-foreground">
            Most revenue cycle training stops where the job stops being about processing claims
            and starts being about running an operation. Capacity models, SLA design, client
            reviews, root cause programs: the skills that decide who becomes a lead, a manager, a
            director, and the ones nobody writes down. This Academy writes them down.
          </p>

          <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {CAREER.map(([k, v]) => (
              <div key={k} className="bg-card p-5">
                <dt className="text-[14px] font-semibold">{k}</dt>
                <dd className="mt-2 text-micro leading-relaxed text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/about"
            className="mt-8 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-brand underline-offset-4 hover:underline"
          >
            About the founder <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
