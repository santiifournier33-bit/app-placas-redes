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
}

export interface MatchScore {
  total: number
  breakdown: {
    zone: number
    price: number
    bedrooms: number
    type: number
  }
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

function scoreZone(prop: PropertyAttributes, inquiry: PropertyAttributes): { score: number; reason: string } {
  // Try barrio exact first
  const h = hierarchyMatch(prop.location_full, inquiry.location_full)
  if (h === 'barrio') {
    return { score: 100, reason: `${prop.location_name ?? 'Zona'} (barrio exacto)` }
  }
  // Try radius < 2km if coords available
  if (
    prop.geo_lat != null && prop.geo_long != null &&
    inquiry.geo_lat != null && inquiry.geo_long != null
  ) {
    const km = haversineKm(prop.geo_lat, prop.geo_long, inquiry.geo_lat, inquiry.geo_long)
    if (km < 2) {
      return { score: 80, reason: `a ${km.toFixed(1)} km de la consulta` }
    }
  }
  if (h === 'localidad') return { score: 60, reason: 'misma localidad' }
  if (h === 'partido') return { score: 30, reason: 'mismo partido' }
  return { score: 0, reason: '' }
}

function scorePrice(prop: PropertyAttributes, inquiry: PropertyAttributes): { score: number; reason: string } {
  if (prop.price == null || inquiry.price == null) return { score: 0, reason: '' }
  if (prop.currency && inquiry.currency && prop.currency !== inquiry.currency) {
    return { score: 0, reason: '' }
  }
  const ratio = prop.price / inquiry.price
  // Tolerated range: -30% to +15% of consulted price.
  // Outside the range → 0. Inside → curve from 100 (equal) to ~60 at edges.
  if (ratio < 0.70 || ratio > 1.15) return { score: 0, reason: '' }
  const distance = Math.abs(ratio - 1)
  // edge distance (max): max(0.15, 0.30) = 0.30
  const maxDist = 0.30
  const normalized = 1 - distance / maxDist  // 1 at center, 0 at edge
  const score = Math.round(60 + 40 * Math.max(0, normalized))  // 60..100
  return {
    score,
    reason: `${inquiry.currency ?? ''} ${Math.round(inquiry.price).toLocaleString('es-AR')} (rango ${Math.round((ratio - 1) * 100)}%)`,
  }
}

function scoreBedrooms(prop: PropertyAttributes, inquiry: PropertyAttributes): { score: number; reason: string } {
  if (prop.bedrooms == null || inquiry.bedrooms == null) return { score: 0, reason: '' }
  const diff = Math.abs(prop.bedrooms - inquiry.bedrooms)
  if (diff === 0) return { score: 100, reason: `${prop.bedrooms} dorm exacto` }
  if (diff === 1) return { score: 50, reason: `${inquiry.bedrooms} dorm (±1)` }
  if (diff === 2) return { score: 10, reason: `${inquiry.bedrooms} dorm (±2)` }
  return { score: 0, reason: '' }
}

function scoreType(prop: PropertyAttributes, inquiry: PropertyAttributes): { score: number; reason: string } {
  if (!prop.property_type || !inquiry.property_type) return { score: 0, reason: '' }
  if (prop.property_type.toLowerCase() === inquiry.property_type.toLowerCase()) {
    return { score: 100, reason: prop.property_type }
  }
  return { score: 0, reason: '' }
}

export function computeMatchScore(
  prop: PropertyAttributes,
  inquiry: PropertyAttributes,
): MatchScore {
  const zone = scoreZone(prop, inquiry)
  const price = scorePrice(prop, inquiry)
  const bedrooms = scoreBedrooms(prop, inquiry)
  const type = scoreType(prop, inquiry)

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
