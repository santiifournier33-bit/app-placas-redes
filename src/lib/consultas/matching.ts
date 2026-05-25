// Matching engine — pure functions, no I/O.
// Score 0-100 = weighted sum of zone (40%) + price (30%) + bedrooms (20%) + type (10%).
// Threshold: scores under 40 are filtered out by the caller.

export interface PropertyAttributes {
  tokko_id: number | string
  operation_type: number | null    // 1=venta, 2=alquiler, 3=alquiler temporal
  price: number | null
  currency: string | null
  property_type: string | null
  bedrooms: number | null
  geo_lat: number | null
  geo_long: number | null
  location_name: string | null
  location_full: string | null     // "Country / State / Division / Barrio"
  // Populated by enrichLocationIds() before scoring. Points to public.locations.id.
  // When both prop and inquiry resolve to the same location_id (deepest polygon
  // containing their coords), score zona = 100. See scoreZone in this file.
  location_id?: number | null
  // True when location_id was resolved via parent-level fallback (localidad/partido)
  // rather than exact barrio/country. scoreZone tier 1 caps to 70 when either side
  // is approximate.
  location_is_approximate?: boolean
  // Populated by enrichNeighborLocationIds() for the target property only.
  // List of location_ids whose polygon edges are within 500m of this property's
  // polygon. Used by scoreZone tier 1.5 (neighbor polygons → score 80).
  neighbor_location_ids?: number[]
}

export type ZoneMatchKind =
  | 'polygon_same'         // both prop and inquiry inside same Zonaprop polygon (exact)
  | 'polygon_approximate'  // same polygon but resolved via parent-level fallback
  | 'polygon_neighbor'     // inquiry inside polygon adjacent to prop's polygon (<500m)
  | 'string_barrio'        // Tokko location_full match at barrio level
  | 'haversine_close'      // <2km coords distance
  | 'haversine_mid'        // 2-5km coords distance
  | 'string_localidad'     // localidad string match
  | 'string_partido'       // partido string match
  | 'none'

export interface MatchScore {
  total: number
  breakdown: {
    zone: number
    price: number
    bedrooms: number
    type: number
  }
  zone_kind: ZoneMatchKind
  reasons: string[]
}

/** Hard filter: matching operations buckets.
 *  Venta (1) only with Venta. Alquiler (2 or 3) matches either rent type. */
export function operationsMatch(propOp: number | null, inquiryOp: number | null): boolean {
  if (propOp == null || inquiryOp == null) return false
  if (propOp === 1) return inquiryOp === 1
  // 2 or 3 = alquiler bucket
  return inquiryOp === 2 || inquiryOp === 3
}

