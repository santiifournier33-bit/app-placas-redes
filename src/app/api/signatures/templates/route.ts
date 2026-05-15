import { NextResponse } from 'next/server'

const DOCUSEAL_URL = process.env.DOCUSEAL_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch(`${DOCUSEAL_URL}/api/templates?limit=50`, {
      headers: { 'X-Auth-Token': DOCUSEAL_API_KEY },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Error al obtener plantillas de DocuSeal' }, { status: res.status })
    }

    const data = await res.json()

    // Map template data for the frontend
    const templates = (data.data || []).map((tpl: any) => {
      // Group fields by submitter role
      const fieldsByRole: Record<string, any[]> = {}
      
      if (tpl.fields) {
        tpl.fields.forEach((field: any) => {
          // Skip signature fields, we only want text/date/number fields for pre-filling
          if (field.type === 'signature') return
          
          // Find the role name for this field's submitter_uuid
          const submitter = tpl.submitters?.find((s: any) => s.uuid === field.submitter_uuid)
          if (submitter) {
            if (!fieldsByRole[submitter.name]) fieldsByRole[submitter.name] = []
            // Only add fields that have a name
            if (field.name) {
              fieldsByRole[submitter.name].push({
                name: field.name,
                type: field.type,
                required: field.required
              })
            }
          }
        })
      }

      return {
        id: tpl.id,
        name: tpl.name,
        roles: (tpl.submitters || []).map((s: any) => s.name),
        fieldsByRole,
        documents: (tpl.documents || []).map((d: any) => ({
          name: d.filename,
          preview: d.preview_image_url
        }))
      }
    })

    return NextResponse.json({ templates })
  } catch (err: any) {
    console.error('Error en /api/signatures/templates:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
