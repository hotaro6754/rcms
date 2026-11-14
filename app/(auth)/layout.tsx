import Link from "next/link";
import { NOINDEX } from "@/lib/seo";
import { comingSoon } from "@/lib/launch";
import { ThemeSwitch } from "@/components/theme/ThemeSwitch";
import s from "./auth.module.css";

/** Signed-in and sign-in pages are kept out of search engines. */
export const metadata = NOINDEX;

/**
 * Sign-in, password recovery and verification: one floating card on a faint drafting grid. One
 * half is a quiet night panel where the logo's four bars breathe and a point travels the arc;
 * the other half is the form. Motion is CSS and SVG only, and stops under reduced motion.
 * Before launch the legal links are left out (the policies are not published until counsel
 * approves them).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const closed = comingSoon();
  return (
    <div className={`rcx ${s.root}`}>
      <div className={s.grid} aria-hidden />
      <header className={s.top}>
        {!closed ? (
          <Link href="/" className={s.back}>
            ← Back to the site
          </Link>
        ) : (
          <span />
        )}
        <ThemeSwitch compact />
      </header>

      <main className={s.stage}>
        <div className={s.card}>
          <aside className={s.visual} aria-hidden>
            <svg viewBox="0 0 400 400" className={s.art}>
              <defs>
                <pattern id="auth-dots" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="rgb(233 237 244 / 0.09)" />
                </pattern>
              </defs>
              <rect width="400" height="400" fill="url(#auth-dots)" />
              <g className={s.bars}>
                <rect x="92" y="250" width="34" height="80" rx="10" />
                <rect x="146" y="208" width="34" height="122" rx="10" />
                <rect x="200" y="164" width="34" height="166" rx="10" />
                <rect x="254" y="118" width="34" height="212" rx="10" />
              </g>
              <path id="auth-arc" className={s.arc} d="M60 232 C 150 220, 240 170, 336 80" pathLength={1} />
              <path className={s.head} d="M318 76 L338 78 L334 98" />
              <circle r="5" className={s.dot}>
                <animateMotion dur="7s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                  <mpath href="#auth-arc" />
                </animateMotion>
              </circle>
              <line x1="60" y1="330" x2="340" y2="330" className={s.ground} />
            </svg>
            <div className={s.caption}>
              <span className="x-kicker" style={{ color: "#7f8ba1" }}>
                RCMExcel Academy
              </span>
              <p className={`x-display ${s.line}`}>
                From learner <em>to leader.</em>
              </p>
            </div>
          </aside>

          <section className={s.form}>
            <div className={s.inner}>
              <svg viewBox="0 0 32 32" className={s.mark} aria-hidden>
                <rect x="5" y="17" width="5" height="10" rx="1.5" fill="var(--x-ink)" />
                <rect x="13" y="12" width="5" height="15" rx="1.5" fill="var(--x-ink)" />
                <rect x="21" y="7" width="5" height="20" rx="1.5" fill="var(--x-ink)" />
                <path d="M4 14 C 10 12, 16 8, 26 3" fill="none" stroke="var(--x-teal)" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              {children}
            </div>
          </section>
        </div>
      </main>

      <footer className={s.foot}>
        {closed ? (
          <p>Access is limited to authorised RCMExcel staff. Sign-in attempts are recorded.</p>
        ) : (
          <p>
            By continuing you agree to the{" "}
            <Link href="/legal/terms" className="underline underline-offset-4">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="underline underline-offset-4">
              privacy policy
            </Link>
            .
          </p>
        )}
      </footer>
    </div>
  );
}
