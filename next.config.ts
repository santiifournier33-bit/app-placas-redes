import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'googleapis',
    'dotenv',
    'axios',
    'axios-cookiejar-support',
    'tough-cookie',
    'cheerio',
    '@google/generative-ai',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'static.tokkobroker.com' },
      { protocol: 'https', hostname: 'static.freirepropiedades.com' },
      { protocol: 'https', hostname: 'freirepropiedades.com' },
    ],
  },
};

export default nextConfig;
