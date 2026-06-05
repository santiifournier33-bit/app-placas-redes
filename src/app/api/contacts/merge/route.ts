import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getApiUser } from '@/lib/auth/api-auth'

/**
 * F6 — Combina dos contactos en uno (merge). Reasigna todas las relaciones del
 * secundario al primario, completa campos vacíos y soft-deletea el secundario.
 * La lógica atómica vive en la función SQL merge_contacts (migración
 * contacts_merge_function). Permisos: ambos contactos deben ser del usuario, o admin.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })

    let body: { primaryId?: string; secondaryId?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json', code: 'BAD_JSON' }, { status: 400 }) }
    const { primaryId, secondaryId } = body
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return NextResponse.json({ error: 'invalid_ids', code: 'BAD_REQUEST' }, { status: 400 })
    }

    const admin = createServiceClient()
    const { data: rows, error: fetchErr } = await admin
      .from('contacts')
      .select('id, owner_id')
      .in('id', [primaryId, secondaryId])
    if (fetchErr) return NextResponse.json({ error: fetchErr.message, code: 'DB_ERROR' }, { status: 500 })
    if (!rows || rows.length !== 2) {
      return NextResponse.json({ error: 'contact_not_found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const isAdmin = user.role === 'admin'
    if (!isAdmin && rows.some(r => r.owner_id !== user.id)) {
      return NextResponse.json({ error: 'forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    const { error } = await admin.rpc('merge_contacts', {
      p_primary: primaryId,
      p_secondary: secondaryId,
    })
    if (error) return NextResponse.json({ error: error.message, code: 'MERGE_FAILED' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg, code: 'INTERNAL' }, { status: 500 })
  }
}
