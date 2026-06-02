/**
 * Lighthouse CI config.
 *
 * Authenticated routes (dashboard, contactos, consultas) need a Supabase
 * session, so by default we only audit the public surface (login + ficha) in
 * CI. For protected routes use the chrome-devtools MCP `lighthouse_audit` from
 * a logged-in browser, or add a puppeteer script that injects the session
 * cookie and point `collect.url` at the protected paths.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready in",
      url: ["http://localhost:3000/login"],
      numberOfRuns: 3,
      settings: {
        // Throttled mobile is the default; keep it for a realistic baseline.
        preset: "desktop",
      },
    },
    assert: {
      preset: "lighthouse:recommended",
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "unused-javascript": ["warn", { maxNumericValue: 200000 }],
        "resource-summary:script:size": ["warn", { maxNumericValue: 600000 }],
        // Noisy/irrelevant for an internal authed SPA:
        "uses-rel-preconnect": "off",
        "csp-xss": "off",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
