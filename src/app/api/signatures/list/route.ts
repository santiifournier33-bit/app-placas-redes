import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getApiUser } from '@/lib/auth/api-auth'

const DOCUSEAL_URL = process.env.DOCUSEAL_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!

export async function GET() {
  try {
    const user = await getApiUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Load this user's DocuSeal submission ids from the local mapping table.
    // Service client bypasses RLS, so scope to the owner explicitly (was RLS-scoped before).
    const admin = createServiceClient()
    const { data: mappings, error: mappingErr } = await admin
      .from('signature_submissions')
      .select('docuseal_submission_id')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (mappingErr) {
      console.error('signature_submissions select failed:', mappingErr)
      return NextResponse.json({ error: 'Error al leer firmas locales' }, { status: 500 })
    }

    const ownedIds = new Set(
      (mappings ?? []).map(m => String(m.docuseal_submission_id))
    )

    if (ownedIds.size === 0) {
      return NextResponse.json({ submissions: [] })
    }

    // Fetch full DocuSeal data for ALL submissions, then filter by ownedIds.
    // DocuSeal Free API doesn't support filtering by ID list, so we fetch and intersect.
    const res = await fetch(`${DOCUSEAL_URL}/api/submissions?limit=100`, {
      headers: { 'X-Auth-Token': DOCUSEAL_API_KEY },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al obtener documentos de DocuSeal' }, { status: res.status })
    }

    const data = await res.json()

    const submissions = (data.data || [])
      .filter((sub: any) => ownedIds.has(String(sub.id)))
      .map((sub: any) => ({
        id: sub.id,
        name: sub.name || `Documento #${sub.id}`,
        status: sub.status,
        created_at: sub.created_at,
        completed_at: sub.completed_at,
        submitters: (sub.submitters || []).map((s: any) => ({
          id: s.id,
          name: s.name || '',
          email: s.email || '',
          status: s.status,
          completed_at: s.completed_at,
        })),
      }))

    return NextResponse.json({ submissions })
  } catch (err: any) {
    console.error('Error en /api/signatures/list:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
