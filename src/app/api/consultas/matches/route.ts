import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getApiUser } from '@/lib/auth/api-auth'
import {
  buildReasonsText,
  computeMatchScoreSmart,
  enrichLocationIds,
  fetchNeighborLocationIds,
  operationsMatch,
  recencyBucket,
  type PropertyAttributes,
  type UserPreferences,
} from '@/lib/consultas/matching'

const TOKKO_API_KEY = process.env.TOKKO_API_KEY!
const TOKKO_BASE = 'https://www.tokkobroker.com/api/v1'

interface TokkoOperation {
  type?: number | string
  operation_id?: number
  operation_type?: string
  prices?: Array<{ price: number; currency: string }>
}

interface TokkoProperty {
  id: number
  reference_code: string
  address: string
  type?: { name: string }
  operations?: TokkoOperation[]
  suite_amount?: number
  room_amount?: number
  geo_lat?: string
  geo_long?: string
  location?: { name: string; full_location?: string }
}

function tokkoOpFromString(s: string): number | null {
  const t = (s || '').toLowerCase()
  if (t.includes('temporal') || t.includes('temporario')) return 3
  if (t === 'sale' || t === 'venta') return 1
  if (t === 'rent' || t === 'alquiler') return 2
  return null
}

function buildAttrsFromTokko(p: TokkoProperty): PropertyAttributes {
  const op = p.operations?.[0]
  const price = op?.prices?.[0]
  // Tokko returns `operation_id` (number) on /property/{id}/ but `type` on other endpoints
  let opType: number | null = null
  if (typeof op?.operation_id === 'number') opType = op.operation_id
  else if (typeof op?.type === 'number') opType = op.type
  else if (typeof op?.operation_type === 'string') opType = tokkoOpFromString(op.operation_type)
  else if (typeof op?.type === 'string') opType = tokkoOpFromString(op.type)
  return {
    tokko_id: p.id,
    operation_type: opType,
    price: price?.price ?? null,
    currency: price?.currency ?? null,
    property_type: p.type?.name ?? null,
    // Tokko `suite_amount` = dormitorios (naming confuso). Fallback: room_amount - 1.
    bedrooms: p.suite_amount ?? (p.room_amount ? Math.max(p.room_amount - 1, 0) : null),
    geo_lat: p.geo_lat ? Number(p.geo_lat) : null,
    geo_long: p.geo_long ? Number(p.geo_long) : null,
    location_name: p.location?.name ?? null,
    location_full: p.location?.full_location ?? null,
  }
}

