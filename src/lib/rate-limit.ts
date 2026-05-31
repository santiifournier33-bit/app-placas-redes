const store = new Map<string, { count: number; resetAt: number }>()

/**
 * Returns true if request is allowed, false if rate limit exceeded.
 * In-memory per serverless instance — good enough for brute-force protection.
 * key: unique identifier (e.g. `auth:1.2.3.4`)
 * limit: max requests allowed in the window
 * windowMs: rolling window in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = store.get(key)

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

export function getClientIp(request: Request): string {
  // Netlify injects the real client IP here (not spoofable)
  const netlifyIp = request.headers.get('x-nf-client-connection-ip')
  if (netlifyIp) return netlifyIp

  // Cloudflare injects the real client IP here (not spoofable)
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // Rightmost X-Forwarded-For entry is appended by the trusted proxy, not the client
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(s => s.trim()).filter(Boolean)
    const rightmost = parts[parts.length - 1]
    if (rightmost) return rightmost
  }

  // No trusted IP source — treat as shared bucket ('unknown') so these
  // requests share the same rate-limit pool rather than getting a free pass
  return 'unknown'
}
