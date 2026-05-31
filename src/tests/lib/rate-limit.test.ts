import { describe, it, expect, beforeEach, vi } from 'vitest'

// Reset module between tests so the in-memory store is fresh
let rateLimit: (key: string, limit: number, windowMs: number) => boolean
let getClientIp: (request: Request) => string

beforeEach(async () => {
  vi.resetModules()
  const mod = await import('@/lib/rate-limit')
  rateLimit = mod.rateLimit
  getClientIp = mod.getClientIp
})

describe('rateLimit', () => {
  it('allows first request', () => {
    expect(rateLimit('test:1.2.3.4', 5, 60_000)).toBe(true)
  })

  it('allows requests up to the limit', () => {
    const key = 'test:up-to-limit'
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000)).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const key = 'test:exceeds'
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000)
    expect(rateLimit(key, 5, 60_000)).toBe(false)
  })

  it('resets after window expires', async () => {
    const key = 'test:reset'
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 50)
    expect(rateLimit(key, 3, 50)).toBe(false)

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60))
    expect(rateLimit(key, 3, 50)).toBe(true)
  })

  it('isolates keys independently', () => {
    for (let i = 0; i < 3; i++) rateLimit('key-a', 3, 60_000)
    expect(rateLimit('key-a', 3, 60_000)).toBe(false)
    expect(rateLimit('key-b', 3, 60_000)).toBe(true)
  })
})

describe('getClientIp', () => {
  it('prefers x-nf-client-connection-ip (Netlify, not spoofable)', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-nf-client-connection-ip': '1.1.1.1',
        'x-forwarded-for': '9.9.9.9, 2.2.2.2',
      },
    })
    expect(getClientIp(req)).toBe('1.1.1.1')
  })

  it('prefers cf-connecting-ip over x-forwarded-for (Cloudflare, not spoofable)', () => {
    const req = new Request('http://localhost', {
      headers: {
        'cf-connecting-ip': '3.3.3.3',
        'x-forwarded-for': '9.9.9.9, 4.4.4.4',
      },
    })
    expect(getClientIp(req)).toBe('3.3.3.3')
  })

  it('uses rightmost x-forwarded-for entry (proxy-appended, not client-spoofable)', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '9.9.9.9, 5.5.5.5, 6.6.6.6' },
    })
    // rightmost = 6.6.6.6 (appended by trusted proxy)
    expect(getClientIp(req)).toBe('6.6.6.6')
  })

  it('returns unknown when no headers present', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })
})
