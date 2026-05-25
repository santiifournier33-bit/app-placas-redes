// Captura tráfico del buscador de Zonaprop para identificar:
//   - Endpoint autocomplete de "Ubicaciones" (catálogo de barrios/countries).
//   - Endpoint que entrega polígonos cuando se selecciona un barrio en el mapa.
// Pipeline:
//   1. mitmdump en 127.0.0.1:8080 → output/zonaprop.flow
//   2. Playwright Chromium con proxy + ignoreHTTPSErrors
//   3. Tipear queries en el input de búsqueda para disparar XHRs de autocomplete.
//   4. Click en una sugerencia → carga resultados + mapa con polígono.
//   5. Repetir con varios barrios de Pilar / Villa Rosa.
//   6. mitmproxy2swagger sobre el flow para generar un OpenAPI inicial.

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT_DIR = path.resolve(import.meta.dirname, 'output')
await fs.mkdir(OUT_DIR, { recursive: true })
const FLOW_FILE = path.join(OUT_DIR, 'zonaprop.flow')
const SCHEMA_FILE = path.join(OUT_DIR, 'zonaprop-internal.yaml')
const LOG_FILE = path.join(OUT_DIR, 'capture-zonaprop.log')

const ZONAPROP_HOME = 'https://www.zonaprop.com.ar/'
const PROXY_PORT = 8080
const HUMAN_DELAY_MIN = 1500
const HUMAN_DELAY_MAX = 3500

const SEARCH_QUERIES = [
  'pilar barrio',
  'villa rosa',
  'manzanares',
  'los mirasoles',
  'del viso',
  'tortuguitas',
  'fatima pilar',
]

