import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'
import { shouldRenewSession } from '@/lib/auth/session-renewal'

// En producción el secret es obligatorio (espejo del fail-fast de session.ts).
const secretKey = process.env.SESSION_SECRET
  || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('SESSION_SECRET must be set in production') })()
    : 'freire-propiedades-secret-key-change-in-prod')
const encodedKey = new TextEncoder().encode(secretKey)
// Espejo de session.ts; fallback para tokens viejos sin claim `maxAge`.
const SESSION_MAX_AGE_DEFAULT = 30 * 24 * 60 * 60

const ADMIN_ONLY_PATHS = ['/documentacion', '/marketing', '/ventas', '/servicios']
// '/ficha' = ficha pública "modo colegas" (sin auth, token opaco propio).
const PUBLIC_PATHS = ['/login', '/api/auth', '/ficha']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Netlify functions are not page routes — they authenticate themselves
  // (e.g. docs-sync-background requires DOCS_SYNC_INTERNAL_SECRET). Gating them
  // here would 307→/login the server-side trigger fetch (no session cookie).
  if (pathname.startsWith('/.netlify/')) {
    return NextResponse.next()
  }

  // App session JWT check.
  // El refresh de la sesión Supabase se quitó a propósito: lo maneja SOLO el
  // navegador (auto-refresh de supabase-js). Tener dos renovadores sobre el
  // refresh-token rotatorio (proxy + cliente) causaba SIGNED_OUT intermitente.
  // Nada server-side consume la sesión Supabase del usuario.
  const session = request.cookies.get('session')?.value
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    })

    const role = payload.role as string

    if (ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p)) && role !== 'admin') {
      return NextResponse.redirect(new URL('/diseno', request.url))
    }

    const response = NextResponse.next({ request })

    // Renovación deslizante: si queda menos de la mitad de la ventana, re-firmar
    // una jose nueva con exp extendido (claims idénticos a session.ts) para que
    // un usuario activo nunca tope con el vencimiento del gate de páginas.
    const exp = payload.exp as number | undefined
    const maxAge = (payload.maxAge as number) || SESSION_MAX_AGE_DEFAULT
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (exp && shouldRenewSession(exp, maxAge, nowSeconds)) {
      const newExpiresAt = new Date(Date.now() + maxAge * 1000)
      const renewed = await new SignJWT({
        email: payload.email as string,
        role: payload.role as string,
        expiresAt: newExpiresAt.toISOString(),
        maxAge,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${maxAge}s`)
        .sign(encodedKey)

      response.cookies.set('session', renewed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: newExpiresAt,
        sameSite: 'lax',
        path: '/',
      })
    }

    return response
  } catch {
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
    redirectResponse.cookies.delete('session')
    return redirectResponse
  }
}

export const config = {
  // Exclude static metadata files (manifest, service worker, web manifest) from
  // the auth proxy: when fetched without a session (e.g. on /login) they'd be
  // redirected to the /login HTML, which the browser then fails to parse as JSON
  // ("Manifest: Syntax error") / fails to register as a service worker.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-pequeno.png|manifest.json|sw.js|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$|.*\\.webmanifest$).*)',
  ],
}
