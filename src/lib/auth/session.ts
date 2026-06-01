import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type UserRole = 'admin' | 'asesor'

export interface SessionPayload {
  email: string
  role: UserRole
  expiresAt: Date
}

const secretKey = process.env.SESSION_SECRET || 'freire-propiedades-secret-key-change-in-prod'
const encodedKey = new TextEncoder().encode(secretKey)

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'freirepropiedadespilar@gmail.com').split(',').map(e => e.trim().toLowerCase())

export function getUserRole(email: string): UserRole {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'asesor'
}

export const SESSION_MAX_AGE_DEFAULT = 7 * 24 * 60 * 60   // 7 días
export const SESSION_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60 // 30 días ("recordar cuenta")

export async function encrypt(
  payload: SessionPayload,
  maxAgeSeconds: number = SESSION_MAX_AGE_DEFAULT,
): Promise<string> {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = ''): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })
    return {
      email: payload.email as string,
      role: payload.role as UserRole,
      expiresAt: new Date(payload.expiresAt as string),
    }
  } catch {
    return null
  }
}

export async function createSession(email: string): Promise<void> {
  const role = getUserRole(email)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await encrypt({ email, role, expiresAt })
  const cookieStore = await cookies()

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  if (!session) return null
  return decrypt(session)
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}
