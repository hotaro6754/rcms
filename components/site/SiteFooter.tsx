import { Fragment } from "react";
import { whatsappUrl } from "@/lib/contact";
import { getPageContent } from "@/lib/site/content";
import { sitePage } from "@/lib/site/pages/site";
import { SiteLink } from "./SiteLink";
import { FooterLive } from "./footer/FooterLive";
import { FooterNotes } from "./footer/FooterNotes";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * The footer: one navy band that closes the page.
 *
 * First the closing statement — the claim that opened the page, marked closed, and the two
 * ways forward. Then Floor Notes (the monthly letter) beside the live facts (the time in India,
 * when sessions run); the site index as labelled columns; and the colophon with the logo, the
 * teaching-data disclaimer and the way back to the top.
 *
 * The copy comes from the website editor ("Navigation and footer").
 */
export async function SiteFooter() {
  const c = await getPageContent(sitePage);
  const whatsapp = whatsappUrl();
  const rows = c.index.rows.map((row) => ({
    title: row.title,
    links: [
      ...row.links.map((l) => l.link),
      ...(row.whatsapp && whatsapp ? [{ href: whatsapp, label: c.index.whatsappLabel }] : []),
    ],
  }));
  const status = c.closing.status;
  return (
    <footer data-env="ink" className="editorial env-ink bg-background">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        {c.closing.show && (
          <div className="grid gap-8 border-b border-border py-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:py-20">
            <div>
              {status.length > 0 && (
                <p className="tabular text-[12px] font-semibold uppercase tracking-[0.08em] text-subtle">
                  {status.map((item, i) => (
                    <Fragment key={i}>
                      {i > 0 && (
                        <>
                          {" "}
                          <span aria-hidden="true" className="mx-1">·</span>{" "}
                        </>
                      )}
                      {i === status.length - 1 && status.length > 1 ? <span className="text-brand">{item}</span> : item}
                    </Fragment>
                  ))}
                </p>
              )}
              <h2 className="mt-5 max-w-[22ch] text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.08]">
                {c.closing.title}
                {c.closing.emphasis && (
                  <>
                    {" "}
                    <em>{c.closing.emphasis}</em>
                  </>
                )}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <SiteLink
                link={c.closing.primary}
                className="inline-flex min-h-12 items-center rounded-md bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              />
              <SiteLink
                link={c.closing.secondary}
                className="inline-flex min-h-12 items-center rounded-md border border-input px-6 text-[15px] font-semibold transition-colors hover:bg-white/5"
              />
              <SiteLink link={c.closing.tertiary} className="inline-flex min-h-12 items-center px-2 text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" />
            </div>
          </div>
        )}

        {(c.notes.show || c.live.show) && (
          <div className="grid gap-12 border-b border-border py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
            {c.notes.show && <FooterNotes content={c.notes} />}
            {c.live.show && (
              <div className="lg:pt-1">
                <FooterLive content={c.live} />
              </div>
            )}
          </div>
        )}

        <nav aria-label="Site index" className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-border py-12 sm:grid-cols-3 lg:grid-cols-5">
          {rows.map((row, r) => (
            <div key={r}>
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-subtle">{row.title}</h3>
              <ul className="mt-4 grid gap-2.5">
                {row.links.map((l, i) => (
                  <li key={i}>
                    <SiteLink link={l} className="text-[14.5px] text-foreground/85 transition-colors hover:text-foreground hover:underline hover:underline-offset-4" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Colophon */}
        <div className="grid gap-6 py-10 text-[13px] leading-relaxed text-subtle lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] lg:gap-10">
          <div>
            {c.wordmark.show && <Wordmark className="mb-3" />}
            <p>
              <span className="font-semibold text-foreground">{c.colophon.name}</span>
              <br />
              {c.colophon.line}
            </p>
          </div>
          <p className="max-w-[80ch]">{c.colophon.disclaimer}</p>
          <SiteLink
            link={c.colophon.backToTop}
            className="inline-flex min-h-10 items-start text-[13px] font-semibold text-foreground transition-opacity hover:opacity-70 lg:justify-self-end"
          />
        </div>
      </div>
    </footer>
  );
}
