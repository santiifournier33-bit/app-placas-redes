// Backfill histórico completo de webcontacts desde Tokko panel.
// Pagina hasta agotar TODAS las consultas (new + assigned + deleted) y las upserta vía Supabase service role.
//
// Uso:
//   node scripts/tokko-panel-backfill.mjs [--buckets=new,assigned,deleted] [--max-pages=200]
//
// Sin --buckets corre los 3 buckets. Sin --max-pages usa 200 por bucket (max 4000 webcontacts).

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'
import { chromium } from 'playwright'
import { setTimeout as sleep } from 'node:timers/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') })

const TOKKO_API_KEY = process.env.TOKKO_API_KEY
const TOKKO_BASE = 'https://www.tokkobroker.com/api/v1'
const BRANCH_FILTER = '[0,28214]'
const STATUS_BY_BUCKET = { new: 'pending', assigned: 'assigned', deleted: 'archived' }

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? true]
}))
const BUCKETS = (args.buckets ?? 'new,assigned,deleted').split(',')
const MAX_PAGES = Number(args['max-pages'] ?? 200)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args)
}

function cookiesToHeader(cookies) {
  return cookies.filter(c => c.domain.includes('tokkobroker.com')).map(c => `${c.name}=${c.value}`).join('; ')
}

function parseDateDdmmyyyy(raw) {
  if (!raw) return null
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (!m) return null
  const [, dd, mm, yyyy, hh, min] = m
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh ?? 0), Number(min ?? 0)).toISOString()
}

function detectPortal(tags) {
  const lower = tags.map(t => t.toLowerCase())
  if (lower.includes('argenprop')) return 'argenprop'
  if (lower.includes('zonaprop')) return 'zonaprop'
  if (lower.includes('web')) return 'web'
  if (lower.includes('manual')) return 'manual'
  return 'tokko'
}

function parseHtml(html, bucket) {
  const $ = cheerio.load(html)
  const rows = []
  const seen = new Set()
  $('div[id^="webcontact_container_"]').each((_, el) => {
    const $el = $(el)
    const id = $el.attr('id') ?? ''
    const m = id.match(/webcontact_container_(\d+)/)
    if (!m) return
    const wcid = Number(m[1])
    if (seen.has(wcid)) return
    seen.add(wcid)
    const text = $el.text()
    const emailM = text.match(/Email:\s*([^\s<>]+@[^\s<>]+)/i)
    const phoneM = text.match(/Celular:\s*([0-9+\-\s()]+)/i)
    const onclickAttrs = []
    $el.find('[onclick]').each((_, e) => {
      const oc = $(e).attr('onclick')
      if (oc) onclickAttrs.push(oc)
    })
    let propId = null
    for (const oc of onclickAttrs) {
      const m = oc.match(/open_property_display\((\d+)\)/)
      if (m) { propId = Number(m[1]); break }
    }
    const tags = []
    $el.find('.webcontact_tag_list div').each((_, t) => {
      const txt = $(t).text().trim()
      if (txt) tags.push(txt)
    })
    rows.push({
      web_contact_id: wcid,
      contact_name: $el.find('.webcontact_name').first().text().trim(),
      contact_email: emailM ? emailM[1].trim() : null,
      contact_phone: phoneM ? phoneM[1].trim() : null,
      received_at_iso: parseDateDdmmyyyy($el.find('li[title]').first().attr('title')),
      property_tokko_id: propId,
      property_address: $el.find('.web_contact_lead_address').first().text().trim() || null,
      property_thumbnail: $el.find('img.web_contact_lead_img').first().attr('src') ?? null,
      agent_name: $el.find('.webcontact_property_address_box div').first().text().trim() || null,
      message: $el.find('.webcontact_msg').first().text().trim() || null,
      tags,
      source_portal: detectPortal(tags),
      bucket,
    })
  })
  return rows
}

