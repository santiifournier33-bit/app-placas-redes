import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
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

  let response = NextResponse.next({ request })

  // Supabase cookie refresh — keeps auth session alive (skip if env vars missing)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.getUser()
  }

  // App session JWT check
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