const SUGGESTIONS_TO_CLICK = [
  'Barrio Cerrado Villa Rosa',
  'Los Mirasoles',
  'Manzanares',
  'La Lonja',
]

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`
  console.log(line)
  fs.appendFile(LOG_FILE, line + '\n').catch(() => {})
}

async function humanPause() {
  const ms = HUMAN_DELAY_MIN + Math.random() * (HUMAN_DELAY_MAX - HUMAN_DELAY_MIN)
  await sleep(ms)
}

async function main() {
  log('=== Reverse engineering Zonaprop buscador ===')
  log('Flow file:', FLOW_FILE)
  log('Schema file:', SCHEMA_FILE)

  log('Lanzando mitmdump en puerto', PROXY_PORT)
  const mitm = spawn('mitmdump', [
    '-w', FLOW_FILE,
    '--listen-host', '127.0.0.1',
    '--listen-port', String(PROXY_PORT),
    '--set', 'console_eventlog_verbosity=warn',
    '--set', 'flow_detail=0',
    '--ssl-insecure',
  ], { shell: true })

  mitm.stdout.on('data', d => log('[mitm]', d.toString().trim()))
  mitm.stderr.on('data', d => log('[mitm ERR]', d.toString().trim()))
  mitm.on('error', err => log('[mitm spawn error]', err.message))

  await sleep(4000)
  log('mitmdump ready, lanzando Chromium')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200,
    proxy: { server: `http://127.0.0.1:${PROXY_PORT}` },
    args: ['--ignore-certificate-errors'],
  })
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    locale: 'es-AR',
  })
  const page = await context.newPage()

  try {
    log('Navegando a Zonaprop home:', ZONAPROP_HOME)
    await page.goto(ZONAPROP_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null)
    await humanPause()

    const cookieSelectors = [
      'button:has-text("Aceptar")',
      'button:has-text("Acepto")',
      'button:has-text("Entendido")',
      '#onetrust-accept-btn-handler',
      'button[aria-label*="cept" i]',
    ]
    for (const sel of cookieSelectors) {
      const loc = page.locator(sel).first()
      if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
        await loc.click({ timeout: 3000 }).catch(() => null)
        log('Cookie banner cerrado:', sel)
        await sleep(800)
        break
      }
    }

    const searchInputSelectors = [
      'input[placeholder*="Buscar" i]',
      'input[placeholder*="Ubicaci" i]',
      'input[name="search"]',
      'input[name="ubicacion"]',
      'input[type="search"]',
      'input[role="combobox"]',
    ]
    let searchInput = null
    for (const sel of searchInputSelectors) {
      const loc = page.locator(sel).first()
      if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
        searchInput = loc
        log('Search input encontrado:', sel)
        break
      }
    }
    if (!searchInput) throw new Error('No se encontró el input de búsqueda')

    for (const query of SEARCH_QUERIES) {
      log(`Query: "${query}"`)
      await searchInput.click({ timeout: 5000 }).catch(() => null)
      await searchInput.fill('').catch(() => null)
      await searchInput.type(query, { delay: 110 })
      // Esperar XHR de autocomplete
      await sleep(2500)
      await page.screenshot({
        path: path.join(OUT_DIR, `autocomplete-${query.replace(/\s+/g, '-')}.png`),
      }).catch(() => null)
      await humanPause()
    }

    for (const label of SUGGESTIONS_TO_CLICK) {
      log(`Probando seleccionar sugerencia: "${label}"`)
      await searchInput.click({ timeout: 5000 }).catch(() => null)
      await searchInput.fill('').catch(() => null)
      await searchInput.type(label.split(' ').slice(0, 2).join(' '), { delay: 110 })
      await sleep(2200)

      const suggestionSelectors = [
        `[role="option"]:has-text("${label}")`,
        `li:has-text("${label}")`,
        `a:has-text("${label}")`,
        `[data-qa*="suggestion"]:has-text("${label}")`,
      ]
      let clicked = false
      for (const sel of suggestionSelectors) {
        const loc = page.locator(sel).first()
        if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
          await loc.click({ timeout: 5000 }).catch(() => null)
          clicked = true
          log(`Click sugerencia: ${sel}`)
          break
        }
      }
      if (!clicked) {
        log(`Sin sugerencia visible para "${label}", apretando Enter`)
        await page.keyboard.press('Enter')
      }
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => null)
      await humanPause()

      const mapSelectors = [
        'button:has-text("Mapa")',
        'a:has-text("Mapa")',
        '[data-qa*="map" i]',
        '[aria-label*="mapa" i]',
      ]
      for (const sel of mapSelectors) {
        const loc = page.locator(sel).first()
        if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
          await loc.click({ timeout: 5000 }).catch(() => null)
          log(`Vista mapa abierta: ${sel}`)
          await sleep(3500)
          break
        }
      }

      await page.screenshot({
        path: path.join(OUT_DIR, `result-${label.replace(/\s+/g, '-')}.png`),
        fullPage: false,
      }).catch(() => null)
      await humanPause()
      await page.goto(ZONAPROP_HOME, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null)
      await humanPause()
      searchInput = null
      for (const sel of searchInputSelectors) {
        const loc = page.locator(sel).first()
        if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
          searchInput = loc
          break
        }
      }
      if (!searchInput) {
        log('Input no reencontrado tras volver a home, saliendo del loop')
        break
      }
    }

    log('Navegación completada')
  } catch (err) {
    log('ERROR navegación:', err.message)
    await page.screenshot({ path: path.join(OUT_DIR, 'error-screenshot-zonaprop.png') }).catch(() => null)
  } finally {
    log('Cerrando browser')
    await context.close().catch(() => null)
    await browser.close().catch(() => null)

    log('Deteniendo mitmdump')
    mitm.kill('SIGINT')
    await sleep(2000)
    mitm.kill('SIGKILL')

    log('Done capture')
  }

  log('=== mitmproxy2swagger ===')
  await new Promise((resolve) => {
    const proc = spawn('mitmproxy2swagger', [
      '-i', FLOW_FILE,
      '-o', SCHEMA_FILE,
      '-p', 'https://www.zonaprop.com.ar',
    ], { shell: true })
    proc.stdout.on('data', d => log('[m2s]', d.toString().trim()))
    proc.stderr.on('data', d => log('[m2s ERR]', d.toString().trim()))
    proc.on('close', resolve)
  })

  log('Schema base en:', SCHEMA_FILE)
  log('Siguiente paso: editar el YAML quitando `ignore:` de los paths sospechosos (autocomplete / map / locations / polygons),')
  log('luego correr: mitmproxy2swagger -i', FLOW_FILE, '-o', SCHEMA_FILE, '-p https://www.zonaprop.com.ar --examples --headers')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
