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
};

export default nextConfig;
