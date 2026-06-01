import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/ventas/supabase-admin"
import { getSession } from "@/lib/auth/session"
import { getPeriodRange, FUNNEL_STAGES, type FunnelStage, type Period } from "@/lib/embudo/funnel"

interface AgentRow {
  email: string
  name: string | null
  counts: Record<FunnelStage, number>
}

function emptyCounts(): Record<FunnelStage, number> {
  return FUNNEL_STAGES.reduce((acc, s) => { acc[s] = 0; return acc }, {} as Record<FunnelStage, number>)
}

// GET /api/embudo/leaderboard?period=week|month&date=yyyy-MM-dd
// Aggregated funnel counts per active advisor for the period. All advisors are
// visible to everyone (this is the point of the leaderboard). `me` flags the caller.
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") === "month" ? "month" : "week") as Period
    const dateParam = searchParams.get("date")
    const ref = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date()
    const { start, end } = getPeriodRange(period, ref)

    const [agentsRes, actsRes, goalsRes] = await Promise.all([
      supabaseAdmin
        .from("agent_history")
        .select("email, name, is_active_in_tokko")
        .eq("is_active_in_tokko", true),
      supabaseAdmin
        .from("funnel_activities")
        .select("agent_email, stage, quantity")
        .is("deleted_at", null)
        .gte("activity_date", start)
        .lte("activity_date", end),
      supabaseAdmin
        .from("funnel_goals")
        .select("stage, monthly_target, active"),
    ])

    if (agentsRes.error) throw agentsRes.error
    if (actsRes.error) throw actsRes.error
    if (goalsRes.error) throw goalsRes.error

    const byEmail = new Map<string, AgentRow>()
    for (const a of agentsRes.data ?? []) {
      byEmail.set(a.email, { email: a.email, name: a.name, counts: emptyCounts() })
    }
    // Ensure the caller appears even if not in agent_history yet.
    if (!byEmail.has(session.email)) {
      byEmail.set(session.email, { email: session.email, name: null, counts: emptyCounts() })
    }

    for (const act of actsRes.data ?? []) {
      const row = byEmail.get(act.agent_email)
      if (!row) continue
      const stage = act.stage as FunnelStage
      if (stage in row.counts) row.counts[stage] += Number(act.quantity) || 0
    }

    return NextResponse.json({
      success: true,
      data: Array.from(byEmail.values()),
      goals: goalsRes.data,
      me: session.email,
      period,
      range: { start, end },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("[embudo/leaderboard GET]", message)
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}
