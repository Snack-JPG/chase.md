import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],
  output: process.env.CI ? undefined : undefined,
  // Skip static prerendering during build (needs env vars at runtime)
  experimental: {},
};

export default nextConfig;
