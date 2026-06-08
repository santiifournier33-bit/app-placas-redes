import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || 'freire-propiedades-secret-key-change-in-prod'
const encodedKey = new TextEncoder().encode(secretKey)

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

    return NextResponse.next({ request })
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
