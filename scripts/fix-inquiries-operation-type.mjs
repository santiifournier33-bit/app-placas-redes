// Fix bug: inquiries with property_active=true but operation_type=null in snapshot.
// Re-fetch Tokko property for each, update snapshot.operation_type using operation_id.

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const TOKKO_KEY = process.env.TOKKO_API_KEY
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function log(...a) { console.log(`[${new Date().toISOString()}]`, ...a) }

async function fetchProperty(tokkoId) {
  const r = await fetch(`https://www.tokkobroker.com/api/v1/property/${tokkoId}/?key=${TOKKO_KEY}&format=json&lang=es_ar`)
  if (!r.ok) return null
  return r.json()
}

function deriveOpType(prop) {
  if (!prop?.operations?.[0]) return null
  const op = prop.operations[0]
  if (typeof op.operation_id === 'number') return op.operation_id
  const t = (op.operation_type || op.type || '').toLowerCase()
  if (t.includes('temporal') || t.includes('temporario')) return 3
  if (t === 'alquiler' || t.includes('rent')) return 2
  if (t === 'venta' || t === 'sale') return 1
  return null
}

async function main() {
  // Get unique tokko_property_ids with property_active=true and missing operation_type
  const { data: rows } = await supabase
    .from('inquiries')
    .select('tokko_property_id, property_snapshot')
    .eq('property_active', true)
  if (!rows) { console.error('No rows'); return }

  const targets = rows.filter(r =>
    r.property_snapshot?._source === 'active' &&
    (r.property_snapshot?.operation_type === null || r.property_snapshot?.operation_type === undefined)
  )
  const uniqueIds = [...new Set(targets.map(r => r.tokko_property_id))]
  log(`Total inquiries to fix: ${targets.length}, unique properties: ${uniqueIds.length}`)

  const propertyCache = new Map()
  let fetched = 0
  let updated = 0
  let errors = 0

  for (const tokkoId of uniqueIds) {
    try {
      const prop = await fetchProperty(tokkoId)
      fetched++
      const opType = deriveOpType(prop)
      propertyCache.set(tokkoId, { prop, opType })
      if ((fetched % 20) === 0) log(`fetched ${fetched}/${uniqueIds.length}`)
    } catch (e) {
      errors++
      log('fetch err', tokkoId, e.message)
    }
  }

  log(`Updating inquiries with new operation_type values...`)

  for (const tokkoId of uniqueIds) {
    const cached = propertyCache.get(tokkoId)
    if (!cached || cached.opType == null) continue

    // Update all inquiries with this property_id
    const { data: inquiries } = await supabase
      .from('inquiries')
      .select('id, property_snapshot')
      .eq('tokko_property_id', String(tokkoId))
      .eq('property_active', true)

    for (const inq of inquiries ?? []) {
      const newSnapshot = { ...(inq.property_snapshot || {}), operation_type: cached.opType }
      const { error } = await supabase
        .from('inquiries')
        .update({ property_snapshot: newSnapshot })
        .eq('id', inq.id)
      if (error) errors++; else updated++
    }
  }

  console.log('\n=== DONE ===')
  console.log({ fetched, updated, errors, uniqueProperties: uniqueIds.length })
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
