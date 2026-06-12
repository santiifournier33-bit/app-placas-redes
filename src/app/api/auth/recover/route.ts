import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { getSession } from '@/lib/auth/session'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import type { Database } from '@/lib/supabase/types'

/**
 * Puente jose → Supabase. Si la sesión Supabase murió (familia de refresh
 * tokens revocada por reuse detection, cookies sb-* perdidas) pero la cookie
 * jose sigue válida, re-minta una sesión Supabase fresca server-side vía
 * magiclink hashed_token. El token NUNCA llega al cliente: generateLink y
 * verifyOtp ocurren ambos acá, y la respuesta solo lleva las cookies sb-*.
 */
export async function POST(request: NextRequest) {
  // Gate primario: cookie jose válida (la sesión real de la app).
  const session = await getSession()
  if (!session?.email) {
    return NextResponse.json(
      { error: 'No autenticado', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  const ip = getClientIp(request)
  if (!rateLimit(`recover:${ip}:${session.email}`, 5, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Demasiados intentos de recuperación', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  try {
    // Gate de negocio: el perfil debe existir y estar activo.
    const admin = createServiceClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('id, is_active')
      .eq('email', session.email)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado', code: 'PROFILE_NOT_FOUND' },
        { status: 403 }
      )
    }
    if (profile.is_active === false) {
      return NextResponse.json(
        { error: 'Cuenta desactivada', code: 'USER_INACTIVE' },
        { status: 403 }
      )
    }

    // generateLink NO envía email; devuelve el hashed_token para canjear acá.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: session.email,
    })
    const tokenHash = linkData?.properties?.hashed_token
    if (linkError || !tokenHash) {
      console.error('recover: generateLink failed', linkError?.message)
      return NextResponse.json(
        { error: 'No se pudo recuperar la sesión', code: 'RECOVER_LINK_FAILED' },
        { status: 502 }
      )
    }

    // verifyOtp con cookie-bridge: las sb-* frescas viajan en este response.
    const response = NextResponse.json({ success: true })
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token_hash: tokenHash,
    })
    if (verifyError) {
      console.error('recover: verifyOtp failed', verifyError.message)
      return NextResponse.json(
        { error: 'No se pudo recuperar la sesión', code: 'RECOVER_VERIFY_FAILED' },
        { status: 502 }
      )
    }

    return response
  } catch (error: unknown) {
    console.error('recover: unexpected error', error)
    return NextResponse.json(
      { error: 'Error del servidor', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
