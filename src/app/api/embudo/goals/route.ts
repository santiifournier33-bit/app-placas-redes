import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/ventas/supabase-admin"
import { getSession } from "@/lib/auth/session"
import { FUNNEL_STAGES, type FunnelStage } from "@/lib/embudo/funnel"
import { firstZodMessage } from "@/lib/embudo/validation"

// GET /api/embudo/goals — all stage goals (any authenticated user).
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from("funnel_goals")
      .select("stage, monthly_target, active")
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("[embudo/goals GET]", message)
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}

const putSchema = z.object({
  goals: z.array(z.object({
    stage: z.enum(FUNNEL_STAGES as [FunnelStage, ...FunnelStage[]]),
    monthly_target: z.coerce.number().min(0).max(100000),
    active: z.boolean().optional(),
  })).min(1),
})

// PUT /api/embudo/goals — admin upserts goals (global, one row per stage).
export async function PUT(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "No autorizado", code: "FORBIDDEN" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodMessage(parsed.error), code: "VALIDATION" }, { status: 400 })
    }

    const rows = parsed.data.goals.map(g => ({
      stage: g.stage,
      monthly_target: g.monthly_target,
      active: g.active ?? true,
      updated_by: session.email,
    }))

    const { data, error } = await supabaseAdmin
      .from("funnel_goals")
      .upsert(rows, { onConflict: "stage" })
      .select("stage, monthly_target, active")
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("[embudo/goals PUT]", message)
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}
