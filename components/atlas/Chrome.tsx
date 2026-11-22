import Image from "next/image";
import Link from "next/link";
import { getPageContent } from "@/lib/site/content";
import { sitePage } from "@/lib/site/pages/site";
import { BRAND } from "@/lib/brand";
import lockup from "@/public/brand/rcmexcel-lockup.png";
import { Nav } from "./Nav";
import s from "./atlas.module.css";

/**
 * The public site's shared chrome in the Atlas system: the top bar and the footer, used by the
 * homepage and every page under app/(site). Wrapped in the Atlas root so the tokens apply.
 */
export async function AtlasHeader() {
  const site = await getPageContent(sitePage);
  return (
    <div className={s.root} style={{ background: "transparent", overflow: "visible" }}>
      <Nav signIn={site.nav.signIn} cta={{ label: "Explore learning paths", href: "/learning-paths" }} />
    </div>
  );
}

export function AtlasFooter() {
  return (
    <div className={s.root}>
      <footer className={s.footer}>
        <div className={s.wrap}>
          <nav className={s.footCols} aria-label="Footer">
            <div className={s.footBrand}>
              <span className={s.footLogo}>
                <Image src={lockup} alt="RCMExcel" style={{ height: 26, width: "auto" }} />
              </span>
              <p>Structured, video-based education in US healthcare revenue cycle and operations management, from your first claim to leading teams.</p>
            </div>
            <div>
              <span className={s.mono}>Learn</span>
              <Link href="/learning-paths">Learning paths</Link>
              <Link href="/catalog">Courses</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/contact?topic=corporate">Corporate training</Link>
            </div>
            <div>
              <span className={s.mono}>Academy</span>
              <Link href="/about">About the author</Link>
              <Link href="/resources">Resources</Link>
              <Link href="/blog">Writing</Link>
            </div>
            <div>
              <span className={s.mono}>Contact</span>
              <Link href="/contact">Write to us</Link>
              <Link href="/sign-in">Sign in</Link>
            </div>
            <div>
              <span className={s.mono}>Legal</span>
              <Link href="/legal/privacy">Privacy</Link>
              <Link href="/legal/terms">Terms</Link>
              <Link href="/legal/refund">Refunds</Link>
              <Link href="/legal/disclaimer">Disclaimer</Link>
              <Link href="/legal/content-governance">Content governance</Link>
            </div>
          </nav>
          <div className={s.footLegal}>
            <span>
              © {new Date().getFullYear()} {BRAND.name}
            </span>
            <p>
              All claims, consoles and review figures are illustrative teaching data: no real patient, provider or payer data. Benchmarks reference HFMA MAP Keys with no affiliation. Content does not replace payer, CMS, HIPAA, legal, compliance or
              employer guidance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
