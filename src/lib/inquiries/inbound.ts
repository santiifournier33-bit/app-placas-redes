import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { fetchPanelAuth, fetchPropertyQuick, buildSnapshotFromApi3 } from '@/lib/tokko-panel/api3-client'

const TOKKO_API_KEY = process.env.TOKKO_API_KEY || '1dc0ef58a932195a5ae942f23063314ac8f34ffc'
const TOKKO_BASE = 'https://www.tokkobroker.com/api/v1'

export interface InboundPayload {
  source: 'tokko_panel' | 'freire-web-moderna' | 'whatsapp-intent' | 'zonaprop' | 'argenprop' | 'manual'
  source_portal?: 'argenprop' | 'zonaprop' | 'web' | 'tokko' | 'manual' | string
  contact: {
    name?: string
    email?: string
    phone?: string
  }
  property: {
    tokko_id?: number | string
    reference_code?: string
    url?: string
    fallback_title?: string
  }
  message?: string
  captured_at: string
  status?: 'pending' | 'assigned' | 'responded' | 'archived'
  tokko_web_contact_id?: number
  user_preferences?: Record<string, unknown>
  tags?: string[]
  agent_email?: string
  raw_payload?: Record<string, unknown>
}

export function verifyHmac(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null
  const t = raw.trim().toLowerCase()
  if (!t.includes('@')) return null
  return t
}

