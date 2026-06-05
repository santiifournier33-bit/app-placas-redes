import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getApiUser } from '@/lib/auth/api-auth'

/**
 * Promueve un lead a contacto personal: setea contacts.kind='personal'.
 * Es la única vía para que una identidad de consulta aparezca en el módulo Contactos.
 * No mueve datos ni toca inquiries → el matching no se ve afectado.
 * Autorización: admin o dueño del contacto.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getApiUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    const isAdmin = user.role === 'admin'

    const admin = createServiceClient()

    const { data: contact } = await admin
      .from('contacts')
      .select('id, owner_id, kind')
      .eq('id', id)
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'contact_not_found', code: 'NOT_FOUND' }, { status: 404 })
    }
    if (!isAdmin && contact.owner_id !== user.id) {
      return NextResponse.json({ error: 'forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    if (contact.kind === 'personal') {
      return NextResponse.json({ ok: true, already: true })
    }

    const { error } = await admin
      .from('contacts')
      .update({ kind: 'personal', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message, code: 'UPDATE_FAILED' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg, code: 'INTERNAL' }, { status: 500 })
  }
}
