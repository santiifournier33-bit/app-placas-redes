import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // unsafe-inline required for Tailwind/shadcn/ui inline styles
    // unsafe-eval required for Next.js + Remotion in dev
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://static.tokkobroker.com https://static.freirepropiedades.com https://freirepropiedades.com",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://tokkobroker.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
    ].join("; "),
  },
];

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
