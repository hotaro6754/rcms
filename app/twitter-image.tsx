import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

/** The card shown when a link to the site is shared (and for pages without their own image). */
export const alt = `${BRAND.name}: ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "#161513", color: "#f3f2ee" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: 34, letterSpacing: 6, fontWeight: 700 }}>{BRAND.markShort}</span>
          <span style={{ fontSize: 46, fontFamily: "serif" }}>{BRAND.markRest}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, fontFamily: "serif", maxWidth: 980 }}>From RCM beginner to operations leader.</div>
          <div style={{ fontSize: 28, color: "#b9b2a7", maxWidth: 900 }}>{BRAND.tagline}</div>
        </div>
        <div style={{ display: "flex", height: 6, width: 160, background: "#3f6e5e" }} />
      </div>
    ),
    size,
  );
}
