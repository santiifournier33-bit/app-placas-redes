import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/ventas/supabase-admin'

const updateSchema = z.object({
  body_html: z.string().min(1).optional(),
  variables: z.any().optional(),
  signer_roles: z.any().optional(),
  name: z.string().trim().min(1).optional(),
})

// PUT /api/signatures/templates-managed/[id] — editar plantilla (solo admin).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado', code: 'UNAUTHORIZED' }, { status: 401 })
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden editar plantillas', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => null)
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success || Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'Datos inválidos', code: 'VALIDATION' }, { status: 400 })
    }

    // version = version + 1 (RPC-less: leer y escribir).
    const { data: current, error: readErr } = await supabaseAdmin
      .from('signature_templates')
      .select('version')
      .eq('id', id)
      .is('deleted_at', null)
      .single()
    if (readErr || !current) {
      return NextResponse.json({ error: 'Plantilla no encontrada', code: 'NOT_FOUND' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('signature_templates')
      .update({
        ...parsed.data,
        version: (current.version ?? 1) + 1,
        updated_by: session.email,
      })
      .eq('id', id)
      .select('id, slug, name, version, updated_at')
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, template: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[templates-managed PUT]', message)
    return NextResponse.json({ error: message, code: 'SERVER_ERROR' }, { status: 500 })
  }
}
