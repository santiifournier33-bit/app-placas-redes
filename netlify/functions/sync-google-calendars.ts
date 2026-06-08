// Scheduled Google Calendar sync (M4).
//
// The app already has a manual "sync" button that runs syncCalendarForUser
// (pull from Google + push local events). This job runs that same logic
// automatically for every active connection so each advisor's agenda stays
// current without tapping anything. Per-user best-effort: one user's failure
// (revoked token, quota) must not block the rest.
//
// Conflict policy is whatever syncCalendarForUser already implements
// ("last write wins", Google as source of truth). Each advisor links their OWN
// Google account — there is no shared calendar, so no cross-user conflict.
//
// Notes: Netlify scheduled functions run only on published PRODUCTION deploys,
// in UTC, with a 30s timeout. The `@/` alias does NOT resolve in the function
// bundle, hence the relative import below. calendar.ts only imports `googleapis`
// and `@supabase/supabase-js` (no alias), so it bundles cleanly.

import { createClient } from "@supabase/supabase-js"
import { syncCalendarForUser } from "../../src/lib/google/calendar"

export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[sync-google-calendars] missing Supabase env")
    return new Response("missing supabase env", { status: 500 })
  }

  const supabase = createClient(url, key)

  const { data: conns, error } = await supabase
    .from("google_calendar_connections")
    .select("owner_id")
    .eq("is_active", true)
    .limit(100)

  if (error) {
    console.error("[sync-google-calendars] query failed:", error.message)
    return new Response("query error", { status: 500 })
  }
  if (!conns || conns.length === 0) {
    return new Response("no active connections")
  }

  let ok = 0
  let failed = 0
  for (const c of conns) {
    try {
      await syncCalendarForUser(c.owner_id as string)
      ok++
    } catch (e) {
      failed++
      console.error("[sync-google-calendars] sync failed for", c.owner_id, e instanceof Error ? e.message : e)
    }
  }

  return new Response(`synced ${ok} ok, ${failed} failed`)
}

export const config = {
  // Every 15 minutes — keeps agendas fresh without hammering the Google API quota.
  schedule: "*/15 * * * *",
}
