import type { NextConfig } from "next";
import path from "node:path";

/**
 * Security headers for every response. The CSP allows the Razorpay checkout script and frame
 * and video embeds from the providers the lesson editor accepts; everything else is same-origin.
 * 'unsafe-inline' for scripts is needed by Next's inline bootstrap without a nonce pipeline.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
  "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.youtube-nocookie.com https://player.vimeo.com https://iframe.mediadelivery.net https://stream.mux.com https://*.cloudflarestream.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://checkout.razorpay.com\")" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: path.resolve(__dirname),
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    webpackBuildWorker: false,
    // Course materials are uploaded through a server action (lib/actions/materials.ts),
    // which caps files at 25 MB; the action body needs a little headroom above that.
    serverActions: {
      bodySizeLimit: "26mb",
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "172.31.176.1:3000",
        "192.168.29.72:3000",
        "*.trycloudflare.com",
      ],
    },
  },
};

export default nextConfig;
