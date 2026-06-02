// Scheduled keep-warm ping.
//
// The Next.js server handler (SSR + middleware/proxy) runs on AWS Lambda via
// @netlify/plugin-nextjs. After a few idle minutes the container is recycled, so
// the next visitor pays a cold start (~6s measured on /dashboard). Pinging a
// DYNAMIC route every few minutes keeps one container warm.
//
// We hit /dashboard (not /login, which is statically prerendered and served from
// the CDN without ever invoking the function). The proxy redirects the
// unauthenticated request to /login (302) — that redirect still executes inside
// the server handler, which is exactly what keeps the Lambda warm.
//
// Notes: scheduled functions only run on published production deploys, run in
// UTC, and have a 30s timeout.

export default async () => {
  const base = process.env.URL || "https://app-interna-freire.netlify.app";
  try {
    await fetch(`${base}/dashboard`, {
      redirect: "manual",
      headers: { "x-keep-warm": "1" },
    });
  } catch {
    // Best-effort: a failed warm ping is non-critical, just skip this tick.
  }
  return new Response("warmed");
};

export const config = {
  // Every 5 minutes — Lambda containers stay warm well within that window.
  schedule: "*/5 * * * *",
};
