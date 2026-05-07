import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.SESSION_SECRET || 'freire-propiedades-secret-key-change-in-prod'
const encodedKey = new TextEncoder().encode(secretKey)

const ADMIN_ONLY_PATHS = ['/documentacion', '/marketing', '/ventas', '/servicios']

const PUBLIC_PATHS = ['/login', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

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

    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo-pequeno.png|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)',
  ],
}
