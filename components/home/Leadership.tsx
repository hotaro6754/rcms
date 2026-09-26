import { ROLE_LADDER } from "@/lib/data/founder";
import { SectionField } from "@/components/environment/SectionField";

/**
 * The quiet section. After the system, the path and the lab, the page slows down: one
 * statement set large, and the ladder the whole curriculum climbs, drawn as steps
 * that literally rise. Each rung is defined by what that person is trusted to own and the
 * numbers that prove it. Grain, no cards, no motion beyond the page-wide reveal.
 */
export function Leadership() {
  return (
    <section className="relative isolate border-t border-border bg-card/60">
      <SectionField variant="grain" />
      <div className="mx-auto max-w-[1320px] px-6 py-24 lg:py-32">
        <div className="max-w-[62rem]">
          <div>
            <p data-reveal className="label-caps flex items-center gap-3">
              <span className="text-brand">06</span>
              <span aria-hidden="true" className="h-px w-8 bg-input" />
              Leadership
            </p>
            <h2 data-reveal className="mt-6 text-[clamp(2.4rem,5vw,4.6rem)] leading-[1.02]">
              Execution gets you into operations. <em>Leadership changes what operations can achieve.</em>
            </h2>
          </div>
        </div>

        <ol className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-6 lg:items-end lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
          {ROLE_LADDER.map((r, i) => (
            <li
              key={r.level}
              className="group flex flex-col bg-card p-5 transition-colors duration-[var(--dur-med)] lg:rounded-xl lg:border lg:border-border lg:hover:border-brand/40"
              style={{ ["--rise" as string]: `${i * 1.6}rem` }}
            >
              {/* The step: taller as the role rises (desktop only). */}
              <span aria-hidden="true" className="hidden lg:block" style={{ height: "var(--rise)" }} />
              <span className="text-data text-micro text-brand">{r.level}</span>
              <span className="font-serif-display mt-3 text-[1.45rem] leading-tight">{r.role}</span>
              <span className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                <span className="text-foreground">Owns </span>
                {r.owns.charAt(0).toLowerCase() + r.owns.slice(1)}
              </span>
              <span className="text-data mt-4 border-t border-border pt-3 text-[11.5px] leading-relaxed text-subtle">
                {r.metrics}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
