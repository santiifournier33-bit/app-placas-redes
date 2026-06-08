import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Resolve the current Supabase Auth user, attempting a single session refresh
 * before giving up.
 *
 * The app runs TWO parallel sessions: the jose `session` cookie (page gating,
 * 7-30 days) and the Supabase Auth session (RLS data queries, short ~1h access
 * token + rotating refresh token). The Supabase access token can be expired on
 * a cold read — or its refresh can race with the proxy's own refresh — so a bare
 * `getUser()` returns null even though the user is still logged in. That null
 * was being treated as "session expired" (toast) and as "no data" (empty Negocios).
 *
 * One explicit `refreshSession()` recovers the common case (valid refresh token,
 * just-expired access token). Only when that also fails is the Supabase session
 * genuinely gone, which callers signal via `refreshFailed`.
 */
export async function getActiveUser(
  supabase: SupabaseClient<Database>,
): Promise<{ user: User | null; refreshFailed: boolean }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return { user, refreshFailed: false }

  // Access token missing/expired → try to mint a new one from the refresh token.
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.user) return { user: null, refreshFailed: true }
  return { user: data.user, refreshFailed: false }
}
