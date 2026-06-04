import { NextRequest, NextResponse } from "next/server"
import { getApiUser } from "@/lib/auth/api-auth"
import { pushTaskToGoogle, removeTaskFromGoogle } from "@/lib/google/calendar"

export async function POST(req: NextRequest) {
  const user = await getApiUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { taskId, action } = await req.json()
  if (!taskId || !action) {
    return NextResponse.json({ error: "Missing taskId or action" }, { status: 400 })
  }

  try {
    if (action === "push") {
      const ok = await pushTaskToGoogle(user.id, taskId)
      return NextResponse.json({ success: ok })
    }
    if (action === "remove") {
      const ok = await removeTaskFromGoogle(user.id, taskId)
      return NextResponse.json({ success: ok })
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    console.error("google/tasks/sync error", err)
    return NextResponse.json({ error: err.message || "sync failed" }, { status: 500 })
  }
}
