import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getApiUser } from "@/lib/auth/api-auth"

export async function POST(req: NextRequest) {
  try {
    const { endpoint, p256dh, auth } = await req.json()

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Missing subscription fields", code: "INVALID_INPUT" },
        { status: 400 }
      )
    }

    const user = await getApiUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const admin = createServiceClient()
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        owner_id: user.id,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        device_label: req.headers.get("user-agent")?.slice(0, 100) ?? null,
      },
      { onConflict: "owner_id,endpoint" }
    )

    if (error) {
      return NextResponse.json(
        { error: "Failed to save subscription", code: "DB_ERROR" },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
