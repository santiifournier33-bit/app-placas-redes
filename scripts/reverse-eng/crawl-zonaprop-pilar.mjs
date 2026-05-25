// Crawl BFS de Zonaprop empezando por una página seed (ej partido de Pilar).
// Por cada URL visitada:
//   - Fetch HTML (via curl wrapper para pasar Cloudflare).
//   - Extract __PRELOADED_STATE__ → geoLocation (si tiene).
//   - Extract headerLinks → encolar URLs nuevas no visitadas.
//   - Append result a output/zonaprop-locations.jsonl.
// Rate limit: 1 req/seg + jitter.
//
// Uso:
//   node scripts/reverse-eng/crawl-zonaprop-pilar.mjs
//   node scripts/reverse-eng/crawl-zonaprop-pilar.mjs --seed=/casas-venta-pilar-pilar.html --max=300

import fs from 'node:fs/promises'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  fetchZonapropHtml,
  extractPreloadedState,
  extractGeoLocation,
  extractMapPostings,
  extractBarrioInterlinks,
  toMapUrl,
} from './extract-zonaprop-geo.mjs'

const ORIGIN = 'https://www.zonaprop.com.ar'
const OUT_DIR = path.resolve(import.meta.dirname, 'output')
await fs.mkdir(OUT_DIR, { recursive: true })
const OUT_FILE = path.join(OUT_DIR, 'zonaprop-locations.jsonl')
const LOG_FILE = path.join(OUT_DIR, 'crawl-zonaprop.log')
const VISITED_FILE = path.join(OUT_DIR, 'crawl-visited.json')

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace(/^--/, '').split('='))
)
const SEED = args.seed || '/casas-venta-pilar-pilar.html'
const MAX = parseInt(args.max || '300', 10)
const DELAY_MIN = 800
const DELAY_MAX = 1500

function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`
  console.error(line)
  fs.appendFile(LOG_FILE, line + '\n').catch(() => {})
}

function normalizeUrl(href) {
  if (href.startsWith('http')) return href
  if (href.startsWith('/')) return ORIGIN + href
  return null
}

async function processOne(url, attempt = 1) {
  try {
    const html = await fetchZonapropHtml(url)
    const state = extractPreloadedState(html)
    const geo = extractGeoLocation(state)
    const postings = extractMapPostings(state)
    const interlinks = extractBarrioInterlinks(state)
    return { ok: true, geo, postings_count: postings.length, postings, interlinks }
  } catch (err) {
    if (attempt < 2) {
      log(`  retry ${url} (${err.message})`)
      await sleep(3000)
      return processOne(url, attempt + 1)
    }
    return { ok: false, error: err.message }
  }
}

async function main() {
  log('=== Crawl Zonaprop Pilar ===')
  log(`Seed: ${SEED}, max: ${MAX}`)

  await fs.writeFile(OUT_FILE, '')

  const queue = [normalizeUrl(SEED)]
  const visited = new Set()
  let count = 0
  let geoFound = 0

  while (queue.length > 0 && count < MAX) {
    const url = queue.shift()
    if (!url) continue
    if (visited.has(url)) continue
    visited.add(url)
    count++

    // Convertir a -map.html (geoLocation está en ambos pero map.html es más liviano para markers también)
    const mapUrl = toMapUrl(url)
    log(`[${count}/${MAX}] ${mapUrl}`)
    const result = await processOne(mapUrl)

    if (!result.ok) {
      log(`  ✗ FAIL: ${result.error}`)
      await fs.appendFile(OUT_FILE, JSON.stringify({ url: mapUrl, error: result.error, ts: new Date().toISOString() }) + '\n')
      await sleep(DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN))
      continue
    }

    if (result.geo) {
      geoFound++
      log(`  ✓ geoLocation: ${result.geo.id} "${result.geo.nombre}" tipoN=${result.geo.tipoN} (${result.postings_count} postings)`)
    } else {
      log(`  - no geoLocation`)
    }

    const entry = {
      url: mapUrl,
      ts: new Date().toISOString(),
      geo: result.geo,
      postings_count: result.postings_count,
      postings: result.postings,
      interlinks_count: result.interlinks.length,
    }
    await fs.appendFile(OUT_FILE, JSON.stringify(entry) + '\n')

    for (const link of result.interlinks) {
      const full = normalizeUrl(link.url)
      if (full && !visited.has(full)) {
        queue.push(full)
      }
    }

    // checkpoint visited each 20 iterations
    if (count % 20 === 0) {
      await fs.writeFile(VISITED_FILE, JSON.stringify([...visited], null, 2))
    }

    await sleep(DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN))
  }

  await fs.writeFile(VISITED_FILE, JSON.stringify([...visited], null, 2))
  log(`Done. Visited: ${count}, geoLocations found: ${geoFound}`)
  log(`Output: ${OUT_FILE}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
