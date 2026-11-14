import type { Metadata } from "next";
import { IBM_Plex_Mono, Geist, Instrument_Serif, Newsreader } from "next/font/google";
import "./globals.css";
import "./rcx.css";
import { cn } from "@/lib/utils";
import { INTRO_BOOT_SCRIPT } from "@/lib/intro";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { BRAND } from "@/lib/brand";
import { indexingOn, siteUrl } from "@/lib/seo";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

/* Editorial display face for the public site's headings. Optical sizes, so it stays crisp
   at 16px and gains contrast at 80px. The product surfaces keep the grotesk. */
const serif = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

/* Display face for headlines across the site and the app: a high-contrast condensed serif. */
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: BRAND.name,
  title: { default: `${BRAND.name} | US Healthcare Revenue Cycle Management Education`, template: `%s · ${BRAND.name}` },
  description:
    "An independent academy for US Healthcare Revenue Cycle Management education: structured video courses, slides and study material across four levels, from beginner to executive leadership.",
  openGraph: { siteName: BRAND.name, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  // Until SITE_INDEXING=on (the live site), every page asks search engines to stay away.
  robots: indexingOn() ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-intro is written by the boot script before hydration, hence the warning opt-out.
    <html lang="en" data-scroll-behavior="smooth" className={cn("font-sans", geist.variable, serif.variable, instrument.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT + THEME_BOOT_SCRIPT }} />
      </head>
      <body className={`${plexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
