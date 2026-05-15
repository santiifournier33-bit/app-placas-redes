import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUrl } from "@/lib/google/calendar"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const url = getAuthUrl(user.id)
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.json(
      { error: "Failed to generate auth URL", code: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}
