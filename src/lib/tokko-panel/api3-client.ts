import { normalizeLocationFull } from '@/lib/consultas/normalize-location'

// Tokko Panel /api3/ client — fetches property data including INACTIVE properties.
// Required for backfilling inquiries where `property_snapshot._source = 'inactive'`
// because public Tokko API /api/v1/inactiveproperty/{id}/ does NOT expose geo data.
//
// Auth: cookies (sessionid, csrftoken, _ugeuid) + Authorization Bearer JWT.
// Cookies + JWT stored in Supabase table `tokko_panel_session` (id='default').
// JWT extracted from `app.tokkobroker.com` localStorage[jwt] during Playwright login.

export interface TokkoPanelCookie {
  name: string
  value: string
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: string
}

export interface PanelAuth {
  cookies: TokkoPanelCookie[]
  jwt: string
}

export class TokkoPanelAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'TokkoPanelAuthError'
  }
}

export class TokkoPanelNotFoundError extends Error {
  constructor(public tokkoId: number) {
    super(`Tokko panel: property ${tokkoId} not found`)
    this.name = 'TokkoPanelNotFoundError'
  }
}

/** Format cookies array into HTTP Cookie header value. */
export function cookiesToHeader(cookies: TokkoPanelCookie[]): string {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ')
}

/** Read panel cookies + JWT from Supabase. */
export async function fetchPanelAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
): Promise<PanelAuth> {
  const { data, error } = await supabase
    .from('tokko_panel_session')
    .select('cookies, jwt, expires_at, jwt_expires_at')
    .eq('id', 'default')
    .single()
  if (error) throw new Error(`Failed to load panel session: ${error.message}`)
  if (!data?.cookies || !data?.jwt) {
    throw new Error('Panel session missing cookies or jwt. Run scripts/tokko-panel-renew-session.mjs.')
  }
  return {
    cookies: data.cookies as TokkoPanelCookie[],
    jwt: data.jwt as string,
  }
}

/**
 * GET https://www.tokkobroker.com/api3/property/{tokkoId}/quick
 * Returns FULL property data even for inactive properties.
 *
 * Throws:
 *   TokkoPanelAuthError(401|403) → cookies/JWT expired, caller should renew.
 *   TokkoPanelNotFoundError(404) → property truly gone from Tokko.
 *   Error on other failures.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchPropertyQuick(tokkoId: number, auth: PanelAuth): Promise<any> {
  const url = `https://www.tokkobroker.com/api3/property/${tokkoId}/quick`
  const res = await fetch(url, {
    headers: {
      'Cookie': cookiesToHeader(auth.cookies),
      'Authorization': auth.jwt,
      'Origin': 'https://app.tokkobroker.com',
      'Referer': 'https://app.tokkobroker.com/',
      'Accept': '*/*',
      'Accept-Language': 'es-AR,es;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    },
  })
  if (res.status === 401 || res.status === 403) {
    throw new TokkoPanelAuthError(res.status, `Tokko panel auth failed (${res.status})`)
  }
  if (res.status === 404) {
    throw new TokkoPanelNotFoundError(tokkoId)
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Tokko panel HTTP ${res.status} on ${url}: ${txt.slice(0, 200)}`)
  }
  return await res.json()
}

interface Api3BasicInfoItem {
  key: string
  name: string
  value: number | string | null
}

interface Api3Geolocation {
  lat: string | number
  lng: string | number
}

interface Api3Operations {
  Sale?: string[]
  Rent?: string[]
  Temporary_Rent?: string[]
}

/**
 * Convert /api3/property/{id}/quick response.data into the same shape used by
 * src/lib/inquiries/inbound.ts buildSnapshot — keys location_name, location_full,
 * geo_lat/long, bedrooms, etc. Stamps `_source = 'inactive_recovered'`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildSnapshotFromApi3(apiResponse: any): Record<string, unknown> | null {
  const data = apiResponse?.data
  if (!data) return null

  const basicInfo: Record<string, number | string | null> = {}
  const biArr = Array.isArray(data.basic_info) ? (data.basic_info as Api3BasicInfoItem[]) : []
  for (const item of biArr) {
    if (item?.key) basicInfo[item.key] = item.value
  }

  const measurement: Record<string, number | string | null> = {}
  const meArr = Array.isArray(data.measurement) ? (data.measurement as Api3BasicInfoItem[]) : []
  for (const item of meArr) {
    if (item?.key) {
      // Prefer original_value (numeric) over formatted display string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      measurement[item.key] = (item as any).original_value ?? item.value
    }
  }

  const geo = data.geolocation as Api3Geolocation | undefined
  const geoLat = geo?.lat != null ? Number(geo.lat) : null
  const geoLng = geo?.lng != null ? Number(geo.lng) : null

  // Operations: data.operations is an object keyed by type ("Sale", "Rent", "Temporary_Rent")
  // whose value is an array of formatted prices like ["USD 160.000"].
  // We pick the first key as the dominant operation.
  const operations = data.operations as Api3Operations | undefined
  let operationType: number | null = null
  let price: number | null = null
  let currency: string | null = null
  if (operations) {
    const sale = operations.Sale?.[0]
    const rent = operations.Rent?.[0]
    const temp = operations.Temporary_Rent?.[0]
    const first = sale ?? rent ?? temp
    if (first) {
      operationType = sale ? 1 : rent ? 2 : temp ? 3 : null
      // Parse formatted string e.g. "USD 160.000"
      const m = String(first).match(/^([A-Z]{3})\s+([\d.,]+)/)
      if (m) {
        currency = m[1]
        // Remove dot thousand separators, replace comma decimal if any
        const numStr = m[2].replace(/\./g, '').replace(',', '.')
        const parsed = Number(numStr)
        if (Number.isFinite(parsed)) price = parsed
      }
    }
  }

  // Location full normalized to canonical order (pais|region|partido|localidad|barrio).
  // api3 emits reverse-order ("Pilar | Pilar | G.B.A. Zona Norte"); normalizer reorders.
  const rawLocationFull = (data.location as string | undefined) ?? null
  const locationFull = normalizeLocationFull(rawLocationFull, 'api3')
  // location_name = deepest available (barrio if present, else localidad). Read from raw
  // because the api3 raw format puts the deepest level first.
  const locationName = rawLocationFull
    ? rawLocationFull.split('|').map(s => s.trim()).filter(Boolean)[0] ?? null
    : null

  return {
    tokko_id: data.id ?? null,
    reference: data.reference ?? null,
    reference_code: data.reference ?? null,
    address: data.address ?? null,
    publication_title: data.address ?? null,
    operation_type: operationType,
    price,
    currency,
    property_type: data.type ?? null,
    rooms_total: basicInfo.room_amount ?? null,
    // Tokko `suite_amount` = dormitorios (naming confuso).
    bedrooms: basicInfo.suite_amount ?? (typeof basicInfo.room_amount === 'number' ? Math.max(basicInfo.room_amount - 1, 0) : null),
    bathrooms: basicInfo.bathroom_amount ?? null,
    surface_total: measurement.total_surface ?? null,
    surface_covered: measurement.roofed_surface ?? null,
    geo_lat: geoLat,
    geo_long: geoLng,
    location_name: locationName,
    location_full: locationFull,
    cover_photo_url: data.pictures?.front_cover_image?.url ?? null,
    producer_email: null, // not exposed by /quick endpoint
    status: data.status ?? null,
    _source: 'inactive_recovered',
    _recovered_at: new Date().toISOString(),
  }
}
