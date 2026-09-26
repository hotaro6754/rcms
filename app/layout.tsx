import type { Metadata } from "next";
import { IBM_Plex_Mono, Geist, Newsreader } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { INTRO_BOOT_SCRIPT } from "@/lib/intro";

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
  title: "RCMS Operations Academy | RCM and Operations Management Training",
  description:
    "Structured training and mentoring in US healthcare revenue cycle and operations management, from your first claim to leading teams and clients.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-intro is written by the boot script before hydration, hence the warning opt-out.
    <html lang="en" className={cn("font-sans", geist.variable, serif.variable)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      </head>
      <body className={`${plexMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