function extractLastId(html) {
  const m = html.match(/get_more_webcontacts_\w+\((\d+)\)/)
  if (m) return Number(m[1])
  const ids = [...html.matchAll(/webcontact_container_(\d+)/g)].map(x => Number(x[1]))
  if (ids.length === 0) return null
  return Math.min(...ids)
}

function normalizeEmail(raw) {
  if (!raw) return null
  const t = raw.trim().toLowerCase()
  return t.includes('@') ? t : null
}

function normalizePhone(raw) {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 7) return null
  if (digits.length >= 11 && digits.startsWith('54')) {
    const rest = digits.slice(2)
    return rest.startsWith('9') ? `+54${rest}` : `+549${rest}`
  }
  if (digits.length === 10 || digits.length === 11) return `+549${digits}`
  return `+${digits}`
}

const propertyCache = new Map()

async function fetchProperty(tokkoId) {
  if (propertyCache.has(tokkoId)) return propertyCache.get(tokkoId)
  let result
  const r = await fetch(`${TOKKO_BASE}/property/${tokkoId}/?key=${TOKKO_API_KEY}&format=json&lang=es_ar`)
  if (r.ok) result = { active: true, prop: await r.json() }
  else {
    const ri = await fetch(`${TOKKO_BASE}/inactiveproperty/${tokkoId}/?key=${TOKKO_API_KEY}&format=json`)
    if (ri.ok) result = { active: false, prop: await ri.json() }
    else result = { active: null, prop: null }
  }
  propertyCache.set(tokkoId, result)
  return result
}

function buildSnapshot(prop, fallback) {
  if (!prop) return { tokko_id: fallback.tokko_id ?? null, address: fallback.address, cover_photo_url: fallback.thumbnail, _source: 'unresolved' }
  if (prop.deleted_at && !prop.address) return { tokko_id: prop.id, address: fallback.address, cover_photo_url: fallback.thumbnail, deleted_at: prop.deleted_at, _source: 'inactive' }
  const op = prop.operations?.[0]
  const price = op?.prices?.[0]
  return {
    tokko_id: prop.id, reference_code: prop.reference_code, address: prop.address, publication_title: prop.publication_title,
    price: price?.price ?? null, currency: price?.currency ?? null,
    operation_type: op?.type ?? null, property_type: prop.type?.name ?? null,
    rooms_total: prop.room_amount ?? null, bedrooms: prop.suite_amount ?? null, bathrooms: prop.bathroom_amount ?? null,
    surface_total: prop.total_surface ? Number(prop.total_surface) : null, surface_covered: prop.roofed_surface ? Number(prop.roofed_surface) : null,
    geo_lat: prop.geo_lat ? Number(prop.geo_lat) : null, geo_long: prop.geo_long ? Number(prop.geo_long) : null,
    location_name: prop.location?.name ?? null, location_full: prop.location?.full_location ?? null,
    cover_photo_url: prop.photos?.[0]?.image ?? fallback.thumbnail, producer_email: prop.producer?.email ?? null, _source: 'active',
  }
}