function normalizePhone(raw: string | null | undefined): string | null {
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

function extractTokkoIdFromUrl(url: string | undefined): number | null {
  if (!url) return null
  const m = url.match(/property\/(\d+)|\/p\/(\d+)/)
  if (!m) return null
  const id = m[1] || m[2]
  return id ? Number(id) : null
}

function extractTokkoIdFromRef(ref: string | undefined): number | null {
  if (!ref) return null
  const m = ref.match(/[A-Z]+(\d+)/)
  return m ? Number(m[1]) : null
}

/**
 * Fetch property from Tokko. Cascade:
 *   1. Public API /property/?reference_code=X (if ref provided).
 *   2. Public API /property/{id}/ (active).
 *   3. Public API /inactiveproperty/{id}/ (inactive — but returns only deleted_at + id).
 *   4. NEW: Panel /api3/property/{id}/quick (inactive con data completa).
 *
 * Returns `recoveredSnapshot` when path 4 succeeds — caller bypasses buildSnapshot
 * and uses the snapshot directly. Avoids losing geo/location data on inactive props.
 */
async function fetchTokkoProperty(refOrId: { tokko_id?: number; reference_code?: string }) {
  if (refOrId.reference_code) {
    const url = new URL(`${TOKKO_BASE}/property/`)
    url.searchParams.set('key', TOKKO_API_KEY)
    url.searchParams.set('format', 'json')
    url.searchParams.set('lang', 'es_ar')
    url.searchParams.set('reference_code', refOrId.reference_code)
    url.searchParams.set('limit', '1')
    const r = await fetch(url.toString())
    if (r.ok) {
      const d = await r.json()
      if (d?.objects?.[0]) return { active: true as const, prop: d.objects[0], recoveredSnapshot: null as null | Record<string, unknown> }
    }
  }
  if (refOrId.tokko_id) {
    const r = await fetch(`${TOKKO_BASE}/property/${refOrId.tokko_id}/?key=${TOKKO_API_KEY}&format=json&lang=es_ar`)
    if (r.ok) return { active: true as const, prop: await r.json(), recoveredSnapshot: null as null | Record<string, unknown> }
    // try inactive (public — returns minimal data)
    const ri = await fetch(`${TOKKO_BASE}/inactiveproperty/${refOrId.tokko_id}/?key=${TOKKO_API_KEY}&format=json`)
    if (ri.ok) {
      const inactiveProp = await ri.json()
      // Try panel /api3/ to recover full data (geo, location, type, etc.)
      let recoveredSnapshot: Record<string, unknown> | null = null
      try {
        const supabase = createServiceClient()
        const auth = await fetchPanelAuth(supabase)
        const panelResp = await fetchPropertyQuick(refOrId.tokko_id, auth)
        recoveredSnapshot = buildSnapshotFromApi3(panelResp)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn('[inbound] panel api3 fallback failed for inactive', refOrId.tokko_id, '-', msg)
      }
      return { active: false as const, prop: inactiveProp, recoveredSnapshot }
    }
  }
  return { active: null as null | boolean, prop: null, recoveredSnapshot: null as null | Record<string, unknown> }
}

function buildSnapshot(prop: any, fallback: { reference_code?: string; tokko_id?: number; fallback_title?: string }) {
  if (!prop) {
    return {
      tokko_id: fallback.tokko_id ?? null,
      reference_code: fallback.reference_code ?? null,
      fallback_title: fallback.fallback_title ?? null,
      _source: 'unresolved',
    }
  }
  if (prop.deleted_at && !prop.address) {
    return {
      tokko_id: prop.id,
      reference_code: fallback.reference_code ?? null,
      fallback_title: fallback.fallback_title ?? null,
      deleted_at: prop.deleted_at,
      _source: 'inactive',
    }
  }
  const op = prop.operations?.[0]
  const price = op?.prices?.[0]
  return {
    tokko_id: prop.id,
    reference_code: prop.reference_code,
    address: prop.address,
    publication_title: prop.publication_title,
    price: price?.price ?? null,
    currency: price?.currency ?? null,
    operation_type: op?.type ?? null,
    property_type: prop.type?.name ?? null,
    rooms_total: prop.room_amount ?? null,
    // Tokko field `suite_amount` actually means "dormitorios" (misleading name).
    // Fallback: rooms - 1 (asumiendo 1 ambiente social + resto dorm).
    bedrooms: prop.suite_amount ?? (prop.room_amount ? Math.max(prop.room_amount - 1, 0) : null),
    bathrooms: prop.bathroom_amount ?? null,
    surface_total: prop.total_surface ? Number(prop.total_surface) : null,
    surface_covered: prop.roofed_surface ? Number(prop.roofed_surface) : null,
    geo_lat: prop.geo_lat ? Number(prop.geo_lat) : null,
    geo_long: prop.geo_long ? Number(prop.geo_long) : null,
    location_name: prop.location?.name ?? null,
    location_full: prop.location?.full_location ?? null,
    cover_photo_url: prop.photos?.[0]?.image ?? null,
    producer_email: prop.producer?.email ?? null,
    _source: 'active',
  }
}

export async function processInbound(payload: InboundPayload): Promise<{
  ok: boolean
  inquiry_id?: string
  contact_id?: string
  action: 'created' | 'updated' | 'skipped'
  reason?: string
}> {
  const supabase = createServiceClient()

  // Resolve property
  const tokkoIdFromRef = extractTokkoIdFromRef(payload.property.reference_code)
  const tokkoIdFromUrl = extractTokkoIdFromUrl(payload.property.url)
  const tokkoId = Number(payload.property.tokko_id) || tokkoIdFromRef || tokkoIdFromUrl
  const refCode = payload.property.reference_code ||
    (tokkoId ? null : null) // will fill below if API returns

  if (!tokkoId && !refCode) {
    return { ok: false, action: 'skipped', reason: 'no_property_id_or_ref' }
  }

  const { active, prop, recoveredSnapshot } = await fetchTokkoProperty({
    tokko_id: tokkoId ?? undefined,
    reference_code: payload.property.reference_code,
  })

  const propertyActive = active === null ? false : active
  const finalTokkoId = prop?.id ?? tokkoId
  const finalRef = prop?.reference_code ?? payload.property.reference_code ?? null
  // If public API returned inactive but panel /api3/quick recovered the full data,
  // use that snapshot directly (preserves geo/location for matching).
  const snapshot = recoveredSnapshot ?? buildSnapshot(prop, {
    reference_code: finalRef ?? undefined,
    tokko_id: finalTokkoId ?? undefined,
    fallback_title: payload.property.fallback_title,
  })

  // Resolve contact: dedup by email or phone
  const email = normalizeEmail(payload.contact.email)
  const phone = normalizePhone(payload.contact.phone)
  if (!email && !phone) {
    return { ok: false, action: 'skipped', reason: 'no_contact_email_or_phone' }
  }

  // 1. Try match by contact_emails or contact_phones
  let contactId: string | null = null

  if (email) {
    const { data } = await supabase
      .from('contact_emails')
      .select('contact_id')
      .eq('email', email)
      .limit(1)
      .maybeSingle()
    if (data) contactId = data.contact_id
  }

  if (!contactId && phone) {
    const { data } = await supabase
      .from('contact_phones')
      .select('contact_id')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle()
    if (data) contactId = data.contact_id
  }

  // Resolve agent (owner) — prefer property producer, fallback admin
  let ownerId: string | null = null
  const producerEmail = (snapshot.producer_email as string | null)?.toLowerCase()
    || payload.agent_email?.toLowerCase()
  if (producerEmail) {
    const { data: ag } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', producerEmail)
      .maybeSingle()
    if (ag) ownerId = ag.id
  }
  if (!ownerId) {
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle()
    if (admin) ownerId = admin.id
  }

  // Create contact if not found
  if (!contactId) {
    if (!ownerId) return { ok: false, action: 'skipped', reason: 'no_owner_admin' }
    const [first, ...rest] = (payload.contact.name ?? '').trim().split(/\s+/)
    const { data: created, error: cErr } = await supabase
      .from('contacts')
      .insert({
        first_name: first || 'Sin nombre',
        last_name: rest.join(' ') || null,
        primary_email: email,
        primary_phone: phone,
        owner_id: ownerId,
        source: payload.source_portal === 'web' || payload.source === 'freire-web-moderna' ? 'web'
          : payload.source_portal === 'argenprop' || payload.source_portal === 'zonaprop' ? 'portal'
          : 'tokko',
      })
      .select('id')
      .single()
    if (cErr || !created) {
      return { ok: false, action: 'skipped', reason: `contact_create_failed: ${cErr?.message}` }
    }
    contactId = created.id
  }

  // Upsert emails/phones (idempotent)
  if (contactId && email) {
    await supabase.from('contact_emails').upsert(
      { contact_id: contactId, email, source: payload.source_portal ?? 'tokko' },
      { onConflict: 'contact_id,email', ignoreDuplicates: true },
    )
  }
  if (contactId && phone) {
    await supabase.from('contact_phones').upsert(
      { contact_id: contactId, phone, source: payload.source_portal ?? 'tokko' },
      { onConflict: 'contact_id,phone', ignoreDuplicates: true },
    )
  }

  // Upsert inquiry
  // Priority unique key: tokko_web_contact_id if present, else (contact_id, tokko_property_id)
  const inquiryData: any = {
    contact_id: contactId,
    tokko_property_id: String(finalTokkoId ?? ''),
    tokko_property_reference: finalRef,
    property_snapshot: snapshot,
    owner_id: ownerId,
    source: payload.source,
    source_portal: payload.source_portal ?? null,
    status: payload.status ?? 'pending',
    first_inquired_at: payload.captured_at,
    last_inquired_at: payload.captured_at,
    comment: payload.message ?? null,
    tags: payload.tags ?? null,
    raw_payload: payload.raw_payload ?? null,
    user_preferences: payload.user_preferences ?? null,
    tokko_web_contact_id: payload.tokko_web_contact_id ?? null,
    property_active: propertyActive,
  }

  if (payload.tokko_web_contact_id) {
    const { data: existing } = await supabase
      .from('inquiries')
      .select('id')
      .eq('tokko_web_contact_id', payload.tokko_web_contact_id)
      .maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('inquiries')
        .update({
          ...inquiryData,
          last_inquired_at: payload.captured_at,
        })
        .eq('id', existing.id)
      if (error) return { ok: false, action: 'skipped', reason: `update_failed: ${error.message}` }
      return { ok: true, inquiry_id: existing.id, contact_id: contactId, action: 'updated' }
    }
  }

  // Otherwise upsert by (contact_id, tokko_property_id)
  const { data: existing2 } = await supabase
    .from('inquiries')
    .select('id, first_inquired_at')
    .eq('contact_id', contactId)
    .eq('tokko_property_id', String(finalTokkoId ?? ''))
    .maybeSingle()

  if (existing2) {
    const { error } = await supabase
      .from('inquiries')
      .update({
        ...inquiryData,
        first_inquired_at: existing2.first_inquired_at, // preserve original
        last_inquired_at: payload.captured_at,
      })
      .eq('id', existing2.id)
    if (error) return { ok: false, action: 'skipped', reason: `update_failed: ${error.message}` }
    return { ok: true, inquiry_id: existing2.id, contact_id: contactId, action: 'updated' }
  }

  const { data: inserted, error } = await supabase
    .from('inquiries')
    .insert(inquiryData)
    .select('id')
    .single()
  if (error || !inserted) {
    return { ok: false, action: 'skipped', reason: `insert_failed: ${error?.message}` }
  }
  return { ok: true, inquiry_id: inserted.id, contact_id: contactId, action: 'created' }
}
