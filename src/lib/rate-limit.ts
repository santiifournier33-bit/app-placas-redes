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
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
