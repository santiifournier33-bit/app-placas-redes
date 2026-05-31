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
  it('reads x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.9.9.9' },
    })
    expect(getClientIp(req)).toBe('9.9.9.9')
  })

  it('returns unknown when no headers', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('unknown')
  })
})
