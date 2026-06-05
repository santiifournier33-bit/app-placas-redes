import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/ventas/supabase-admin'
import { renderTemplate } from '@/lib/firmas/template-engine'
import { buildAutorizacion, isValidEmail, type AutorizacionInput } from '@/lib/firmas/autorizacion'
import { createSubmissionFromHtml } from '@/lib/firmas/docuseal'

const emailField = z.string().trim().refine(isValidEmail, 'Email inválido')

const conyugeSchema = z.object({
  nombre: z.string().trim().min(1),
  caracter: z.string().trim().min(1),
  email: emailField,
})

const propietarioSchema = z.object({
  nombre: z.string().trim().min(1, 'Falta el nombre de un propietario'),
  dni: z.string().trim().min(1),
  domicilio: z.string().trim().min(1),
  localidad: z.string().trim().min(1),
  partido: z.string().trim().min(1),
  estadoCivil: z.string().trim().min(1),
  telefono: z.string().trim().default(''),
  email: emailField,
  conyuge: conyugeSchema.nullable().optional(),
})

const createSchema = z.object({
  slug: z.string().trim().default('autorizacion-comercializacion'),
  propietarios: z.array(propietarioSchema).min(1, 'Agregá al menos un propietario'),
  propiedad: z.object({
    domicilio: z.string().trim().min(1),
    localidad: z.string().trim().min(1),
    partido: z.string().trim().min(1),
    partidaInmobiliaria: z.string().trim().optional(),
    afectacion: z.string().trim().optional(),
    aptoCredito: z.string().trim().default('NO'),
  }),
  precioUsd: z.number().positive('El precio debe ser mayor a 0'),
  exclusividadDias: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  ejemplares: z.number().int().positive().default(2),
  ciudadFirma: z.string().trim().min(1).default('Pilar'),
})

function firstZodMessage(err: z.ZodError): string {
  return err.issues[0]?.message || 'Datos inválidos'
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodMessage(parsed.error), code: 'VALIDATION' }, { status: 400 })
    }

    // Corredor desde el perfil del asesor (reemplaza el hardcode anterior).
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, email')
      .eq('email', session.email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado', code: 'NO_PROFILE' }, { status: 404 })
    }

    // Cargar plantilla.
    const { data: template, error: tplErr } = await supabaseAdmin
      .from('signature_templates')
      .select('slug, name, body_html')
      .eq('slug', parsed.data.slug)
      .is('deleted_at', null)
      .single()

    if (tplErr || !template) {
      return NextResponse.json({ error: 'Plantilla no encontrada', code: 'NO_TEMPLATE' }, { status: 404 })
    }

    const input: AutorizacionInput = {
      ...parsed.data,
      corredor: {
        nombre: profile.display_name || 'Freire Negocios Inmobiliarios',
        email: profile.email,
      },
    }

    const { data, submitters, docTitle } = buildAutorizacion(input)
    const html = renderTemplate(template.body_html, data)

    const result = await createSubmissionFromHtml({
      name: docTitle,
      html,
      submitters,
      replyTo: session.email,
    })

    if (result.submissionId) {
      const { error: insErr } = await supabaseAdmin.from('signature_submissions').insert({
        docuseal_submission_id: result.submissionId,
        owner_id: profile.id,
        template_id: null,
        template_slug: template.slug,
        doc_title: docTitle,
        signers_snapshot: submitters,
        status: 'pending',
      })
      if (insErr) console.error('[create-html] insert mapping failed:', insErr.message)
    } else {
      console.warn('[create-html] DocuSeal no devolvió submission id', result.raw)
    }

    return NextResponse.json({ success: true, submissionId: result.submissionId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    console.error('[create-html POST]', message)
    return NextResponse.json({ error: message, code: 'SERVER_ERROR' }, { status: 500 })
  }
}
