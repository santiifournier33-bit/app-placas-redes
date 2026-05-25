// Tokko panel session renewal.
// Login via Playwright + save cookies to Supabase table tokko_panel_session.
// Run locally when Edge Function reports session expired, or via GitHub Action cron (weekly).
//
// Required env vars (in .env.local):
//   TOKKO_PANEL_LOGIN_URL=https://www.tokkobroker.com/go/
//   TOKKO_PANEL_EMAIL=...
//   TOKKO_PANEL_PASSWORD=...
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// Usage:
//   node scripts/tokko-panel-renew-session.mjs [--headed]
//   (default headless; --headed shows browser for debugging)

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { setTimeout as sleep } from 'node:timers/promises'

const HEADED = process.argv.includes('--headed')

const LOGIN_URL = process.env.TOKKO_PANEL_LOGIN_URL || 'https://www.tokkobroker.com/go/'
const EMAIL = process.env.TOKKO_PANEL_EMAIL
const PASSWORD = process.env.TOKKO_PANEL_PASSWORD
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!EMAIL || !PASSWORD) {
  console.error('Missing TOKKO_PANEL_EMAIL or TOKKO_PANEL_PASSWORD')
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args)
}

async function main() {
  log('Launching Chromium (headed=', HEADED, ')')
  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 200 : 0,
  })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    log('Navigating to', LOGIN_URL)
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 })

    // Fill email — visible input only
    const emailInputs = await page.locator('input[placeholder*="usuario" i], input[placeholder*="mail" i], input[type=email], input[autocomplete=username]').all()
    let emailFilled = false
    for (const el of emailInputs) {
      if (await el.isVisible().catch(() => false)) {
        await el.click()
        await el.fill('')
        await el.type(EMAIL, { delay: 80 })
        if ((await el.inputValue()) === EMAIL) {
          emailFilled = true
          log('Email filled')
          break
        }
      }
    }
    if (!emailFilled) throw new Error('Could not fill email')

    await sleep(500)

    // Fill password
    const passInputs = await page.locator('input[type=password]').all()
    let passFilled = false
    for (const el of passInputs) {
      if (await el.isVisible().catch(() => false)) {
        await el.click()
        await el.fill('')
        await el.type(PASSWORD, { delay: 80 })
        if ((await el.inputValue()) === PASSWORD) {
          passFilled = true
          log('Password filled')
          break
        }
      }
    }
    if (!passFilled) throw new Error('Could not fill password')

    await sleep(800)

    // Submit — Tokko form responds best to Enter on password field
    await page.keyboard.press('Enter')
    log('Submitted')

    // Wait for redirect to app.tokkobroker.com or homepage
    await page.waitForURL(/(app\.tokkobroker\.com|\/home)/, { timeout: 60000 }).catch(() => {
      log('Did not detect explicit redirect; checking current URL')
    })
    await sleep(3000)
    const finalUrl = page.url()
    log('Post-login URL:', finalUrl)
    if (finalUrl.includes('/go/') || finalUrl.includes('/login/')) {
      throw new Error('Still on login page after submit — credentials may be wrong')
    }

    // Visit the webcontact page to ensure session cookies for that path are set
    await page.goto('https://www.tokkobroker.com/marketing/webcontact/', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await sleep(2000)
    log('Webcontact page loaded:', page.url())

    // Visit app.tokkobroker.com to populate localStorage with the JWT used by /api3/* endpoints.
    // JWT is stored under localStorage[jwt] after the Next.js app initializes session.
    log('Navigating to app.tokkobroker.com/home to capture JWT...')
    await page.goto('https://app.tokkobroker.com/home', { waitUntil: 'domcontentloaded', timeout: 60000 })
    // App is Next.js SPA — wait for hydration + initial /api3/users/me call that triggers JWT issuance.
    await sleep(8000)

    // Read JWT from localStorage
    const jwt = await page.evaluate(() => {
      try {
        // eslint-disable-next-line no-undef
        return typeof localStorage !== 'undefined' ? localStorage.getItem('jwt') : null
      } catch { return null }
    })
    let jwtExpiresAt = null
    if (jwt) {
      try {
        const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf-8'))
        if (payload?.exp) jwtExpiresAt = new Date(payload.exp * 1000).toISOString()
        log('JWT captured. Expires:', jwtExpiresAt, 'uid:', payload?.uid, 'email:', payload?.email)
      } catch (e) {
        log('JWT decode failed:', e.message)
      }
    } else {
      log('WARNING: JWT not found in localStorage. /api3/* endpoints will fail. Check app.tokkobroker.com session.')
    }

    // Extract cookies for tokkobroker.com domains
    const allCookies = await context.cookies()
    const tokkoCookies = allCookies.filter(c => c.domain.includes('tokkobroker.com'))
    log('Captured', tokkoCookies.length, 'tokkobroker cookies')

    // Save to Supabase
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString() // assume 7 days
    const { error } = await supabase
      .from('tokko_panel_session')
      .upsert({
        id: 'default',
        cookies: tokkoCookies,
        expires_at: expiresAt,
        jwt,
        jwt_expires_at: jwtExpiresAt,
        last_renewed_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
    if (error) {
      console.error('Failed to save session:', error)
      process.exit(1)
    }
    log('Session saved to Supabase. Cookies expire:', expiresAt, '| JWT expires:', jwtExpiresAt)
  } catch (err) {
    console.error('FATAL:', err.message)
    await page.screenshot({ path: 'tokko-renew-error.png' }).catch(() => null)
    process.exit(1)
  } finally {
    await context.close().catch(() => null)
    await browser.close().catch(() => null)
  }
}

main()
