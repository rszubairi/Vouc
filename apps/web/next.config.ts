import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Convex URL is set via environment variable
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.convex.cloud", pathname: "/api/storage/**" },
    ],
  },
};

export default nextConfig;
