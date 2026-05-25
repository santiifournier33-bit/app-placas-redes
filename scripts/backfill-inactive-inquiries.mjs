// Backfill location_id en inquiries que tienen property_snapshot._source = 'inactive'
// (data perdida porque la propiedad estaba borrada al momento del ingest, y el API
// público de Tokko /api/v1/inactiveproperty/{id}/ no preserva geo).
//
// Estrategia: usar el endpoint privado del panel /api3/property/{id}/quick que
// SÍ devuelve toda la data incluso para inactivas. Auth: cookies + JWT Bearer
// almacenados en public.tokko_panel_session.
//
// Uso:
//   node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs --dry-run
//   node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs
//   node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs --limit=10
//   node --env-file=.env.local scripts/backfill-inactive-inquiries.mjs --rate=2000

import { createClient } from '@supabase/supabase-js'
import { setTimeout as sleep } from 'node:timers/promises'

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')))
const DRY_RUN = 'dry-run' in args
const LIMIT = args.limit ? parseInt(args.limit, 10) : null
const RATE_MS = parseInt(args.rate || '2000', 10)
const JITTER_MS = parseInt(args.jitter || '500', 10)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function log(...a) {
  console.error(`[${new Date().toISOString()}]`, ...a)
}

async function delay() {
  await sleep(RATE_MS + Math.random() * JITTER_MS)
}

// ============================================================
// Tokko panel /api3/ helpers
// ============================================================

