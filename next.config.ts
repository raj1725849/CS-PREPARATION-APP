import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  outputFileTracingExcludes: {
    '*': [
      'public/study-material/**/*',
    ],
  },
  serverExternalPackages: ["pdf-parse", "firebase-admin"],
};

export default nextConfig;
