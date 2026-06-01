import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/ventas/supabase-admin"
import { getSession } from "@/lib/auth/session"
import { updateActivitySchema, normalizeForStage, firstZodMessage } from "@/lib/embudo/validation"

async function loadOwned(id: string, email: string, role: string) {
  const { data, error } = await supabaseAdmin
    .from("funnel_activities")
    .select("id, agent_email, stage, deleted_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  if (!data || data.deleted_at) return { row: null as null, forbidden: false }
  const owns = data.agent_email === email || role === "admin"
  return { row: owns ? data : null, forbidden: !owns }
}

// PATCH /api/embudo/activities/:id — edit own activity (stage immutable).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 })

    const { row, forbidden } = await loadOwned(id, session.email, session.role)
    if (forbidden) return NextResponse.json({ error: "Sin permiso", code: "FORBIDDEN" }, { status: 403 })
    if (!row) return NextResponse.json({ error: "Actividad no encontrada", code: "NOT_FOUND" }, { status: 404 })

    const body = await req.json().catch(() => null)
    // stage comes from the stored row — it cannot be changed via PATCH.
    const parsed = updateActivitySchema.safeParse({ ...body, stage: row.stage })
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodMessage(parsed.error), code: "VALIDATION" }, { status: 400 })
    }

    const v = parsed.data
    const fields = normalizeForStage(row.stage, v)
    const update: Record<string, unknown> = { ...fields }
    if (v.activity_date) update.activity_date = v.activity_date

    const { data, error } = await supabaseAdmin
      .from("funnel_activities")
      .update(update)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("[embudo/activities PATCH]", message)
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}

// DELETE /api/embudo/activities/:id — soft-delete own activity.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "No autorizado", code: "UNAUTHORIZED" }, { status: 401 })

    const { row, forbidden } = await loadOwned(id, session.email, session.role)
    if (forbidden) return NextResponse.json({ error: "Sin permiso", code: "FORBIDDEN" }, { status: 403 })
    if (!row) return NextResponse.json({ error: "Actividad no encontrada", code: "NOT_FOUND" }, { status: 404 })

    const { error } = await supabaseAdmin
      .from("funnel_activities")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    console.error("[embudo/activities DELETE]", message)
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}