/** Haversine distance in km between two lat/lon. */
function haversineKm(
  lat1: number, lon1: number, lat2: number, lon2: number,
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Compare two `full_location` strings by hierarchy level.
 *  Tokko format: "Argentina | Buenos Aires | Pilar | Barrio Santa María".
 *  Returns 'barrio' | 'localidad' | 'partido' | 'none'. */
function hierarchyMatch(a: string | null, b: string | null): 'barrio' | 'localidad' | 'partido' | 'none' {
  if (!a || !b) return 'none'
  const partsA = a.split('|').map((s) => s.trim().toLowerCase())
  const partsB = b.split('|').map((s) => s.trim().toLowerCase())
  // Compare from most specific (last) to least specific.
  const minLen = Math.min(partsA.length, partsB.length)
  if (minLen >= 4 && partsA[3] && partsA[3] === partsB[3]) return 'barrio'
  if (minLen >= 3 && partsA[2] && partsA[2] === partsB[2]) return 'localidad'
  if (minLen >= 2 && partsA[1] && partsA[1] === partsB[1]) return 'partido'
  return 'none'
}

export function propertyTypesCompatible(typeA: string | null, typeB: string | null): boolean {
  if (!typeA || !typeB) return false
  const tA = typeA.toLowerCase().trim()
  const tB = typeB.toLowerCase().trim()
  if (tA === tB) return true

  // Normalización y sinónimos comunes
  const norm = (t: string) => {
    if (t === 'casa' || t === 'house') return 'casa'
    if (t === 'departamento' || t === 'apartment' || t === 'depto') return 'depto'
    if (t === 'ph' || t === 'propiedad horizontal') return 'ph'
    if (t === 'duplex' || t === 'dúplex') return 'duplex'
    if (t === 'terreno' || t === 'land' || t === 'lote') return 'lote'
    if (t === 'oficina' || t === 'office') return 'oficina'
    return t
  }

  const nA = norm(tA)
  const nB = norm(tB)
  if (nA === nB) return true

  // Compatibilidades específicas
  if (nA === 'casa' && (nB === 'duplex' || nB === 'ph')) return true
  if (nB === 'casa' && (nA === 'duplex' || nA === 'ph')) return true

  if (nA === 'depto' && nB === 'ph') return true
  if (nB === 'depto' && nA === 'ph') return true

  return false
}

function scoreZone(
  prop: PropertyAttributes,
  inquiry: PropertyAttributes,
): { score: number; reason: string; kind: ZoneMatchKind } {
  // Tier 1: mismo polígono Zonaprop.
  // Si alguno de los dos lados es aproximado (resolved via parent fallback), tope 70.
  if (prop.location_id != null && inquiry.location_id != null && prop.location_id === inquiry.location_id) {
    const approx = Boolean(prop.location_is_approximate || inquiry.location_is_approximate)
    if (approx) {
      return { score: 70, reason: `${prop.location_name ?? 'Zona'} (misma zona, aproximado)`, kind: 'polygon_approximate' }
    }
    return { score: 100, reason: `${prop.location_name ?? 'Zona'} (mismo polígono)`, kind: 'polygon_same' }
  }
  // Tier 1.5: polígonos vecinos (bordes a <500m, populated by enrichNeighborLocationIds for target prop)
  if (
    prop.neighbor_location_ids?.length &&
    inquiry.location_id != null &&
    prop.neighbor_location_ids.includes(inquiry.location_id)
  ) {
    return { score: 80, reason: 'barrio vecino (polígono adyacente)', kind: 'polygon_neighbor' }
  }
  // Tier 2: barrio exacto por string (Tokko location_full hierarchy)
  const h = hierarchyMatch(prop.location_full, inquiry.location_full)
  if (h === 'barrio') {
    return { score: 100, reason: `${prop.location_name ?? 'Zona'} (barrio exacto)`, kind: 'string_barrio' }
  }
  // Tier 3 / 4: haversine (menos confiable que polígono — score reducido 65/45 vs 80/60 antes)
  if (
    prop.geo_lat != null && prop.geo_long != null &&
    inquiry.geo_lat != null && inquiry.geo_long != null
  ) {
    const km = haversineKm(prop.geo_lat, prop.geo_long, inquiry.geo_lat, inquiry.geo_long)
    if (km < 2) return { score: 65, reason: `a ${km.toFixed(1)} km de la consulta`, kind: 'haversine_close' }
    if (km < 5) return { score: 45, reason: `a ${km.toFixed(1)} km de la consulta`, kind: 'haversine_mid' }
  }
  if (h === 'localidad') return { score: 40, reason: 'misma localidad', kind: 'string_localidad' }
  if (h === 'partido') return { score: 20, reason: 'mismo partido', kind: 'string_partido' }
  return { score: 0, reason: '', kind: 'none' }
}

/**
 * Fetches neighbor location_ids for the given target location via RPC
 * `get_neighbor_location_ids`. Used by scoreZone tier 1.5 — when inquiry
 * resolves to a location_id that's adjacent to the target's polygon, score 80.
 *
 * Caller mutates propAttrs.neighbor_location_ids with the result.
 * Errors return empty array silently (matches degrade to non-polygon tiers).
 */
export async function fetchNeighborLocationIds(
  locationId: number,
  supabase: unknown,
  distanceMeters: number = 500,
): Promise<number[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as { rpc: (fn: string, params: any) => Promise<{ data: unknown; error: unknown }> }
    const { data, error } = await client.rpc('get_neighbor_location_ids', {
      p_location_id: locationId,
      p_distance_m: distanceMeters,
    })
    if (error) {
      console.warn('[fetchNeighborLocationIds] RPC error:', error)
      return []
    }
    return Array.isArray(data) ? (data as number[]) : []
  } catch (err) {
    console.warn('[fetchNeighborLocationIds] thrown:', err)
    return []
  }
}

