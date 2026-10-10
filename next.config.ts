import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
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