function cookiesToHeader(cookies) {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

async function fetchPropertyQuick(tokkoId, auth) {
  const url = `https://www.tokkobroker.com/api3/property/${tokkoId}/quick`
  const res = await fetch(url, {
    headers: {
      'Cookie': cookiesToHeader(auth.cookies),
      'Authorization': auth.jwt,
      'Origin': 'https://app.tokkobroker.com',
      'Referer': 'https://app.tokkobroker.com/',
      'Accept': '*/*',
      'Accept-Language': 'es-AR,es;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    },
  })
  if (res.status === 401 || res.status === 403) {
    const err = new Error(`Tokko panel auth failed (${res.status})`)
    err.code = 'AUTH'
    err.status = res.status
    throw err
  }
  if (res.status === 404) {
    const err = new Error(`Tokko panel: property ${tokkoId} not found`)
    err.code = 'NOT_FOUND'
    throw err
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Tokko panel HTTP ${res.status} on ${url}: ${txt.slice(0, 200)}`)
  }
  return await res.json()
}

function buildSnapshotFromApi3(apiResponse) {
  const data = apiResponse?.data
  if (!data) return null

  const basicInfo = {}
  const biArr = Array.isArray(data.basic_info) ? data.basic_info : []
  for (const item of biArr) {
    if (item?.key) basicInfo[item.key] = item.value
  }

  const measurement = {}
  const meArr = Array.isArray(data.measurement) ? data.measurement : []
  for (const item of meArr) {
    if (item?.key) {
      measurement[item.key] = item.original_value ?? item.value
    }
  }

  const geo = data.geolocation
  const geoLat = geo?.lat != null ? Number(geo.lat) : null
  const geoLng = geo?.lng != null ? Number(geo.lng) : null

  const operations = data.operations
  let operationType = null
  let price = null
  let currency = null
  if (operations) {
    const sale = operations.Sale?.[0]
    const rent = operations.Rent?.[0]
    const temp = operations.Temporary_Rent?.[0]
    const first = sale ?? rent ?? temp
    if (first) {
      operationType = sale ? 1 : rent ? 2 : temp ? 3 : null
      const m = String(first).match(/^([A-Z]{3})\s+([\d.,]+)/)
      if (m) {
        currency = m[1]
        const numStr = m[2].replace(/\./g, '').replace(',', '.')
        const parsed = Number(numStr)
        if (Number.isFinite(parsed)) price = parsed
      }
    }
  }

  const locationFull = data.location ?? null
  const locationName = locationFull
    ? locationFull.split('|').map(s => s.trim()).filter(Boolean).slice(-1)[0] ?? null
    : null

  return {
    tokko_id: data.id ?? null,
    reference: data.reference ?? null,
    reference_code: data.reference ?? null,
    address: data.address ?? null,
    publication_title: data.address ?? null,
    operation_type: operationType,
    price,
    currency,
    property_type: data.type ?? null,
    rooms_total: basicInfo.room_amount ?? null,
    bedrooms: basicInfo.suite_amount ?? (typeof basicInfo.room_amount === 'number' ? Math.max(basicInfo.room_amount - 1, 0) : null),
    bathrooms: basicInfo.bathroom_amount ?? null,
    surface_total: measurement.total_surface ?? null,
    surface_covered: measurement.roofed_surface ?? null,
    geo_lat: geoLat,
    geo_long: geoLng,
    location_name: locationName,
    location_full: locationFull,
    cover_photo_url: data.pictures?.front_cover_image?.url ?? null,
    producer_email: null,
    status: data.status ?? null,
    _source: 'inactive_recovered',
    _recovered_at: new Date().toISOString(),
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  log('=== Backfill inactive inquiries ===')
  log(`dry_run=${DRY_RUN} rate=${RATE_MS}ms jitter=${JITTER_MS}ms limit=${LIMIT ?? 'none'}`)

  log('Loading Tokko panel auth...')
  const { data: sess, error: sessErr } = await supabase
    .from('tokko_panel_session')
    .select('cookies, jwt, expires_at, jwt_expires_at')
    .eq('id', 'default')
    .single()
  if (sessErr) { console.error('Session load error:', sessErr); process.exit(1) }
  if (!sess?.cookies || !sess?.jwt) {
    console.error('tokko_panel_session missing cookies or jwt. Run scripts/tokko-panel-renew-session.mjs first.')
    process.exit(1)
  }
  const auth = { cookies: sess.cookies, jwt: sess.jwt }
  log(`Cookies: ${auth.cookies.length}, JWT length: ${auth.jwt.length}`)
  log(`Cookies expire: ${sess.expires_at}, JWT expires: ${sess.jwt_expires_at}`)

  const cutoffIso = new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString()
  let q = supabase
    .from('inquiries')
    .select('id, tokko_property_id, property_snapshot, last_inquired_at')
    .gte('last_inquired_at', cutoffIso)
    .eq('property_snapshot->>_source', 'inactive')
    .not('tokko_property_id', 'is', null)
    .order('last_inquired_at', { ascending: false })
  if (LIMIT) q = q.limit(LIMIT)
  const { data: rows, error } = await q
  if (error) { console.error(error); process.exit(1) }
  log(`Target inquiries: ${rows?.length ?? 0}`)
  if (!rows || rows.length === 0) {
    log('Nothing to do.')
    return
  }

  const stats = { ok: 0, not_found: 0, auth_failed: 0, no_data: 0, error: 0, skipped: 0 }
  let i = 0
  for (const inq of rows) {
    i++
    const tokkoId = Number(inq.tokko_property_id)
    if (!Number.isFinite(tokkoId)) {
      log(`[${i}/${rows.length}] ${inq.id} SKIP invalid tokko_property_id ${inq.tokko_property_id}`)
      stats.skipped++
      continue
    }
    try {
      const resp = await fetchPropertyQuick(tokkoId, auth)
      const newSnapshot = buildSnapshotFromApi3(resp)
      if (!newSnapshot) {
        log(`[${i}/${rows.length}] ${inq.id} (tokko ${tokkoId}) NO_DATA`)
        stats.no_data++
        await delay()
        continue
      }
      const merged = {
        ...newSnapshot,
        tokko_id: inq.property_snapshot?.tokko_id ?? newSnapshot.tokko_id,
      }
      const summary = `geo=${merged.geo_lat != null}/${merged.geo_long != null} loc="${merged.location_name ?? ''}" type=${merged.property_type ?? '-'} price=${merged.price ?? '-'}`
      if (DRY_RUN) {
        log(`[${i}/${rows.length}] ${inq.id} (tokko ${tokkoId}) DRY_RUN ${summary}`)
        stats.ok++
      } else {
        const { error: upErr } = await supabase
          .from('inquiries')
          .update({ property_snapshot: merged })
          .eq('id', inq.id)
        if (upErr) {
          log(`[${i}/${rows.length}] ${inq.id} UPDATE error: ${upErr.message}`)
          stats.error++
        } else {
          log(`[${i}/${rows.length}] ${inq.id} (tokko ${tokkoId}) ✓ ${summary}`)
          stats.ok++
        }
      }
    } catch (err) {
      if (err.code === 'AUTH') {
        log(`[${i}/${rows.length}] ${inq.id} AUTH_FAILED (${err.status}). STOP. Renew session manually.`)
        stats.auth_failed++
        break
      } else if (err.code === 'NOT_FOUND') {
        log(`[${i}/${rows.length}] ${inq.id} (tokko ${tokkoId}) NOT_FOUND`)
        stats.not_found++
      } else {
        log(`[${i}/${rows.length}] ${inq.id} (tokko ${tokkoId}) ERROR: ${err.message}`)
        stats.error++
      }
    }
    await delay()
  }

  log('\n=== Backfill done ===')
  log(`OK:           ${stats.ok}`)
  log(`Not found:    ${stats.not_found}`)
  log(`Auth failed:  ${stats.auth_failed}`)
  log(`No data:      ${stats.no_data}`)
  log(`Error:        ${stats.error}`)
  log(`Skipped:      ${stats.skipped}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
