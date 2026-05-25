// Sync de catálogo de ubicaciones (barrios, countries, localidades, partidos)
// desde Zonaprop hacia Supabase tabla `locations`.
//
// Estrategia:
//   1. BFS crawl desde una URL seed (default Pilar partido). Cubre N3 (partido) y N4 (localidades).
//   2. Best-effort N5 discovery via autocomplete + slug guess. Slug inconsistente → muchas fallarán, no problema.
//   3. Upsert via RPC `upsert_location_geojson` (maneja conversión GeoJSON → geography).
//   4. Final: RPC `resolve_locations_parents` linkea parent_id por nombre.
//
// Variables de entorno requeridas:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Uso:
//   node scripts/sync-zonaprop-locations.mjs
//   node scripts/sync-zonaprop-locations.mjs --seed=/casas-venta-pilar-pilar.html --rate=1500 --max=200

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  fetchZonapropHtml,
  extractPreloadedState,
  extractGeoLocation,
  extractBarrioInterlinks,
  toMapUrl,
} from './reverse-eng/extract-zonaprop-geo.mjs'

const ORIGIN = 'https://www.zonaprop.com.ar'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace(/^--/, '').split('='))
)
// Multi-seed: queue crawl starts from each of these. Covers Pilar + neighboring
// partidos so inquiries in those areas also get polygon coverage.
const DEFAULT_SEEDS = [
  '/casas-venta-pilar-pcia-bs-as.html',   // Pilar PARTIDO (N3) — distinct from Pilar localidad N4
  '/casas-venta-pilar-pilar.html',         // Pilar LOCALIDAD (N4) — already covered, but discovers siblings
  '/casas-venta-escobar-pcia-bs-as.html',  // Escobar partido (vecino al norte)
  '/casas-venta-tigre-pcia-bs-as.html',    // Tigre partido (vecino al este, Nordelta etc)
  '/casas-venta-exaltacion-de-la-cruz-pcia-bs-as.html', // vecino al oeste
]
const SEED = args.seed || null  // single-seed override; if null we use DEFAULT_SEEDS
const MAX = parseInt(args.max || '300', 10)
const RATE_MS = parseInt(args.rate || '1500', 10)
const JITTER_MS = parseInt(args.jitter || '500', 10)
const ENABLE_AUTOCOMPLETE = args['no-autocomplete'] !== 'true'

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

async function curlJson(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('curl', [
      '-s',
      '-A', UA,
      '-H', 'Accept: application/json, text/plain, */*',
      '-H', 'Accept-Language: es-AR,es;q=0.9,en;q=0.8',
      '-H', 'Accept-Encoding: gzip',
      '-H', `Referer: ${ORIGIN}/`,
      '-H', 'X-Requested-With: XMLHttpRequest',
      '--compressed',
      '-w', '\n__HTTP_STATUS__:%{http_code}',
      url,
    ])
    let out = ''
    proc.stdout.on('data', d => out += d.toString('utf-8'))
    proc.on('error', reject)
    proc.on('close', () => {
      const m = out.match(/\n__HTTP_STATUS__:(\d+)\s*$/)
      if (!m) return reject(new Error('No status in curl output'))
      const status = parseInt(m[1], 10)
      const body = out.slice(0, m.index)
      if (status !== 200) return reject(new Error(`HTTP ${status} on ${url}`))
      try { resolve(JSON.parse(body)) } catch (e) { reject(new Error(`Bad JSON: ${e.message}`)) }
    })
  })
}

