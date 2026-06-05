import 'server-only'
import { getSession } from './session'
import { createServiceClient } from '@/lib/supabase/service'

export interface ApiUser {
  id: string
  email: string
  role: 'admin' | 'asesor'
}

/**
 * Resolves the authenticated user for API routes from the app's PRIMARY session —
 * the jose `session` cookie set at login — not Supabase Auth.
 *
 * Why: the app gates pages on the jose cookie (7-30 days, see proxy.ts) but several
 * API routes historically checked `supabase.auth.getUser()`, a SEPARATE Supabase Auth
 * session with a shorter, refresh-dependent lifetime. When the Supabase session lapsed
 * while the jose cookie was still valid, the UI looked logged-in but every such route
 * returned 401 (e.g. the "Unauthorized" in the consultas matches panel). Authenticating
 * from the same source the UI trusts removes that divergence.
 *
 * `id` is the profile id (= the Supabase auth user id), resolved by email so existing
 * ownership checks (`owner_id === user.id`) keep working unchanged.
 *
 * Returns null when there is no valid session or no matching profile.
 */
export async function getApiUser(): Promise<ApiUser | null> {
  const session = await getSession()
  if (!session?.email) return null

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', session.email)
    .maybeSingle()

  if (!profile?.id) return null
  return { id: profile.id, email: session.email, role: session.role }
}
