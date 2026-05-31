import { describe, it, expect } from 'vitest'
// session.ts uses 'server-only' — mocked in vitest.config.ts alias
import { getUserRole, encrypt, decrypt } from '@/lib/auth/session'

describe('getUserRole', () => {
  it('returns admin for ADMIN_EMAILS env var match', () => {
    // setup.ts sets ADMIN_EMAILS=admin@test.com
    expect(getUserRole('admin@test.com')).toBe('admin')
  })

  it('is case-insensitive', () => {
    expect(getUserRole('ADMIN@TEST.COM')).toBe('admin')
  })

  it('returns asesor for unknown email', () => {
    expect(getUserRole('otro@test.com')).toBe('asesor')
  })
})

describe('encrypt / decrypt', () => {
  it('round-trips a session payload', async () => {
    const payload = {
      email: 'user@test.com',
      role: 'asesor' as const,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }

    const token = await encrypt(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT format

    const decoded = await decrypt(token)
    expect(decoded).not.toBeNull()
    expect(decoded?.email).toBe(payload.email)
    expect(decoded?.role).toBe(payload.role)
  })

  it('returns null for invalid token', async () => {
    const result = await decrypt('not.a.valid.jwt')
    expect(result).toBeNull()
  })

  it('returns null for empty string', async () => {
    const result = await decrypt('')
    expect(result).toBeNull()
  })

  it('returns null for undefined', async () => {
    const result = await decrypt(undefined)
    expect(result).toBeNull()
  })
})
