import { NextResponse } from 'next/server'

const DOCUSEAL_URL = process.env.DOCUSEAL_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!

export async function GET() {
  try {
    const res = await fetch(`${DOCUSEAL_URL}/api/submissions?limit=50`, {
      headers: { 'X-Auth-Token': DOCUSEAL_API_KEY },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al obtener documentos de DocuSeal' }, { status: res.status })
    }

    const data = await res.json()

    // data.data is the array of submissions
    const submissions = (data.data || []).map((sub: any) => ({
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
