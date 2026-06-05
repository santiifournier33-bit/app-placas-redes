// Smoke test: confirma que DocuSeal acepta crear un envío desde HTML.
// NO manda emails (send_email:false). Crea una submission borrador con un campo
// de firma y reporta qué endpoint respondió (/submissions/html o fallback templates/html).
//
// Uso: node scripts/firmas-docuseal-smoke.mjs

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const DOCUSEAL_URL = process.env.DOCUSEAL_URL
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY

if (!DOCUSEAL_URL || !DOCUSEAL_API_KEY) {
  console.error('❌ Faltan DOCUSEAL_URL / DOCUSEAL_API_KEY en .env.local')
  process.exit(1)
}

const headers = { 'Content-Type': 'application/json', 'X-Auth-Token': DOCUSEAL_API_KEY }

const html = `
<div style="font-family: Arial; padding: 24px;">
  <h2>SMOKE TEST — Firma electrónica</h2>
  <p>Documento de prueba para verificar el endpoint HTML de DocuSeal.</p>
  <p>Firma del propietario:</p>
  {{Firma Propietario 1;role=Propietario 1;type=signature}}
</div>`

const submitters = [{ role: 'Propietario 1', name: 'Test Smoke', email: 'smoke-test@example.com' }]

async function call(pathname, body) {
  const res = await fetch(`${DOCUSEAL_URL}${pathname}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, ok: res.ok, data }
}

async function main() {
  console.log(`→ DocuSeal: ${DOCUSEAL_URL}`)

  // Intento 1: un paso
  console.log('\n[1] POST /api/submissions/html (send_email:false)…')
  const one = await call('/api/submissions/html', {
    name: 'SMOKE TEST',
    send_email: false,
    documents: [{ name: 'smoke', html }],
    submitters,
  })
  console.log(`    status ${one.status}`)
  if (one.ok) {
    console.log('✅ Endpoint de UN PASO soportado: /api/submissions/html')
    console.log('    respuesta:', JSON.stringify(one.data)?.slice(0, 400))
    return
  }
  if (one.status !== 404 && one.status !== 405) {
    console.log('    respuesta:', JSON.stringify(one.data)?.slice(0, 400))
  }

  // Fallback: dos pasos
  console.log('\n[2] Fallback → POST /api/templates/html …')
  const tpl = await call('/api/templates/html', { name: 'SMOKE TEST', html })
  console.log(`    status ${tpl.status}`)
  if (!tpl.ok || !tpl.data?.id) {
    console.log('❌ No se pudo crear template desde HTML:', JSON.stringify(tpl.data)?.slice(0, 400))
    process.exit(1)
  }
  console.log(`    template id = ${tpl.data.id}`)

  console.log('\n[3] POST /api/submissions (send_email:false) …')
  const sub = await call('/api/submissions', {
    template_id: tpl.data.id,
    send_email: false,
    submitters,
  })
  console.log(`    status ${sub.status}`)
  if (sub.ok) {
    console.log('✅ Flujo de DOS PASOS soportado: /api/templates/html → /api/submissions')
    console.log('    respuesta:', JSON.stringify(sub.data)?.slice(0, 400))
  } else {
    console.log('❌ Falló submission:', JSON.stringify(sub.data)?.slice(0, 400))
    process.exit(1)
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
