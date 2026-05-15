import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendPushToUser } from "@/lib/push/server"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const sent = await sendPushToUser(user.id, {
      title: "Freire Propiedades",
      body: "Notificacion de prueba — push funciona correctamente",
      url: "/dashboard",
    })

    return NextResponse.json({ ok: true, sent })
  } catch {
    return NextResponse.json(
      { error: "Failed to send test push", code: "PUSH_ERROR" },
      { status: 500 }
    )
  }
}
