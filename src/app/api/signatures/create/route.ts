import { NextRequest, NextResponse } from 'next/server'

const DOCUSEAL_URL = process.env.DOCUSEAL_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const { template_id, signers, reply_to, customSubject, customBody } = await req.json()

    if (!template_id || !signers || signers.length === 0) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    // Map frontend signers to DocuSeal submitters
    const submitters = signers.map((s: any) => ({
      role: s.role,
      name: s.name,
      email: s.email,
      ...(s.send_email !== undefined ? { preferences: { send_email: s.send_email } } : {}), // Allows skipping email for "Sistema" role
      ...(s.values ? { values: s.values } : {}),
      ...(s.phone ? { phone: s.phone } : {})
    }))

    // Create submission from template (Free API)
    const payload = {
      template_id: parseInt(template_id),
      send_email: true,
      ...(reply_to ? { reply_to } : {}),
      ...(customSubject || customBody ? { 
        message: { 
          ...(customSubject ? { subject: customSubject } : {}),
          ...(customBody ? { body: customBody } : {})
        } 
      } : {}),
      submitters,
    }

    const res = await fetch(`${DOCUSEAL_URL}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': DOCUSEAL_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('DocuSeal error:', data)
      return NextResponse.json(
        { error: data?.error || data?.message || 'Error en DocuSeal al enviar la plantilla' },
        { status: res.status }
      )
    }

    return NextResponse.json({ success: true, submission: data })
  } catch (err: any) {
    console.error('Error en /api/signatures/create:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}

