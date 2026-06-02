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
      "img-src 'self' data: blob: https://static.tokkobroker.com https://static.freirepropiedades.com https://freirepropiedades.com https://maps.googleapis.com",
      "font-src 'self'",
      "connect-src 'self' data: blob: https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://tokkobroker.com https://static.tokkobroker.com https://static.freirepropiedades.com https://freirepropiedades.com https://tbcn.s3-accelerate.amazonaws.com https://maps.googleapis.com https://fonts.gstatic.com",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://kuula.co https://*.kuula.co https://my.matterport.com https://*.matterport.com",
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
  experimental: {
    // Tree-shake barrel imports of heavy icon/chart/util libs into per-icon chunks
    optimizePackageImports: [
      'lucide-react',
      'iconsax-react',
      'recharts',
      'date-fns',
      'framer-motion',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
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