/**
 * Resolves `location_id` for each PropertyAttributes by calling the batch RPC
 * `batch_find_location_for_points`. Mutates each attrs in place adding the
 * deepest-level location id whose polygon contains its (geo_lat, geo_long).
 * Attrs without coords are left with `location_id = null`.
 *
 * The RPC must be available in Supabase — see migration
 * `batch_find_locations_for_points`.
 *
 * Accepts any object with an `rpc()` method (typed Supabase client or service
 * client). Errors are swallowed silently — when the RPC is unavailable or
 * fails, scoreZone falls back to the existing string + haversine logic.
 */
export async function enrichLocationIds(
  attrs: PropertyAttributes[],
  supabase: unknown,
): Promise<void> {
  const points: Array<{ idx: number; lat: number; lng: number }> = []
  attrs.forEach((a, idx) => {
    if (a.geo_lat != null && a.geo_long != null) {
      points.push({ idx, lat: a.geo_lat, lng: a.geo_long })
    }
  })
  if (points.length === 0) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as { rpc: (fn: string, params: any) => Promise<{ data: unknown; error: unknown }> }
    const { data, error } = await client.rpc('batch_find_location_for_points', { p_points: points })
    if (error) {
      console.warn('[enrichLocationIds] RPC error, falling back to string+haversine:', error)
      return
    }
    if (!Array.isArray(data)) return
    for (const row of data as Array<{ idx: number; location_id: number | null }>) {
      if (attrs[row.idx]) attrs[row.idx].location_id = row.location_id ?? null
    }
  } catch (err) {
    console.warn('[enrichLocationIds] thrown, falling back to string+haversine:', err)
  }
}

/** Property types where dormitorios concept does not apply. */
function isLandType(t: string | null | undefined): boolean {
  if (!t) return false
  const norm = t.toLowerCase().trim()
  return norm === 'terreno' || norm === 'lote' || norm === 'land' ||
         norm === 'campo' || norm === 'quinta vacacional' || norm === 'fondo de comercio'
}

/**
 * Price scoring with rangos por operación:
 *   - Venta (op=1):     default -15% / +20%
 *   - Alquiler (op=2/3): default -10% / +15%
 *
 * Opción B (high-confidence expand): cuando el match tiene zona alta + dorm cerca + tipo OK,
 * expand venta a -30% / +25% para no perderse oportunidades (rebajas significativas en propiedad
 * casi idéntica a lo que el contacto buscaba).
 */
function scorePrice(
  prop: PropertyAttributes,
  inquiry: PropertyAttributes,
  opts: { expandedRange: boolean },
): { score: number; reason: string; isValid: boolean } {
  if (prop.price == null || inquiry.price == null) return { score: 0, reason: '', isValid: true }
  if (prop.currency && inquiry.currency && prop.currency !== inquiry.currency) {
    return { score: 0, reason: 'monedas diferentes', isValid: false }
  }

  const isAlquiler = prop.operation_type === 2 || prop.operation_type === 3
  let minRatio: number
  let maxRatio: number
  if (isAlquiler) {
    minRatio = 0.90  // -10%
    maxRatio = 1.15  // +15%
  } else {
    minRatio = 0.85  // -15%
    maxRatio = 1.20  // +20%
  }
  if (opts.expandedRange && !isAlquiler) {
    // High-confidence venta: expand para capturar oportunidades de rebaja.
    minRatio = 0.70  // -30%
    maxRatio = 1.25  // +25%
  }

  const ratio = prop.price / inquiry.price
  if (ratio < minRatio || ratio > maxRatio) {
    return { score: 0, reason: 'precio fuera de rango', isValid: false }
  }
  const distance = Math.abs(ratio - 1)
  const maxDist = Math.max(maxRatio - 1, 1 - minRatio)
  const normalized = 1 - distance / maxDist
  const score = Math.round(60 + 40 * Math.max(0, normalized))
  return {
    score,
    reason: `${inquiry.currency ?? ''} ${Math.round(inquiry.price).toLocaleString('es-AR')} (rango ${Math.round((ratio - 1) * 100)}%)`,
    isValid: true,
  }
}

