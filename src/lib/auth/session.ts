import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export type UserRole = 'admin' | 'asesor'

export interface SessionPayload {
  email: string
  role: UserRole
  expiresAt: Date
  /** Ventana original en segundos (30 o 90 días). Permite renovar con el plazo correcto. */
  maxAge: number
}

// En producción el secret es obligatorio: con un fallback conocido cualquiera
// podría forjar la cookie jose (y vía /api/auth/recover, mintear sesión Supabase).
const secretKey = process.env.SESSION_SECRET
  || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('SESSION_SECRET must be set in production') })()
    : 'freire-propiedades-secret-key-change-in-prod')
const encodedKey = new TextEncoder().encode(secretKey)

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'freirepropiedadespilar@gmail.com').split(',').map(e => e.trim().toLowerCase())

export function getUserRole(email: string): UserRole {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'asesor'
}

export const SESSION_MAX_AGE_DEFAULT = 30 * 24 * 60 * 60  // 30 días
export const SESSION_MAX_AGE_REMEMBER = 90 * 24 * 60 * 60 // 90 días ("recordar cuenta")

export async function encrypt(
  payload: { email: string; role: UserRole; expiresAt: Date },
  maxAgeSeconds: number = SESSION_MAX_AGE_DEFAULT,
): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    expiresAt: payload.expiresAt.toISOString(),
    maxAge: maxAgeSeconds,
  })
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
      maxAge: (payload.maxAge as number) ?? SESSION_MAX_AGE_DEFAULT,
    }
  } catch {
    return null
  }
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
