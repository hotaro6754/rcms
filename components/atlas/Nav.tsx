"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import lockup from "@/public/brand/rcmexcel-lockup.png";
import s from "./atlas.module.css";

const LINKS = [
  { label: "Learning paths", href: "/learning-paths" },
  { label: "Courses", href: "/catalog" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
];

/** Floating top bar. Phones get a sheet. The site is light-only for now. */
export function Nav({ signIn, cta }: { signIn: { label: string; href: string }; cta: { label: string; href: string } }) {
  const [open, setOpen] = useState(false);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled((window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) > 12);
    on();
    document.addEventListener("scroll", on, { passive: true, capture: true });
    return () => document.removeEventListener("scroll", on, { capture: true });
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);


  return (
    <header className={s.nav} data-scrolled={scrolled || open || undefined}>
      <div className={s.navBar}>
        <Link href="/" className={s.navLogo} aria-label="RCMExcel home">
          <Image src={lockup} alt="RCMExcel" priority />
        </Link>
        <nav className={s.navLinks} aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className={s.navEnd}>
          <Link href={signIn.href} className={s.navSign}>
            {signIn.label}
          </Link>
          <Link href={cta.href} className={`${s.btn} ${s.navCta}`}>
            {cta.label}
          </Link>
          <button type="button" className={`${s.iconBtn} ${s.menuBtn}`} aria-expanded={open} aria-controls="nav-sheet" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>
      <div id="nav-sheet" className={s.sheet} hidden={!open}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <Link href={signIn.href} onClick={() => setOpen(false)}>
          {signIn.label}
        </Link>
      </div>
    </header>
  );
}
