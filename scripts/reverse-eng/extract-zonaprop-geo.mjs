// Extrae geoLocation (polígono) + mapPostings de una página -map.html de Zonaprop.
// Uso:
//   node scripts/reverse-eng/extract-zonaprop-geo.mjs <URL>
//   node scripts/reverse-eng/extract-zonaprop-geo.mjs https://www.zonaprop.com.ar/casas-venta-la-casualidad-pilar-pilar-map.html

import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'

/** Fetch via curl (Node undici TLS fingerprint is blocked by Cloudflare for /rplis-api/* and listing HTML). */
export async function fetchZonapropHtml(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '-s',
      '-L', // follow redirects — Zonaprop 301s to canonical slug variant
      '--max-redirs', '3',
      '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      '-H', 'Accept-Language: es-AR,es;q=0.9,en;q=0.8',
      '-H', 'Accept-Encoding: gzip',
      '--compressed',
      '-w', '\n__HTTP_STATUS__:%{http_code}',
      url,
    ]
    const proc = spawn('curl', args)
    let out = ''
    let err = ''
    proc.stdout.on('data', d => { out += d.toString('utf-8') })
    proc.stderr.on('data', d => { err += d.toString('utf-8') })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`curl exit ${code}: ${err}`))
      const m = out.match(/\n__HTTP_STATUS__:(\d+)\s*$/)
      if (!m) return reject(new Error('No status code in curl output'))
      const status = parseInt(m[1], 10)
      const body = out.slice(0, m.index)
      if (status >= 400) return reject(new Error(`HTTP ${status} on ${url}`))
      resolve(body)
    })
  })
}

/**
 * Extrae el JSON asignado a window.__PRELOADED_STATE__ usando brace balancing.
 * El JSON puede tener strings con `;` o `}` que no deben confundir el parser.
 */
export function extractPreloadedState(html) {
  const marker = 'window.__PRELOADED_STATE__'
  const start = html.indexOf(marker)
  if (start < 0) throw new Error('No __PRELOADED_STATE__ marker found')

  // Avanzar hasta la primera `{` después del `=`
  let i = html.indexOf('{', start)
  if (i < 0) throw new Error('No opening brace after marker')

  let depth = 0
  let inString = false
  let escape = false
  const startIdx = i
  for (; i < html.length; i++) {
    const ch = html[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        const jsonStr = html.slice(startIdx, i + 1)
        return JSON.parse(jsonStr)
      }
    }
  }
  throw new Error('Unbalanced braces in __PRELOADED_STATE__')
}

export function extractGeoLocation(state) {
  const geo = state?.listStore?.geoLocation
  if (!geo) return null
  return {
    id: geo.id,
    nombre: geo.nombre,
    cenLAT: geo.cenLAT,
    cenLON: geo.cenLON,
    geometry: geo.geometry,
    idpais: geo.idpais,
    idprovincia: geo.idprovincia,
    idciudad: geo.idciudad,
    idzonaciudad: geo.idzonaciudad,
    idsubzonaciudad: geo.idsubzonaciudad,
    tipoN: geo.tipoN,
  }
}

export function extractMapPostings(state) {
  const list = state?.listStore?.mapPostings
  if (!Array.isArray(list)) return []
  return list.map(p => ({
    postingId: p.postingId,
    title: p.title,
    price: p.price?.prices?.[0] ?? null,
    operationType: p.price?.operationType?.name ?? null,
    lat: p.geolocation?.geolocation?.latitude ?? null,
    lng: p.geolocation?.geolocation?.longitude ?? null,
    premier: p.premier ?? false,
  }))
}

/** Convierte URL listado normal a su variante -map.html */
export function toMapUrl(url) {
  if (url.endsWith('-map.html')) return url
  return url.replace(/\.html$/, '-map.html')
}

/** Extrae interlinks de barrios desde headerLinks de una página de partido. */
export function extractBarrioInterlinks(state) {
  const links = state?.listStore?.headerLinks ?? []
  const out = []
  for (const block of links) {
    if (block.title !== 'Comprar') continue
    for (const cat of block.categories ?? []) {
      if (cat.title !== 'Ubicación') continue
      for (const link of cat.links ?? []) {
        if (link?.url) out.push({ wording: link.wording, url: link.url })
      }
    }
  }
  return out
}

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error('Uso: node extract-zonaprop-geo.mjs <URL>')
    process.exit(1)
  }
  console.error(`Fetching ${url}`)
  const html = await fetchZonapropHtml(url)
  console.error(`HTML ${html.length} chars`)
  const state = extractPreloadedState(html)
  const geo = extractGeoLocation(state)
  const postings = extractMapPostings(state)
  const interlinks = extractBarrioInterlinks(state)

  const result = {
    source_url: url,
    fetched_at: new Date().toISOString(),
    geoLocation: geo,
    mapPostings_count: postings.length,
    mapPostings: postings,
    barrio_interlinks_count: interlinks.length,
    barrio_interlinks: interlinks,
  }
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('extract-zonaprop-geo.mjs')) {
  main().catch(err => {
    console.error('FATAL:', err.message)
    process.exit(1)
  })
}
