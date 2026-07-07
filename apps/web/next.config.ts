import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Convex URL is set via environment variable
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
  },
};

export default nextConfig;
