import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Resolve the current Supabase Auth user with a three-step recovery ladder:
 * getUser() → refreshSession() → POST /api/auth/recover (jose→Supabase bridge).
 *
 * The app runs TWO parallel sessions: the jose `session` cookie (page gating,
 * 30-90 days, sliding renewal in the proxy) and the Supabase Auth session (RLS
 * data queries + Realtime, short ~1h access token + rotating refresh token).
 * The Supabase session can die outright — refresh-token family revoked by reuse
 * detection (multi-tab wakeups, PWA killed mid-rotation, network loss after a
 * rotation) or sb-* cookies evicted — while the jose cookie is still perfectly
 * valid. Historically that dead end showed "sesión expiró" and forced a manual
 * re-login.
 *
 * Step 3 fixes that: /api/auth/recover validates the jose cookie server-side
 * and mints a FRESH Supabase session (new refresh-token family, no reuse
 * detection involved), setting new sb-* cookies on the response. The browser
 * client re-reads cookies on the next getUser(), so we just retry. Live
 * Realtime channels keep the old (dead) JWT — onAuthStateChange does not fire
 * when cookies change underneath the client — so we re-auth them explicitly.
 *
 * `recoverDenied` is the hard signal (recover returned 401/403): jose invalid
 * or account deactivated. Callers should treat it as a real logout. A plain
 * `refreshFailed` without it is soft (network/5xx) — show retry UI, don't eject.
 *
 * Concurrency: several stores call this on mount. We coalesce truly-concurrent
 * calls into a single in-flight promise so only ONE getUser/refresh/recover
 * chain runs; the promise is cleared on settle, so later calls re-check freshly.
 * A failed recover also sets a cooldown so periodic callers (e.g. the consultas
 * badge every 60s) don't hammer the endpoint while it's down.
 */
export interface ActiveUserResult {
  user: User | null
  refreshFailed: boolean
  /** Recover respondió 401/403: jose inválida o cuenta inactiva → logout real. */
  recoverDenied?: boolean
}

let inflight: Promise<ActiveUserResult> | null = null

let lastRecoverFailureAt = 0
const RECOVER_RETRY_COOLDOWN_MS = 30_000

async function tryServerRecover(): Promise<{ ok: boolean; denied: boolean }> {
  if (Date.now() - lastRecoverFailureAt < RECOVER_RETRY_COOLDOWN_MS) {
    return { ok: false, denied: false }
  }
  try {
    const res = await fetch('/api/auth/recover', { method: 'POST' })
    if (res.ok) return { ok: true, denied: false }
    lastRecoverFailureAt = Date.now()
    return { ok: false, denied: res.status === 401 || res.status === 403 }
  } catch {
    // Red caída/offline: fallo blando, no insistir hasta el cooldown.
    lastRecoverFailureAt = Date.now()
    return { ok: false, denied: false }
  }
}

/**
 * Logout real ante `recoverDenied` (jose inválida o cuenta inactiva): limpiar
 * la sesión server-side y mandar a /login. Sin loop posible: /login es público.
 */
export async function hardLogout(): Promise<void> {
  try { await fetch('/api/auth', { method: 'DELETE' }) } catch { /* igual redirigimos */ }
  window.location.assign('/login')
}

export function getActiveUser(
  supabase: SupabaseClient<Database>,
): Promise<ActiveUserResult> {
  if (inflight) return inflight
  inflight = (async (): Promise<ActiveUserResult> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return { user, refreshFailed: false }

    // Access token missing/expired → try to mint a new one from the refresh token.
    const { data, error } = await supabase.auth.refreshSession()
    if (!error && data.user) return { user: data.user, refreshFailed: false }

    // Sesión Supabase genuinamente muerta → puente desde la jose (solo browser).
    if (typeof window !== 'undefined') {
      const recover = await tryServerRecover()
      if (recover.ok) {
        const { data: after } = await supabase.auth.getUser()
        if (after.user) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) supabase.realtime.setAuth(session.access_token)
          return { user: after.user, refreshFailed: false }
        }
      }
      if (recover.denied) return { user: null, refreshFailed: true, recoverDenied: true }
    }
    return { user: null, refreshFailed: true }
  })().finally(() => { inflight = null })
  return inflight
}
