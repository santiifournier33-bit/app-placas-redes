// Captura v2: sin mitmdump (Cloudflare detectó el proxy en v1 → todo 403).
// Estrategia: Playwright + page.on('response') escribe directamente JSON candidatos.
// Filtra solo XHR/JSON con status 200 a www.zonaprop.com.ar.

import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.resolve(import.meta.dirname, 'output')
await fs.mkdir(OUT_DIR, { recursive: true })
const RESPONSES_FILE = path.join(OUT_DIR, 'zonaprop-responses.ndjson')
const LOG_FILE = path.join(OUT_DIR, 'capture-zonaprop-v2.log')
const POLYGON_DIR = path.join(OUT_DIR, 'polygons')
await fs.mkdir(POLYGON_DIR, { recursive: true })

const ZONAPROP_HOME = 'https://www.zonaprop.com.ar/'

const SEARCH_QUERIES = [
  'pilar',
  'villa rosa',
  'manzanares',
  'los mirasoles',
  'del viso',
  'fatima',
  'tortuguitas',
]

const SUGGESTION_PICKS = [
  'Los Mirasoles',
  'Villa Rosa',
  'Manzanares',
  'Pilar',
]

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`
  console.log(line)
  fs.appendFile(LOG_FILE, line + '\n').catch(() => {})
}

async function humanPause(min = 1500, max = 3000) {
  await sleep(min + Math.random() * (max - min))
}

await fs.writeFile(RESPONSES_FILE, '')

async function main() {
  log('=== Reverse engineering Zonaprop v2 (sin proxy) ===')
  log('Responses ndjson:', RESPONSES_FILE)

  const browser = await chromium.launch({
    headless: false,
    slowMo: 150,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    Object.defineProperty(navigator, 'languages', { get: () => ['es-AR', 'es', 'en'] })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
  })

  const page = await context.newPage()

  page.on('response', async (response) => {
    try {
      const url = response.url()
      const status = response.status()
      const host = new URL(url).host
      if (host !== 'www.zonaprop.com.ar') return
      const ct = (response.headers()['content-type'] || '').toLowerCase()
      const path_ = new URL(url).pathname
      if (
        path_.endsWith('.js') || path_.endsWith('.css') || path_.endsWith('.png') ||
        path_.endsWith('.jpg') || path_.endsWith('.jpeg') || path_.endsWith('.gif') ||
        path_.endsWith('.svg') || path_.endsWith('.webp') || path_.endsWith('.woff') ||
        path_.endsWith('.woff2') || path_.endsWith('.ico') || path_.includes('/cdn-cgi/')
      ) return
      if (ct.includes('text/html') && !path_.includes('-api/')) return

      let body = ''
      try { body = await response.text() } catch (_) { body = '' }
      const entry = {
        ts: new Date().toISOString(),
        method: response.request().method(),
        url,
        status,
        content_type: ct,
        body_len: body.length,
        body: body.slice(0, 30000),
      }
      await fs.appendFile(RESPONSES_FILE, JSON.stringify(entry) + '\n')

      // Si parece autocomplete con suggestions → log un sample
      if (path_.includes('/suggestLocation') && status === 200 && body.length > 100) {
        log(`  ✓ AUTOCOMPLETE: ${url.slice(-120)} (${body.length} chars)`)
      }
      // Si parece polígono / mapa
      const bodyLower = body.toLowerCase()
      if (status === 200 && (bodyLower.includes('"polygon"') || bodyLower.includes('"coordinates"') || bodyLower.includes('"geometry"'))) {
        log(`  ✓ POLYGON CANDIDATE: ${url}`)
        const safeName = path_.replace(/[\/?&=]/g, '_').slice(0, 100)
        await fs.writeFile(path.join(POLYGON_DIR, `${Date.now()}-${safeName}.json`), body).catch(() => {})
      }
    } catch (err) {
      log('response handler err:', err.message)
    }
  })

  try {
    log('Goto', ZONAPROP_HOME)
    await page.goto(ZONAPROP_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await sleep(3000)

    const cookieBtn = page.locator('#onetrust-accept-btn-handler, button:has-text("Aceptar"), button:has-text("Acepto")').first()
    if (await cookieBtn.count() > 0 && await cookieBtn.isVisible().catch(() => false)) {
      await cookieBtn.click({ timeout: 3000 }).catch(() => null)
      log('Cookie banner cerrado')
      await sleep(1000)
    }

    // Localizar input búsqueda
    const inputSelectors = [
      'input[placeholder*="Ubicaci" i]',
      'input[placeholder*="Buscar" i]',
      'input[role="combobox"]',
      'input[type="search"]',
      'input[name="search"]',
    ]
    let searchInput = null
    for (const sel of inputSelectors) {
      const loc = page.locator(sel).first()
      if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
        searchInput = loc
        log('Input encontrado:', sel)
        break
      }
    }
    if (!searchInput) throw new Error('Input búsqueda no encontrado')

    // Tipear queries lentamente (dispara autocomplete XHR)
    for (const q of SEARCH_QUERIES) {
      log(`Query: "${q}"`)
      await searchInput.click({ timeout: 5000 }).catch(() => null)
      // Limpiar field
      await page.keyboard.press('Control+A').catch(() => null)
      await page.keyboard.press('Delete').catch(() => null)
      await searchInput.type(q, { delay: 120 })
      await sleep(2500)
      await humanPause()
    }

    // Para capturar polígono: tipear query → esperar dropdown → click sugerencia con keyboard
    for (const pick of SUGGESTION_PICKS) {
      log(`Pick: "${pick}"`)
      await searchInput.click({ timeout: 5000 }).catch(() => null)
      await page.keyboard.press('Control+A').catch(() => null)
      await page.keyboard.press('Delete').catch(() => null)
      await searchInput.type(pick.split(' ')[0] + ' ' + (pick.split(' ')[1] || ''), { delay: 120 })
      await sleep(2500)
      // Bajar al primer suggestion + Enter
      await page.keyboard.press('ArrowDown')
      await sleep(500)
      await page.keyboard.press('Enter')
      log(`  Enter pressed`)
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => null)
      await sleep(4000)
      log(`  Post-pick URL: ${page.url()}`)

      // Buscar botón "Mapa" o "Ver en mapa" en la página de resultados
      const mapBtnSelectors = [
        'button:has-text("Mapa")',
        'a:has-text("Mapa")',
        'button[aria-label*="mapa" i]',
        '[data-qa*="map" i]',
        '[data-qa*="mapa" i]',
      ]
      for (const sel of mapBtnSelectors) {
        const loc = page.locator(sel).first()
        if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
          await loc.click({ timeout: 5000 }).catch(() => null)
          log(`  Map button click: ${sel}`)
          await sleep(5000)
          break
        }
      }
      await page.screenshot({ path: path.join(OUT_DIR, `v2-result-${pick.replace(/\s+/g, '-')}.png`) }).catch(() => null)
      await humanPause()
      // Volver a home antes de la próxima
      await page.goto(ZONAPROP_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null)
      await sleep(2500)
      // Re-localizar input (puede cambiar de instancia)
      searchInput = null
      for (const sel of inputSelectors) {
        const loc = page.locator(sel).first()
        if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
          searchInput = loc
          break
        }
      }
      if (!searchInput) {
        log('Input perdido tras volver a home, saliendo loop pick')
        break
      }
    }

    log('Navegación completada')
  } catch (err) {
    log('ERROR:', err.message)
    await page.screenshot({ path: path.join(OUT_DIR, 'v2-error.png') }).catch(() => null)
  } finally {
    log('Cerrando browser')
    await context.close().catch(() => null)
    await browser.close().catch(() => null)
    log('Done')
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
