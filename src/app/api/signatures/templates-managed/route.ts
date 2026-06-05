import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/ventas/supabase-admin'

// GET /api/signatures/templates-managed            → lista (sin body)
// GET /api/signatures/templates-managed?slug=...    → una plantilla completa
// GET /api/signatures/templates-managed?id=...      → una plantilla completa
export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const id = searchParams.get('id')

    if (slug || id) {
      const query = supabaseAdmin
        .from('signature_templates')
        .select('id, slug, name, body_html, variables, signer_roles, version, updated_at')
        .is('deleted_at', null)
      const { data, error } = slug
        ? await query.eq('slug', slug).single()
        : await query.eq('id', id!).single()
      if (error || !data) {
        return NextResponse.json({ error: 'Plantilla no encontrada', code: 'NOT_FOUND' }, { status: 404 })
      }
      return NextResponse.json({ success: true, template: data })
    }

    const { data, error } = await supabaseAdmin
      .from('signature_templates')
      .select('id, slug, name, version, updated_at, updated_by')
      .is('deleted_at', null)
      .order('name', { ascending: true })
    if (error) throw error
    return NextResponse.json({ success: true, templates: data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[templates-managed GET]', message)
    return NextResponse.json({ error: message, code: 'SERVER_ERROR' }, { status: 500 })
  }
}
