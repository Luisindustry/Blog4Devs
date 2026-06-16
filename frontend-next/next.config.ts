import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // Allow Server Actions when the app is reached through a dev tunnel
    // (e.g. VS Code port forwarding) instead of localhost directly.
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.devtunnels.ms"],
    },
  },
};

export default nextConfig;
