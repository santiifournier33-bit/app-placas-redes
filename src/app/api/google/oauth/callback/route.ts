import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { exchangeCode, getOAuth2Client } from "@/lib/google/calendar"
import { google } from "googleapis"

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code")
    const userId = req.nextUrl.searchParams.get("state")

    if (!code || !userId) {
      return NextResponse.redirect(new URL("/productividad/calendario?error=missing_params", req.url))
    }

    const tokens = await exchangeCode(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(new URL("/productividad/calendario?error=no_tokens", req.url))
    }

    const oauth2 = getOAuth2Client()
    oauth2.setCredentials(tokens)
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 })
    const { data: userInfo } = await oauth2Api.userinfo.get()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase.from("google_calendar_connections").upsert(
      {
        owner_id: userId,
        google_account_email: userInfo.email ?? "unknown",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true,
      },
      { onConflict: "owner_id" }
    )

    return NextResponse.redirect(new URL("/productividad/calendario?google=connected", req.url))
  } catch {
    return NextResponse.redirect(new URL("/productividad/calendario?error=oauth_failed", req.url))
  }
}