async function loginAndGetCookies() {
  log('Logging in via Playwright headless...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  await page.goto(process.env.TOKKO_PANEL_LOGIN_URL || 'https://www.tokkobroker.com/go/', { waitUntil: 'networkidle', timeout: 60000 })
  for (const el of await page.locator('input[placeholder*="usuario" i], input[type=email]').all()) {
    if (await el.isVisible().catch(() => false)) { await el.click(); await el.fill(''); await el.type(process.env.TOKKO_PANEL_EMAIL, { delay: 80 }); break }
  }
  await sleep(500)
  for (const el of await page.locator('input[type=password]').all()) {
    if (await el.isVisible().catch(() => false)) { await el.click(); await el.fill(''); await el.type(process.env.TOKKO_PANEL_PASSWORD, { delay: 80 }); break }
  }
  await sleep(800)
  await page.keyboard.press('Enter')
  await page.waitForURL(/app\.tokkobroker\.com|\/home/, { timeout: 60000 }).catch(() => null)
  await sleep(3000)
  await page.goto('https://www.tokkobroker.com/marketing/webcontact/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(2000)
  const allCookies = await context.cookies()
  const tokkoCookies = allCookies.filter(c => c.domain.includes('tokkobroker.com'))
  await context.close().catch(() => null)
  await browser.close().catch(() => null)
  await supabase.from('tokko_panel_session').upsert({
    id: 'default', cookies: tokkoCookies,
    expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    last_renewed_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
  })
  log(`Login complete: ${tokkoCookies.length} cookies`)
  return cookiesToHeader(tokkoCookies)
}

async function main() {
  // Always fresh login at start of backfill
  let cookieHeader = await loginAndGetCookies()

  const { data: admin } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1).single()
  const adminId = admin.id

  const { data: profiles } = await supabase.from('profiles').select('id, email')
  const agentByEmail = new Map()
  for (const p of profiles ?? []) if (p.email) agentByEmail.set(p.email.toLowerCase(), p.id)

  const overallStats = {}

  for (const bucket of BUCKETS) {
    log(`\n=== BUCKET ${bucket} ===`)
    const bucketStats = { pages: 0, webcontacts: 0, inquiries_created: 0, inquiries_updated: 0, contacts_created: 0, skipped_no_contact: 0, skipped_no_property: 0, errors: 0 }

    let currentUrl = `https://www.tokkobroker.com/marketing/webcontact/${bucket}/?branches=${encodeURIComponent(BRANCH_FILTER)}`
    let lastId = null

    let reloginCount = 0
    for (let page = 0; page < MAX_PAGES; page++) {
      let r = await fetch(currentUrl, {
        headers: { Cookie: cookieHeader, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', Accept: 'text/html,application/xhtml+xml,*/*' },
        redirect: 'manual',
      })
      if ((r.status === 302 || r.status === 301) && reloginCount < 3) {
        reloginCount++
        log(`Session expired at page ${page}. Re-login attempt ${reloginCount}/3...`)
        cookieHeader = await loginAndGetCookies()
        await sleep(2000)
        r = await fetch(currentUrl, {
          headers: { Cookie: cookieHeader, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', Accept: 'text/html,application/xhtml+xml,*/*' },
          redirect: 'manual',
        })
      }
      if (r.status === 302 || r.status === 301) { log(`Still 302 after relogin. Aborting bucket.`); break }
      if (!r.ok) { log(`HTTP ${r.status} at page ${page}, stopping`); break }
      const html = await r.text()
      const rows = parseHtml(html, bucket)
      if (rows.length === 0) { log(`No rows at page ${page}, end of bucket`); break }
      bucketStats.pages++
      bucketStats.webcontacts += rows.length
      log(`Page ${page + 1}: ${rows.length} webcontacts (lastId start=${lastId ?? 'initial'})`)

      for (const row of rows) {
        const email = normalizeEmail(row.contact_email)
        const phone = normalizePhone(row.contact_phone)
        if (!email && !phone) { bucketStats.skipped_no_contact++; continue }
        if (!row.property_tokko_id) { bucketStats.skipped_no_property++; continue }

        const resolved = await fetchProperty(row.property_tokko_id)
        const propertyActive = resolved.active === null ? false : resolved.active
        const snapshot = buildSnapshot(resolved.prop, { tokko_id: row.property_tokko_id, address: row.property_address, thumbnail: row.property_thumbnail })

        let ownerId = null
        const producerEmail = snapshot.producer_email?.toLowerCase()
        if (producerEmail && agentByEmail.has(producerEmail)) ownerId = agentByEmail.get(producerEmail)
        if (!ownerId) ownerId = adminId

        let contactId = null
        if (email) {
          const { data } = await supabase.from('contact_emails').select('contact_id').eq('email', email).limit(1).maybeSingle()
          if (data) contactId = data.contact_id
        }
        if (!contactId && phone) {
          const { data } = await supabase.from('contact_phones').select('contact_id').eq('phone', phone).limit(1).maybeSingle()
          if (data) contactId = data.contact_id
        }

        if (!contactId) {
          const [first, ...rest] = (row.contact_name ?? '').trim().split(/\s+/)
          const sourceVal = row.source_portal === 'web' ? 'web' : (row.source_portal === 'argenprop' || row.source_portal === 'zonaprop') ? 'portal' : 'tokko'
          const { data: created, error } = await supabase.from('contacts').insert({
            first_name: first || 'Sin nombre', last_name: rest.join(' ') || null,
            primary_email: email, primary_phone: phone, owner_id: ownerId, source: sourceVal,
          }).select('id').single()
          if (error) { bucketStats.errors++; continue }
          contactId = created.id
          bucketStats.contacts_created++
        }

        if (email) await supabase.from('contact_emails').upsert({ contact_id: contactId, email, source: row.source_portal }, { onConflict: 'contact_id,email', ignoreDuplicates: true })
        if (phone) await supabase.from('contact_phones').upsert({ contact_id: contactId, phone, source: row.source_portal }, { onConflict: 'contact_id,phone', ignoreDuplicates: true })

        const baseData = {
          contact_id: contactId, tokko_property_id: String(row.property_tokko_id),
          tokko_property_reference: snapshot.reference_code ?? null,
          property_snapshot: snapshot, owner_id: ownerId,
          source: 'tokko_panel', source_portal: row.source_portal,
          status: STATUS_BY_BUCKET[bucket], comment: row.message, tags: row.tags,
          tokko_web_contact_id: row.web_contact_id, property_active: propertyActive,
          raw_payload: row,
        }

        const { data: byWcId } = await supabase.from('inquiries').select('id, first_inquired_at').eq('tokko_web_contact_id', row.web_contact_id).maybeSingle()
        if (byWcId) {
          const { error } = await supabase.from('inquiries').update({
            ...baseData,
            first_inquired_at: byWcId.first_inquired_at ?? row.received_at_iso ?? new Date().toISOString(),
            last_inquired_at: row.received_at_iso ?? new Date().toISOString(),
          }).eq('id', byWcId.id)
          if (error) bucketStats.errors++; else bucketStats.inquiries_updated++
          continue
        }
        const { data: byPair } = await supabase.from('inquiries').select('id, first_inquired_at, last_inquired_at').eq('contact_id', contactId).eq('tokko_property_id', String(row.property_tokko_id)).maybeSingle()
        if (byPair) {
          const newLast = row.received_at_iso ?? new Date().toISOString()
          const existingLast = byPair.last_inquired_at ?? newLast
          const { error } = await supabase.from('inquiries').update({
            ...baseData,
            first_inquired_at: byPair.first_inquired_at ?? newLast,
            last_inquired_at: newLast > existingLast ? newLast : existingLast,
          }).eq('id', byPair.id)
          if (error) bucketStats.errors++; else bucketStats.inquiries_updated++
          continue
        }
        const { error } = await supabase.from('inquiries').insert({
          ...baseData,
          first_inquired_at: row.received_at_iso ?? new Date().toISOString(),
          last_inquired_at: row.received_at_iso ?? new Date().toISOString(),
        })
        if (error) { bucketStats.errors++; console.error('insert err:', error.message) } else bucketStats.inquiries_created++
      }

      const newLastId = extractLastId(html)
      if (!newLastId || newLastId === lastId) { log('Cursor stable or null, end'); break }
      lastId = newLastId
      currentUrl = `https://www.tokkobroker.com/marketing/more_webcontact_${bucket}/?branches=${encodeURIComponent(BRANCH_FILTER)}&last_id=${lastId}`
    }
    overallStats[bucket] = bucketStats
    log(`Bucket ${bucket} done:`, JSON.stringify(bucketStats))
  }

  console.log('\n=== FINAL ===')
  console.log(JSON.stringify(overallStats, null, 2))
  console.log('Properties fetched (cached):', propertyCache.size)
}

main().catch(err => { console.error('FATAL:', err); process.exit(1) })