function scoreBedrooms(prop: PropertyAttributes, inquiry: PropertyAttributes): { score: number; reason: string } {
  // Para lotes/terrenos/campos, dormitorios no aplica. Neutralizar el peso devolviendo 100.
  if (isLandType(prop.property_type) || isLandType(inquiry.property_type)) {
    return { score: 100, reason: 'sin dormitorios (lote/terreno)' }
  }
  if (prop.bedrooms == null || inquiry.bedrooms == null) return { score: 0, reason: '' }
  const diff = Math.abs(prop.bedrooms - inquiry.bedrooms)
  if (diff === 0) return { score: 100, reason: `${prop.bedrooms} dorm exacto` }
  if (diff === 1) return { score: 70, reason: `${inquiry.bedrooms} dorm (±1)` }
  if (diff === 2) return { score: 30, reason: `${inquiry.bedrooms} dorm (±2)` }
  return { score: 0, reason: '' }
}

function scoreType(prop: PropertyAttributes, inquiry: PropertyAttributes): { score: number; reason: string; isValid: boolean } {
  if (!prop.property_type || !inquiry.property_type) return { score: 0, reason: '', isValid: true }
  if (propertyTypesCompatible(prop.property_type, inquiry.property_type)) {
    return { score: 100, reason: prop.property_type, isValid: true }
  }
  return { score: 0, reason: 'tipo de propiedad incompatible', isValid: false }
}

export function computeMatchScore(
  prop: PropertyAttributes,
  inquiry: PropertyAttributes,
): MatchScore {
  const zone = scoreZone(prop, inquiry)
  const bedrooms = scoreBedrooms(prop, inquiry)
  const type = scoreType(prop, inquiry)
  // Q7 Opción B: cuando zona alta + dorm cerca + tipo OK, expandimos rango de precio
  // a -30/+25 para no perder oportunidades de rebaja en propiedades casi idénticas.
  const highConfidenceMatch =
    (zone.kind === 'polygon_same' || zone.kind === 'string_barrio' || zone.kind === 'polygon_approximate') &&
    bedrooms.score >= 70 &&
    type.score === 100
  const price = scorePrice(prop, inquiry, { expandedRange: highConfidenceMatch })

  // Hard filter: if price or property type is invalid, score is 0
  if (!price.isValid || !type.isValid) {
    return {
      total: 0,
      breakdown: { zone: zone.score, price: price.score, bedrooms: bedrooms.score, type: type.score },
      zone_kind: zone.kind,
      reasons: [
        !price.isValid ? price.reason : '',
        !type.isValid ? type.reason : ''
      ].filter(Boolean),
    }
  }

  const total = Math.round(
    zone.score * 0.40 +
    price.score * 0.30 +
    bedrooms.score * 0.20 +
    type.score * 0.10,
  )

  const reasons: string[] = []
  if (zone.reason) reasons.push(zone.reason)
  if (price.reason) reasons.push(price.reason)
  if (bedrooms.reason) reasons.push(bedrooms.reason)
  if (type.reason) reasons.push(type.reason)

  return {
    total,
    breakdown: { zone: zone.score, price: price.score, bedrooms: bedrooms.score, type: type.score },
    zone_kind: zone.kind,
    reasons,
  }
}

export function recencyBucket(lastInquiredAt: string | Date): 'green' | 'yellow' | 'orange' | 'red' {
  const ts = new Date(lastInquiredAt).getTime()
  const months = (Date.now() - ts) / (30 * 24 * 60 * 60 * 1000)
  if (months < 3) return 'green'
  if (months < 6) return 'yellow'
  if (months < 12) return 'orange'
  return 'red'
}

