import type { Metadata } from "next";
import { IBM_Plex_Mono, Geist, Newsreader } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { INTRO_BOOT_SCRIPT } from "@/lib/intro";
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

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  applicationName: BRAND.name,
  title: { default: `${BRAND.name} | RCM and Operations Management Training`, template: `%s · ${BRAND.name}` },
  description:
    "Structured training and mentoring in US healthcare revenue cycle and operations management, from your first claim to leading teams and clients.",
  openGraph: { siteName: BRAND.name, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  // Until SITE_INDEXING=on (the live site), every page asks search engines to stay away.
  robots: indexingOn() ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-intro is written by the boot script before hydration, hence the warning opt-out.
    <html lang="en" data-scroll-behavior="smooth" className={cn("font-sans", geist.variable, serif.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      </head>
      <body className={`${plexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
