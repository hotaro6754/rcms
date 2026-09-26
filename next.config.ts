import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Course materials are uploaded through a server action (lib/actions/materials.ts),
    // which caps files at 25 MB; the action body needs a little headroom above that.
    serverActions: { bodySizeLimit: "26mb" },
  },
};

export default nextConfig;
