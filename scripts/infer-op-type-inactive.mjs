// Infers operation_type for inquiries with property_active=false (Tokko already deleted prop).
// Sources of truth in priority order:
//   1. raw_payload.tags[] (e.g. "Venta", "Alquiler", "Alquiler Temporal")
//   2. property_snapshot.publication_title regex
//   3. property_snapshot.address regex
//   4. comment regex (last resort)

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function log(...a) { console.log(`[${new Date().toISOString()}]`, ...a) }

function inferOpFromTags(tags) {
  if (!Array.isArray(tags)) return null
  for (const t of tags) {
    const name = typeof t === 'string' ? t : (t?.name ?? '')
    const x = name.toLowerCase()
    if (/alquiler\s*temporal|temporario/.test(x)) return 3
    if (x === 'alquiler' || x.startsWith('alquiler ')) return 2
    if (x === 'venta' || x.startsWith('venta ')) return 1
  }
  return null
}

function inferOpFromText(text) {
  if (!text) return null
  const t = text.toLowerCase()
  if (/alquiler\s*temporal|temporario/.test(t)) return 3
  if (/alquila|alquiler|rent/.test(t)) return 2
  if (/venta|vende|sale/.test(t)) return 1
  return null
}

async function main() {
  log('Fetching inquiries with property_active=false and operation_type missing...')

  let offset = 0
  const batchSize = 500
  let total = 0
  let updated = 0
  let still_unknown = 0
  let errors = 0

  while (true) {
    const { data: rows, error } = await supabase
      .from('inquiries')
      .select('id, raw_payload, property_snapshot, comment, tags')
      .eq('property_active', false)
      .range(offset, offset + batchSize - 1)

    if (error) { console.error('fetch error:', error); break }
    if (!rows || rows.length === 0) break

    for (const row of rows) {
      total++
      const currentOp = row.property_snapshot?.operation_type
      if (currentOp != null) continue  // already has it

      // Try 1: raw_payload.tags
      let opType = inferOpFromTags(row.raw_payload?.tags ?? row.tags)
      // Try 2: publication_title
      if (opType == null) opType = inferOpFromText(row.property_snapshot?.publication_title)
      // Try 3: fallback_title (from older Excel imports)
      if (opType == null) opType = inferOpFromText(row.property_snapshot?.fallback_title)
      // Try 4: address
      if (opType == null) opType = inferOpFromText(row.property_snapshot?.address)
      // Try 5: comment (user's message)
      if (opType == null) opType = inferOpFromText(row.comment)

      if (opType == null) { still_unknown++; continue }

      const newSnap = { ...row.property_snapshot, operation_type: opType, _op_source: 'inferred' }
      const { error: uErr } = await supabase
        .from('inquiries')
        .update({ property_snapshot: newSnap })
        .eq('id', row.id)

      if (uErr) { errors++; if (errors <= 5) console.error('update err:', uErr.message) }
      else updated++

      if (updated > 0 && updated % 200 === 0) log(`progress: ${updated} updated, ${still_unknown} unknown`)
    }

    if (rows.length < batchSize) break
    offset += batchSize
  }

  console.log('\n=== DONE ===')
  console.log(JSON.stringify({ total_inactive: total, updated, still_unknown, errors }, null, 2))
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