export function recencyLabel(lastInquiredAt: string | Date): string {
  const ts = new Date(lastInquiredAt).getTime()
  const months = Math.floor((Date.now() - ts) / (30 * 24 * 60 * 60 * 1000))
  if (months === 0) return 'consulta este mes'
  if (months === 1) return 'consulta hace 1 mes'
  if (months < 12) return `consulta hace ${months} meses`
  const years = Math.floor(months / 12)
  return years === 1 ? 'consulta hace 1 año' : `consulta hace ${years} años`
}

export function buildReasonsText(score: MatchScore, lastInquiredAt: string | Date): string {
  const parts = [...score.reasons, recencyLabel(lastInquiredAt)]
  return `Match: ${parts.join(' · ')}`
}

// ============================================================
// User preferences scoring (when explicit Zonaprop prefs exist)
// ============================================================

export interface UserPreferences {
  operation_type?: number | null
  property_type?: string | null
  price_min?: number | null
  price_max?: number | null
  currency?: string | null
  zones?: string[] | null
  bedrooms_min?: number | null
  bedrooms_max?: number | null
  bathrooms_min?: number | null
  bathrooms_max?: number | null
  surface_total_min?: number | null
  surface_total_max?: number | null
  surface_covered_min?: number | null
  surface_covered_max?: number | null
  expenses_min?: number | null
  expenses_max?: number | null
}

function scoreZoneFromPrefs(prop: PropertyAttributes, prefs: UserPreferences): { score: number; reason: string } {
  if (!prefs.zones || prefs.zones.length === 0) return { score: 0, reason: '' }
  // Tiers analogous to scoreZone: barrio 100 > localidad 40 > partido 20.
  // Prefs are zone names (no coords) — radius bands not applicable here.
  const propName = (prop.location_name ?? '').toLowerCase().trim()
  const propFullParts = (prop.location_full ?? '').toLowerCase().split('|').map(s => s.trim())
  // Tokko location_full format: "Argentina | <region> | <partido> | <barrio>"
  const barrio = propFullParts[3] ?? ''
  const partido = propFullParts[2] ?? ''
  const region = propFullParts[1] ?? ''

  // Pass 1: barrio match (exact or bidirectional includes vs location_name / parts[3])
  for (const wanted of prefs.zones) {
    const w = wanted.toLowerCase().trim()
    if (!w) continue
    if (barrio && (barrio === w || w.includes(barrio) || barrio.includes(w))) {
      return { score: 100, reason: `${wanted} (barrio preferido)` }
    }
    if (propName && (propName === w || w.includes(propName) || propName.includes(w))) {
      return { score: 100, reason: `${wanted} (barrio preferido)` }
    }
  }
  // Pass 2: localidad / partido / región match
  for (const wanted of prefs.zones) {
    const w = wanted.toLowerCase().trim()
    if (!w) continue
    if (partido && (partido === w || partido.includes(w) || w.includes(partido))) {
      return { score: 40, reason: `${wanted} (misma localidad preferida)` }
    }
    if (region && (region === w || region.includes(w))) {
      return { score: 20, reason: `${wanted} (mismo partido preferido)` }
    }
  }
  return { score: 0, reason: '' }
}

function scorePriceFromPrefs(prop: PropertyAttributes, prefs: UserPreferences): { score: number; reason: string; isValid: boolean } {
  if (prop.price == null || prefs.price_max == null) return { score: 0, reason: '', isValid: true }
  if (prefs.currency && prop.currency && prefs.currency !== prop.currency) return { score: 0, reason: 'monedas diferentes', isValid: false }
  const minP = prefs.price_min ?? 0
  const maxP = prefs.price_max
  if (prop.price >= minP && prop.price <= maxP) {
    return { score: 100, reason: `dentro de rango ${prefs.currency ?? ''} ${minP.toLocaleString('es-AR')}-${maxP.toLocaleString('es-AR')}`, isValid: true }
  }
  // 15% tolerance above/below
  if (prop.price >= minP * 0.85 && prop.price <= maxP * 1.15) {
    return { score: 60, reason: `cerca del rango buscado`, isValid: true }
  }
  return { score: 0, reason: 'precio fuera de rango', isValid: false }
}

