import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserRole, encrypt } from '@/lib/auth/session'
import { validateTokkoCredentials } from '@/lib/tokko/client'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import type { Database } from '@/lib/supabase/types'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!rateLimit(`auth:${ip}`, 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá 15 minutos.', code: 'RATE_LIMITED' },
      { status: 429 }
    )
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Faltan credenciales', code: 'MISSING_CREDENTIALS' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const tokkoResult = await validateTokkoCredentials(normalizedEmail, password)
    if (!tokkoResult.success) {
      return NextResponse.json(
        { success: false, error: tokkoResult.error, code: 'INVALID_CREDENTIALS' },
        { status: 401 }
      )
    }

    // Ensure Supabase Auth user exists and has current password
    const serviceClient = createServiceClient()
    const role = getUserRole(normalizedEmail)

    // Try to create user first; if already exists, update password instead
    const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { role },
    })

    let authUserId = created?.user?.id

    if (createError) {
      // User already exists in auth — find by email and update password
      const { data: { users } } = await serviceClient.auth.admin.listUsers()
      const existing = users?.find(u => u.email === normalizedEmail)
      if (existing) {
        await serviceClient.auth.admin.updateUserById(existing.id, { password })
        authUserId = existing.id
      } else {
        console.error('Supabase createUser error:', createError)
        return NextResponse.json(
          { error: 'Error al crear cuenta de usuario', code: 'CREATE_USER_FAILED' },
          { status: 500 }
        )
      }
    }

    // Ensure profile row exists
    if (authUserId) {
      await serviceClient.from('profiles').upsert({
        id: authUserId,
        email: normalizedEmail,
        role,
        is_active: true,
      }, { onConflict: 'id' })
    }

    // Build response first so Supabase cookies go directly onto it
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const sessionToken = await encrypt({ email: normalizedEmail, role, expiresAt })

    const response = NextResponse.json({ success: true, user: { email: normalizedEmail, role } })

    // Set app session cookie on the response
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    })

    // Supabase client that sets cookies directly on the response
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInError) {
      console.error('Supabase signIn error:', signInError)
      return NextResponse.json(
        { error: 'Error al establecer sesión', code: 'SIGNIN_FAILED' },
        { status: 500 }
      )
    }

    return response
  } catch (error: unknown) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error del servidor al conectar con Tokko', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true })

  try {
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
    await supabase.auth.signOut()
  } catch {
    // signout failure shouldn't block app logout
  }

  response.cookies.delete('session')
  return response
}