function slugify(s) {
  return s
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function normalizeLevel(label, tipoN) {
  if (tipoN === 'N1') return 'pais'
  if (tipoN === 'N2') return 'provincia'
  if (tipoN === 'N3') return 'partido'
  if (tipoN === 'N4') return 'localidad'
  if (tipoN === 'N5') return label === 'zona' ? 'country' : 'barrio'
  if (label === 'departamento') return 'partido'
  if (label === 'barrio') return 'barrio'
  if (label === 'zona') return 'country'
  return 'unknown'
}

function ensureMultiPolygon(geom) {
  if (!geom) return null
  if (geom.type === 'MultiPolygon') return geom
  if (geom.type === 'Polygon') return { type: 'MultiPolygon', coordinates: [geom.coordinates] }
  return null
}

async function upsertGeo(geo, sourceUrl, autocompleteItem = null) {
  const mp = ensureMultiPolygon(geo.geometry)
  if (!mp) {
    log(`  ⚠️  no polygon for ${geo.id} (${geo.nombre})`)
    return false
  }
  const label = autocompleteItem?.label
  const level = normalizeLevel(label, geo.tipoN)

  // Parent from labelSuggest: penultimate segment (last is "GBA Norte" / region).
  const fullPath = autocompleteItem?.labelSuggest ?? geo.nombre
  const parts = fullPath.split(',').map(s => s.trim()).filter(Boolean)
  const trimmed = parts.slice(0, -1) // drop region
  const parentExternalName = trimmed.length >= 2 ? trimmed[trimmed.length - 1] : null

  const params = {
    p_external_id: geo.id,
    p_source: 'zonaprop',
    p_name: geo.nombre,
    p_level: level,
    p_tipo_n: geo.tipoN,
    p_full_path: fullPath,
    p_parent_external_id: parentExternalName, // name of parent (resolved later)
    p_centroid_lat: geo.cenLAT,
    p_centroid_lng: geo.cenLON,
    p_polygon_geojson: JSON.stringify(mp),
    p_zonaprop_idpais: geo.idpais ?? null,
    p_zonaprop_idprovincia: geo.idprovincia ?? null,
    p_zonaprop_idciudad: geo.idciudad ?? null,
    p_zonaprop_idzona: geo.idzonaciudad ?? null,
    p_zonaprop_idsubzona: geo.idsubzonaciudad ?? null,
    p_source_url: sourceUrl,
  }
  const { data, error } = await supabase.rpc('upsert_location_geojson', params)
  if (error) {
    log(`  ❌ upsert RPC error for ${geo.id}: ${error.message}`)
    return false
  }
  return true
}

async function processUrl(url) {
  try {
    const html = await fetchZonapropHtml(url)
    const state = extractPreloadedState(html)
    return {
      ok: true,
      geo: extractGeoLocation(state),
      interlinks: extractBarrioInterlinks(state),
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

async function phase1BfsCrawl() {
  log('--- Phase 1: BFS crawl from seeds ---')
  const seeds = SEED ? [SEED] : DEFAULT_SEEDS
  const queue = seeds.map(s => ORIGIN + s)
  log(`Seeds: ${seeds.join(', ')}`)
  const visited = new Set()
  let upsertedCount = 0
  let failCount = 0

  while (queue.length > 0 && visited.size < MAX) {
    const url = queue.shift()
    if (visited.has(url)) continue
    visited.add(url)

    const mapUrl = toMapUrl(url)
    log(`[${visited.size}/${MAX}] ${mapUrl}`)
    const result = await processUrl(mapUrl)

    if (!result.ok) {
      log(`  ✗ ${result.error}`)
      failCount++
      await delay()
      continue
    }

    if (result.geo) {
      log(`  ✓ ${result.geo.id} "${result.geo.nombre}" tipoN=${result.geo.tipoN}`)
      const ok = await upsertGeo(result.geo, mapUrl)
      if (ok) upsertedCount++
    } else {
      log(`  - no geoLocation`)
    }

    for (const link of result.interlinks) {
      const full = link.url.startsWith('http') ? link.url : ORIGIN + link.url
      if (!visited.has(full)) queue.push(full)
    }
    await delay()
  }
  log(`Phase 1 done. Visited: ${visited.size}, upserted: ${upsertedCount}, failed: ${failCount}`)
  return { visited, upsertedCount, failCount }
}

async function phase2AutocompleteN5() {
  log('--- Phase 2: N5 discovery via autocomplete + slug guess ---')

  // Queries targeted at barrios cerrados in Pilar zone.
  const queries = [
    'pilar barrio', 'pilar country', 'pilar privado', 'pilar cerrado', 'pilar club',
    'villa rosa barrio', 'manzanares barrio', 'del viso barrio',
    'fatima pilar', 'tortuguitas barrio',
    'la lonja barrio', 'manuel alberti barrio',
    'martindale', 'pacheco golf', 'estancia',
    'los mirasoles', 'la casualidad', 'el aljibe', 'la candida',
    'nordelta', 'altos del sol', 'tortugas',
  ]

  const seenIds = new Set()
  const candidates = []

  for (const q of queries) {
    const url = `${ORIGIN}/rplis-api/locations/suggestLocation?location_name=${encodeURIComponent(q)}&country_id=1&limit=10&suggestion_type=SEARCHABLE&selected=`
    try {
      const results = await curlJson(url)
      const arr = Array.isArray(results) ? results : []
      for (const item of arr) {
        if (!item?.id || seenIds.has(item.id)) continue
        seenIds.add(item.id)
        candidates.push(item)
      }
      log(`  query "${q}" → ${arr.length} results (${seenIds.size} unique so far)`)
    } catch (err) {
      log(`  query "${q}" FAILED: ${err.message}`)
    }
    await delay()
  }

  log(`Discovery: ${candidates.length} unique candidates`)

  // Try slug variants for each candidate.
  let upsertedCount = 0
  let failCount = 0
  let i = 0
  for (const item of candidates) {
    i++
    const parts = item.labelSuggest.split(',').map(s => s.trim()).filter(Boolean)
    const trimmed = parts.slice(0, -1) // drop region
    const segs = trimmed.map(slugify)

    // Generate URL slug variants to try. Zonaprop has 6+ inconsistent patterns:
    //   1) {name} alone                          → /casas-venta-{name}.html
    //   2) {name}-{partido}                      → /casas-venta-{name}-{partido}.html
    //   3) {name}-{partido}-{partido}            → /casas-venta-{name}-{partido}-{partido}.html (duplicated)
    //   4) {name}-{localidad}-{partido}          → standard 3-segment
    //   5) {partido}-{name}                      → /casas-venta-{partido}-{name}.html (partido FIRST)
    //   6) {partido}-{localidad}-{name}          → partido first, all 3 levels
    //   7) {localidad}-{name}                    → uncommon
    const variants = new Set()
    if (segs.length === 1) {
      const n = segs[0]
      variants.add(n)
      variants.add(`${n}-${n}`)
    } else if (segs.length === 2) {
      const [name, partido] = segs
      variants.add(`${name}-${partido}-${partido}`)
      variants.add(`${name}-${partido}`)
      variants.add(name)
      variants.add(`${partido}-${name}`)
    } else {
      const name = segs[0]
      const localidad = segs[1]
      const partido = segs[segs.length - 1]
      variants.add(segs.join('-'))                          // name-localidad-partido
      variants.add(`${name}-${partido}-${partido}`)          // name-partido-partido (skip localidad)
      variants.add(`${name}-${partido}`)                     // name-partido
      variants.add(`${partido}-${name}`)                     // partido-name (REVERSED)
      variants.add(`${partido}-${localidad}-${name}`)        // partido-localidad-name
      variants.add(`${localidad}-${name}`)                   // localidad-name
      variants.add(name)                                     // name alone
    }

    log(`[N5 ${i}/${candidates.length}] ${item.id} "${item.name}" — trying ${variants.size} slugs`)
    let found = false
    for (const slug of variants) {
      const url = `${ORIGIN}/casas-venta-${slug}-map.html`
      const result = await processUrl(url)
      if (result.ok && result.geo && result.geo.id === item.id) {
        log(`  ✓ matched at slug "${slug}"`)
        const ok = await upsertGeo(result.geo, url, item)
        if (ok) upsertedCount++
        found = true
        break
      }
      await delay()
    }
    if (!found) {
      log(`  ✗ no slug variant matched`)
      failCount++
    }
  }
  log(`Phase 2 done. Upserted: ${upsertedCount}, failed: ${failCount}`)
  return { upsertedCount, failCount }
}

async function main() {
  log('=== Zonaprop locations sync ===')
  log(`Seed: ${SEED}, max: ${MAX}, rate: ${RATE_MS}ms + jitter ${JITTER_MS}ms`)
  log(`Supabase: ${SUPABASE_URL}`)

  const phase1 = await phase1BfsCrawl()

  let phase2 = { upsertedCount: 0, failCount: 0 }
  if (ENABLE_AUTOCOMPLETE) {
    phase2 = await phase2AutocompleteN5()
  } else {
    log('--- Phase 2: SKIPPED (--no-autocomplete=true) ---')
  }

  log('--- Phase 3: Resolve parent links ---')
  const { data: resolved, error: rErr } = await supabase.rpc('resolve_locations_parents')
  if (rErr) log(`  parent linking error: ${rErr.message}`)
  else log(`  parent links resolved: ${resolved} rows updated`)

  log('=== Sync complete ===')
  log(`Total upserted: ${phase1.upsertedCount + phase2.upsertedCount}`)
  log(`Total failed: ${phase1.failCount + phase2.failCount}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
