import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getApiUser } from '@/lib/auth/api-auth'

const DOCUSEAL_URL = process.env.DOCUSEAL_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { template_id, signers, reply_to, customSubject, customBody } = await req.json()

    if (!template_id || !signers || signers.length === 0) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 })
    }

    const submitters = signers.map((s: any) => ({
      role: s.role,
      name: s.name,
      email: s.email,
      ...(s.send_email !== undefined ? { preferences: { send_email: s.send_email } } : {}),
      ...(s.values ? { values: s.values } : {}),
      ...(s.phone ? { phone: s.phone } : {})
    }))

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

    // DocuSeal returns submissions array (one per submitter). Use the first one's submission_id
    // since all submitters of a single create call share the same submission.
    const docusealSubmissionId =
      Array.isArray(data) && data[0]?.submission_id
        ? String(data[0].submission_id)
        : data?.id
          ? String(data.id)
          : null

    if (docusealSubmissionId) {
      const admin = createServiceClient()
      const { error: insertErr } = await admin
        .from('signature_submissions')
        .insert({
          docuseal_submission_id: docusealSubmissionId,
          owner_id: user.id,
          template_id: String(template_id),
          status: 'pending',
        })

      if (insertErr) {
        console.error('Failed to record signature_submission mapping:', insertErr)
      }
    } else {
      console.warn('DocuSeal response did not include submission id; mapping skipped', data)
    }

    return NextResponse.json({ success: true, submission: data })
  } catch (err: any) {
    console.error('Error en /api/signatures/create:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
