import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth/api-auth"
import { syncCalendarForUser } from "@/lib/google/calendar"

export async function POST() {
  try {
    const user = await getApiUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const result = await syncCalendarForUser(user.id)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json(
      { error: "Sync failed", code: "SYNC_ERROR" },
      { status: 500 }
    )
  }
}
