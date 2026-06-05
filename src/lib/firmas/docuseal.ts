/**
 * Wrapper mínimo de DocuSeal para crear envíos desde HTML.
 *
 * DocuSeal expone (según versión) un endpoint de un paso `POST /api/submissions/html`
 * o el flujo de dos pasos `POST /api/templates/html` → `POST /api/submissions`.
 * Probamos el de un paso y, si la instancia no lo soporta (404/405), caemos al de dos
 * pasos. Así el código es resiliente a la versión self-hosted instalada sin sondear prod.
 */

import 'server-only'

const DOCUSEAL_URL = process.env.DOCUSEAL_URL!
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!
const TIMEOUT_MS = 10_000 // regla api.md: timeout en llamadas externas

export interface HtmlSubmissionParams {
  /** Nombre/título del documento. */
  name: string
  /** HTML final con los tags `{{...;role=...;type=signature}}` ya inyectados. */
  html: string
  /** Firmantes: role debe matchear los tags del HTML. */
  submitters: Array<{ role: string; name: string; email: string }>
  /** reply-to del email (email del asesor). */
  replyTo?: string
}

export interface DocusealResult {
  /** Id de la submission en DocuSeal (para mapear localmente). */
  submissionId: string | null
  /** Respuesta cruda de DocuSeal. */
  raw: unknown
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Auth-Token': DOCUSEAL_API_KEY }
}

async function docusealFetch(path: string, body: unknown): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(`${DOCUSEAL_URL}${path}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(t)
  }
}

function extractSubmissionId(data: any): string | null {
  if (Array.isArray(data) && data[0]?.submission_id) return String(data[0].submission_id)
  if (Array.isArray(data) && data[0]?.id) return String(data[0].id)
  if (data?.id) return String(data.id)
  if (data?.submission_id) return String(data.submission_id)
  return null
}

/** Crea un envío en DocuSeal a partir de HTML. Lanza Error con mensaje legible si falla. */
export async function createSubmissionFromHtml(params: HtmlSubmissionParams): Promise<DocusealResult> {
  const { name, html, submitters, replyTo } = params

  // --- Intento 1: un paso ---
  const oneStepBody = {
    name,
    send_email: true,
    ...(replyTo ? { reply_to: replyTo } : {}),
    documents: [{ name, html }],
    submitters,
  }
  let res = await docusealFetch('/api/submissions/html', oneStepBody)

  // Si el endpoint no existe en esta versión, caer al flujo de dos pasos.
  if (res.status === 404 || res.status === 405) {
    return await createViaTemplate(params)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Error en DocuSeal al crear el envío (HTML).')
  }
  return { submissionId: extractSubmissionId(data), raw: data }
}

/** Flujo de dos pasos: crear template desde HTML y luego la submission. */
async function createViaTemplate(params: HtmlSubmissionParams): Promise<DocusealResult> {
  const { name, html, submitters, replyTo } = params

  const tplRes = await docusealFetch('/api/templates/html', { name, html })
  const tpl = await tplRes.json().catch(() => null)
  if (!tplRes.ok || !tpl?.id) {
    throw new Error(tpl?.error || tpl?.message || 'Error en DocuSeal al crear la plantilla (HTML).')
  }

  const subRes = await docusealFetch('/api/submissions', {
    template_id: tpl.id,
    send_email: true,
    ...(replyTo ? { reply_to: replyTo } : {}),
    submitters,
  })
  const data = await subRes.json().catch(() => null)
  if (!subRes.ok) {
    throw new Error(data?.error || data?.message || 'Error en DocuSeal al crear el envío.')
  }
  return { submissionId: extractSubmissionId(data), raw: data }
}
