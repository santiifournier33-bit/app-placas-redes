import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildReasonsText,
  computeMatchScore,
  operationsMatch,
  recencyBucket,
  type PropertyAttributes,
} from '@/lib/consultas/matching'

const TOKKO_API_KEY = process.env.TOKKO_API_KEY!
const TOKKO_BASE = 'https://www.tokkobroker.com/api/v1'

interface TokkoProperty {
  id: number
  reference_code: string
  address: string
  type?: { name: string }
  operations?: Array<{ type: number; prices: Array<{ price: number; currency: string }> }>
  suite_amount?: number
  geo_lat?: string
  geo_long?: string
  location?: { name: string; full_location?: string }
}

function tokkoOpFromString(s: string): number | null {
  const t = s?.toLowerCase()
  if (t === 'sale' || t === 'venta') return 1
  if (t === 'rent' || t === 'alquiler') return 2
  if (t === 'temporary rent' || t === 'alquiler temporal' || t === 'alquiler temporario') return 3
  return null
}

function buildAttrsFromTokko(p: TokkoProperty): PropertyAttributes {
  const op = p.operations?.[0]
  const price = op?.prices?.[0]
  // op.type may come as enum string like "Sale" — convert if string
  let opType: number | null = null
  if (typeof op?.type === 'number') opType = op.type
  else if (typeof op?.type === 'string') opType = tokkoOpFromString(op.type)
  return {
    tokko_id: p.id,
    operation_type: opType,
    price: price?.price ?? null,
    currency: price?.currency ?? null,
    property_type: p.type?.name ?? null,
    bedrooms: p.suite_amount ?? null,
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

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    // 2. Query candidate inquiries with hard op filter (jsonb cast)
    const { data: inquiries, error } = await supabase
      .from('inquiries')
      .select(
        'id, contact_id, owner_id, last_inquired_at, property_snapshot, tokko_property_reference, source, status',
      )
      .in('property_snapshot->>operation_type', opBucket.map(String))

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!inquiries || inquiries.length === 0) {
      return NextResponse.json({ matches: [] })
    }

    // 3. Batch fetch contacts (+ emails + phones)
    const contactIds = [...new Set(inquiries.map((i) => i.contact_id))]
    const [{ data: contacts }, { data: emails }, { data: phones }] = await Promise.all([
      supabase.from('contacts').select('id, first_name, last_name, owner_id').in('id', contactIds),
      supabase.from('contact_emails').select('contact_id, email').in('contact_id', contactIds),
      supabase.from('contact_phones').select('contact_id, phone').in('contact_id', contactIds),
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

    // 4. Score + mask + filter + sort
    const matches = []
    for (const inq of inquiries) {
      const inquiryAttrs = buildAttrsFromSnapshot(
        (inq.property_snapshot ?? {}) as Record<string, unknown>,
      )

      // Defensive hard-filter again
      if (!operationsMatch(propAttrs.operation_type, inquiryAttrs.operation_type)) continue

      const score = computeMatchScore(propAttrs, inquiryAttrs)
      if (score.total < 40) continue

      const contact = contactById.get(inq.contact_id)
      if (!contact) continue

      const isOwn = contact.owner_id === user.id
      // Mask non-owned: only first_name visible. No last_name, no email, no phone.
      const display = isOwn
        ? {
            full_name: `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Sin nombre',
            email: (emailByContact.get(contact.id) ?? [])[0] ?? null,
            phone: (phoneByContact.get(contact.id) ?? [])[0] ?? null,
            is_own: true,
          }
        : {
            full_name: contact.first_name ?? 'Contacto',
            email: null,
            phone: null,
            is_own: false,
          }

      matches.push({
        inquiry_id: inq.id,
        contact_id: contact.id,
        score: score.total,
        breakdown: score.breakdown,
        reasons_text: buildReasonsText(score, inq.last_inquired_at),
        recency_bucket: recencyBucket(inq.last_inquired_at),
        last_inquired_at: inq.last_inquired_at,
        owner_id: inq.owner_id,
        source: inq.source,
        status: inq.status,
        ...display,
      })
    }

    matches.sort((a, b) => b.score - a.score)

    return NextResponse.json({ matches, property: propAttrs })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
