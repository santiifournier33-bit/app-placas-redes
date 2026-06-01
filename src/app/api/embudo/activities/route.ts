import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/ventas/supabase-admin"
import { getSession } from "@/lib/auth/session"
import { getPeriodRange, type Period } from "@/lib/embudo/funnel"
import { createActivitySchema, normalizeForStage, firstZodMessage } from "@/lib/embudo/validation"

// GET /api/embudo/activities?period=week|month&date=yyyy-MM-dd[&agent=email]
// Returns the caller's own activities for the period. Admins may pass ?agent=
// to read another advisor's activities (used by leaderboard drill-down).
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") === "month" ? "month" : "week") as Period
    const dateParam = searchParams.get("date")
    const ref = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date()
    const { start, end } = getPeriodRange(period, ref)

    const requestedAgent = searchParams.get("agent")
    const agentEmail = requestedAgent && session.role === "admin" ? requestedAgent : session.email

    const { data, error } = await supabaseAdmin
      .from("funnel_activities")
      .select("*")
      .eq("agent_email", agentEmail)
      .is("deleted_at", null)
      .gte("activity_date", start)
      .lte("activity_date", end)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return NextResponse.json({ success: true, data, range: { start, end } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("[embudo/activities GET]", message)
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}

// POST /api/embudo/activities — create one activity for the caller.
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 })

    const body = await request.json().catch(() => null)
    const parsed = createActivitySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodMessage(parsed.error), code: "VALIDATION" }, { status: 400 })
    }

    const v = parsed.data
    const fields = normalizeForStage(v.stage, v)

    const { data, error } = await supabaseAdmin
      .from("funnel_activities")
      .insert({
        agent_email: session.email,
        stage: v.stage,
        activity_date: v.activity_date,
        ...fields,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("[embudo/activities POST]", message)
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}
