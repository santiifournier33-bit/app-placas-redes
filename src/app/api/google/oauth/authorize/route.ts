import { NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth/api-auth"
import { getAuthUrl } from "@/lib/google/calendar"

export async function GET() {
  try {
    const user = await getApiUser()

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