function buildAttrsFromSnapshot(snap: Record<string, unknown>): PropertyAttributes {
  return {
    tokko_id: snap.tokko_id as number,
    operation_type: (snap.operation_type as number | null) ?? null,
    price: (snap.price as number | null) ?? null,
    currency: (snap.currency as string | null) ?? null,
    property_type: (snap.property_type as string | null) ?? null,
    bedrooms: (snap.bedrooms as number | null) ?? null,
    geo_lat: (snap.geo_lat as number | null) ?? null,
    geo_long: (snap.geo_long as number | null) ?? null,
    location_name: (snap.location_name as string | null) ?? null,
    location_full: (snap.location_full as string | null) ?? null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tokkoPropertyId = searchParams.get('property_id')
    if (!tokkoPropertyId) {
      return NextResponse.json({ error: 'Missing property_id' }, { status: 400 })
    }

    const user = await getApiUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const isAdmin = user.role === 'admin'

    // Service client bypasses RLS — inquiries should be visible to all advisors,
    // with PII masking applied below based on contact.owner_id vs user.id (admins see all).
    const admin = createServiceClient()

    // 1. Fetch property from Tokko (with caching headers — let CDN handle later)
    const url = `${TOKKO_BASE}/property/${tokkoPropertyId}/?key=${TOKKO_API_KEY}&format=json&lang=es_ar`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) {
      return NextResponse.json({ error: 'Tokko property fetch failed' }, { status: 502 })
    }
    const tokkoProp = (await res.json()) as TokkoProperty
    const propAttrs = buildAttrsFromTokko(tokkoProp)
    if (propAttrs.operation_type == null) {
      return NextResponse.json({ matches: [], propertyHasNoOperation: true })
    }

    // Hard filter operation buckets
    const opBucket: number[] = propAttrs.operation_type === 1 ? [1] : [2, 3]

    // Hard cutoff: inquiries older than 18 months are excluded (data deemed stale).
    const cutoffMs = 18 * 30 * 24 * 60 * 60 * 1000
    const cutoffIso = new Date(Date.now() - cutoffMs).toISOString()

    // 2. Query candidate inquiries with hard op filter + 18-month recency cutoff.
    // Currency + price filters fail with JSONB cast in PostgREST — apply them in JS scoring instead.
    const { data: inquiries, error } = await admin
      .from('inquiries')
      .select(
        'id, contact_id, owner_id, last_inquired_at, first_inquired_at, property_snapshot, tokko_property_id, tokko_property_reference, source, source_portal, status, user_preferences, location_id, location_is_approximate',
      )
      .in('property_snapshot->>operation_type', opBucket.map(String))
      .gte('last_inquired_at', cutoffIso)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!inquiries || inquiries.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    // 3a. Build attrs for target prop + all inquiries.
    // Inquiries already have `location_id` denormalized (BEFORE INSERT/UPDATE trigger
    // computes it from property_snapshot.geo_lat/lng). Read it directly to skip RPC.
    // Target prop comes from Tokko (no precomputed location_id) — resolve via batch RPC.
    const inquiryAttrsList = inquiries.map((inq) => {
      const attrs = buildAttrsFromSnapshot((inq.property_snapshot ?? {}) as Record<string, unknown>)
      attrs.location_id = inq.location_id ?? null
      attrs.location_is_approximate = inq.location_is_approximate ?? false
      return attrs
    })
    await enrichLocationIds([propAttrs], admin)

    // 3a-bis. Fetch neighbor polygons solo cuando target tiene location_id PRECISO
    // (country/barrio). Si es approximate (localidad/partido), el polygon es enorme
    // y los "vecinos" incluirían todo lo contenido/superpuesto → falsos positivos
    // masivos. Skip ahorra 1 RPC roundtrip.
    if (propAttrs.location_id != null && !propAttrs.location_is_approximate) {
      propAttrs.neighbor_location_ids = await fetchNeighborLocationIds(propAttrs.location_id, admin)
    }

    // 3b. Score inquiries first (no PII needed). Collect only passers.
    const passing: Array<{ inq: typeof inquiries[number]; score: ReturnType<typeof computeMatchScoreSmart> }> = []
    inquiries.forEach((inq, i) => {
      const inquiryAttrs = inquiryAttrsList[i]
      const prefs = (inq.user_preferences as UserPreferences | null) ?? null
      const inquiryOp = prefs?.operation_type ?? inquiryAttrs.operation_type
      if (!operationsMatch(propAttrs.operation_type, inquiryOp)) return
      const score = computeMatchScoreSmart(propAttrs, inquiryAttrs, prefs)
      if (score.total < 40) return
      passing.push({ inq, score })
    })

    // 3c. Dedup por (contact_id, tokko_property_id): mismo contacto + misma propiedad
    // (re-consultas multi-fecha o cross-portal) colapsan en 1 card con contador.
    // Distinto tokko_property_id queda como cards separadas (interés en propiedades distintas).
    // Fallback key cuando tokko_property_id es null: usa snapshot.tokko_id.
    type PassingEntry = typeof passing[number]
    interface Group {
      best: PassingEntry
      total_consultas: number
      primera_consulta: string
      ultima_consulta: string
      portales: Set<string>
    }
    const groups = new Map<string, Group>()
    for (const p of passing) {
      const snapTokkoId = (p.inq.property_snapshot as Record<string, unknown> | null)?.tokko_id
      const propKey = String(p.inq.tokko_property_id ?? snapTokkoId ?? '')
      const key = `${p.inq.contact_id}::${propKey}`
      const portal = p.inq.source_portal ?? null
      const existing = groups.get(key)
      if (!existing) {
        groups.set(key, {
          best: p,
          total_consultas: 1,
          primera_consulta: p.inq.first_inquired_at ?? p.inq.last_inquired_at,
          ultima_consulta: p.inq.last_inquired_at,
          portales: new Set(portal ? [portal] : []),
        })
      } else {
        existing.total_consultas++
        if (new Date(p.inq.last_inquired_at) > new Date(existing.ultima_consulta)) {
          existing.best = p
          existing.ultima_consulta = p.inq.last_inquired_at
        }
        const firstIso = p.inq.first_inquired_at ?? p.inq.last_inquired_at
        if (new Date(firstIso) < new Date(existing.primera_consulta)) {
          existing.primera_consulta = firstIso
        }
        if (portal) existing.portales.add(portal)
      }
    }
    const passingDeduped = [...groups.values()]

    // 4. Batch fetch contacts (+ emails + phones) only for passing inquiries
    const contactIds = [...new Set(passingDeduped.map((g) => g.best.inq.contact_id))]
    const [{ data: contacts }, { data: emails }, { data: phones }] = await Promise.all([
      contactIds.length ? admin.from('contacts').select('id, first_name, last_name, owner_id').in('id', contactIds) : Promise.resolve({ data: [], error: null }),
      contactIds.length ? admin.from('contact_emails').select('contact_id, email').in('contact_id', contactIds) : Promise.resolve({ data: [], error: null }),
      contactIds.length ? admin.from('contact_phones').select('contact_id, phone').in('contact_id', contactIds) : Promise.resolve({ data: [], error: null }),
    ])

    const contactById = new Map((contacts ?? []).map((c) => [c.id, c]))
    const emailByContact = new Map<string, string[]>()
    for (const e of emails ?? []) {
      const list = emailByContact.get(e.contact_id) ?? []
      list.push(e.email)
      emailByContact.set(e.contact_id, list)
    }
    const phoneByContact = new Map<string, string[]>()
    for (const p of phones ?? []) {
      const list = phoneByContact.get(p.contact_id) ?? []
      list.push(p.phone)
      phoneByContact.set(p.contact_id, list)
    }

    // 5. Mask + assemble
    const matches = []
    for (const g of passingDeduped) {
      const { inq, score } = g.best
      const contact = contactById.get(inq.contact_id)
      if (!contact) continue

      const isOwn = contact.owner_id === user.id
      const canSeePII = isAdmin || isOwn
      // Mask non-owned (asesor only): only first_name visible. Admins always see full PII.
      const display = canSeePII
        ? {
            full_name: `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Sin nombre',
            email: (emailByContact.get(contact.id) ?? [])[0] ?? null,
            phone: (phoneByContact.get(contact.id) ?? [])[0] ?? null,
            is_own: isOwn,
            can_see_pii: true,
          }
        : {
            full_name: contact.first_name ?? 'Contacto',
            email: null,
            phone: null,
            is_own: false,
            can_see_pii: false,
          }

      const snapTokkoId = (inq.property_snapshot as Record<string, unknown> | null)?.tokko_id
      const isDirect =
        String(inq.tokko_property_reference) === String(tokkoPropertyId) ||
        String(snapTokkoId ?? '') === String(tokkoPropertyId)
      const matchType: 'direct' | 'history' = isDirect ? 'direct' : 'history'

      matches.push({
        inquiry_id: inq.id,
        contact_id: contact.id,
        score: score.total,
        breakdown: score.breakdown,
        zone_kind: score.zone_kind,
        score_source: score.source,
        match_type: matchType,
        soft_fail_reasons: score.soft_fail_reasons ?? null,
        reasons_text: buildReasonsText(score, inq.last_inquired_at),
        recency_bucket: recencyBucket(inq.last_inquired_at),
        last_inquired_at: inq.last_inquired_at,
        owner_id: inq.owner_id,
        source: inq.source,
        source_portal: inq.source_portal,
        status: inq.status,
        total_consultas: g.total_consultas,
        primera_consulta: g.primera_consulta,
        ultima_consulta: g.ultima_consulta,
        portales: [...g.portales],
        ...display,
      })
    }

    matches.sort((a, b) => b.score - a.score)

    return NextResponse.json({ matches, property: propAttrs, viewer_role: isAdmin ? 'admin' : 'asesor' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
