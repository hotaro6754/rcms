import Image from "next/image";
import Link from "next/link";
import learnerArt from "@/public/images/art3d/signin-portrait.png";
import brandMark from "@/public/brand/rcmexcel-mark.png";
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
          <aside className={s.visual}>
            <Image
              src={learnerArt}
              alt="Illustration of a learner at a sunny desk opening a video lesson, with a certificate framed on the wall."
              fill
              priority
              placeholder="blur"
              sizes="(min-width: 880px) 720px, 0px"
              quality={90}
              className={s.photo}
            />
            <div className={s.chips} aria-hidden>
              <span className={s.chipCobalt}>Watch</span>
              <span className={s.chipSun}>Practise</span>
              <span className={s.chipCoral}>Prove</span>
              <span className={s.chipTeal}>Certify</span>
            </div>
            <div className={s.caption}>
              <span className={s.kicker}>RCMExcel Academy</span>
              <p className={`x-display ${s.line}`}>
                From learner <em>to leader.</em>
              </p>
            </div>
          </aside>

          <section className={s.form}>
            <div className={s.inner}>
              <Image src={brandMark} alt="RCMExcel" className={s.mark} priority />
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