function scoreBedroomsFromPrefs(prop: PropertyAttributes, prefs: UserPreferences): { score: number; reason: string } {
  if (prop.bedrooms == null) return { score: 0, reason: '' }
  const minB = prefs.bedrooms_min ?? null
  const maxB = prefs.bedrooms_max ?? null
  if (minB == null && maxB == null) return { score: 0, reason: '' }
  if ((minB == null || prop.bedrooms >= minB) && (maxB == null || prop.bedrooms <= maxB)) {
    return { score: 100, reason: `${prop.bedrooms} dorm (dentro de ${minB ?? '?'}-${maxB ?? '?'})` }
  }
  const closestDiff = Math.min(
    minB != null ? Math.abs(prop.bedrooms - minB) : Infinity,
    maxB != null ? Math.abs(prop.bedrooms - maxB) : Infinity,
  )
  if (closestDiff === 1) return { score: 50, reason: `${prop.bedrooms} dorm (±1)` }
  if (closestDiff === 2) return { score: 10, reason: `${prop.bedrooms} dorm (±2)` }
  return { score: 0, reason: '' }
}

function scoreTypeFromPrefs(prop: PropertyAttributes, prefs: UserPreferences): { score: number; reason: string; isValid: boolean } {
  if (!prop.property_type || !prefs.property_type) return { score: 0, reason: '', isValid: true }
  if (propertyTypesCompatible(prop.property_type, prefs.property_type)) {
    return { score: 100, reason: prop.property_type, isValid: true }
  }
  return { score: 0, reason: 'tipo de propiedad incompatible', isValid: false }
}

/** Score using explicit user preferences (from Zonaprop email "Conocé lo que busca").
 *  Same weights as snapshot-based scoring: zone 40 / price 30 / bedrooms 20 / type 10. */
export function computeMatchScoreFromPrefs(
  prop: PropertyAttributes,
  prefs: UserPreferences,
): MatchScore {
  const zone = scoreZoneFromPrefs(prop, prefs)
  const price = scorePriceFromPrefs(prop, prefs)
  const bedrooms = scoreBedroomsFromPrefs(prop, prefs)
  const type = scoreTypeFromPrefs(prop, prefs)

  // Hard filter: if price or property type is invalid, score is 0
  if (!price.isValid || !type.isValid) {
    return {
      total: 0,
      breakdown: { zone: zone.score, price: price.score, bedrooms: bedrooms.score, type: type.score },
      zone_kind: 'none',
      reasons: [
        !price.isValid ? price.reason : '',
        !type.isValid ? type.reason : ''
      ].filter(Boolean),
    }
  }

  const total = Math.round(
    zone.score * 0.40 +
    price.score * 0.30 +
    bedrooms.score * 0.20 +
    type.score * 0.10,
  )
  const reasons: string[] = []
  if (zone.reason) reasons.push(zone.reason)
  if (price.reason) reasons.push(price.reason)
  if (bedrooms.reason) reasons.push(bedrooms.reason)
  if (type.reason) reasons.push(type.reason)

  return {
    total,
    breakdown: { zone: zone.score, price: price.score, bedrooms: bedrooms.score, type: type.score },
    zone_kind: 'none',
    reasons,
  }
}

/** Score is always computed against the property the contact actually consulted
 *  (snapshot path). Zonaprop user_preferences are intentionally ignored for scoring
 *  because they tend to be overly broad (shared accounts, vague searches) and don't
 *  reflect what the contact really wants. They remain available as display context
 *  via the inquiry's `user_preferences` field (rendered in ContactDrawer section G). */
export function computeMatchScoreSmart(
  prop: PropertyAttributes,
  inquiry: PropertyAttributes,
  _userPreferences: UserPreferences | null | undefined,
): MatchScore & { source: 'snapshot' } {
  const s = computeMatchScore(prop, inquiry)
  return { ...s, source: 'snapshot' }
}
