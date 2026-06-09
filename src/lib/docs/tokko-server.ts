/**
 * Native Tokko Broker REST client for the documentation READ path.
 *
 * Port of `tokko-drive-sync/src/tokko.js` `getAllProperties` to native `fetch`
 * (no axios) so it bundles cleanly into Next.js / Netlify serverless.
 * Returns the raw Tokko property objects — `doc-analyzer` consumes them directly.
 */

const BASE_URL = 'https://www.tokkobroker.com/api/v1'
const PAGE_SIZE = 100
const TIMEOUT_MS = 10000
const MAX_RETRIES = 3

export type TokkoRawProperty = Record<string, unknown>

interface TokkoListResponse {
  meta?: { total_count?: number }
  count?: number
  objects?: TokkoRawProperty[]
  results?: TokkoRawProperty[]
}

async function fetchPage(apiKey: string, offset: number, attempt = 1): Promise<TokkoListResponse> {
  const url = new URL(`${BASE_URL}/property/`)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('lang', 'es_ar')
  url.searchParams.set('limit', String(PAGE_SIZE))
  url.searchParams.set('offset', String(offset))

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Tokko API ${res.status}`)
    return (await res.json()) as TokkoListResponse
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err
    await new Promise((r) => setTimeout(r, attempt * 1000))
    return fetchPage(apiKey, offset, attempt + 1)
  } finally {
    clearTimeout(timer)
  }
}

// ── Folder/agent naming helpers (port of tokko.js) ──

const OPERATION_MAP: Record<number, string> = { 1: 'Venta', 2: 'Alquiler', 3: 'Alquiler temporario' }
const OPERATION_NAME_MAP: Record<string, string> = { sale: 'Venta', rent: 'Alquiler', 'temporary rent': 'Alquiler temporario' }
const TYPE_NAME_MAP: Record<string, string> = {
  house: 'Casa', apartment: 'Departamento', ph: 'PH', office: 'Oficina', local: 'Local',
  store: 'Local', warehouse: 'Galpon', land: 'Terreno', lot: 'Lote', country: 'Country',
  garage: 'Cochera', field: 'Campo', building: 'Edificio',
}

interface TokkoProp {
  id: number | string
  operations?: Array<{ operation_type?: string; operation_id?: number }>
  type?: { name?: string }
  location?: { name?: string }
  address_street?: string
  producer?: { name?: string; last_name?: string; email?: string }
}

const cleanName = (str: string) => str.replace(/[<>:"/\\|?*]/g, '').trim()

/** Build the Drive folder name `<id> - <Op> <Type> <Location>`. */
export function buildFolderName(property: TokkoRawProperty, resolvedLocation?: string): string {
  const p = property as unknown as TokkoProp
  const rawOperation = p.operations?.[0]?.operation_type || ''
  const operation = OPERATION_NAME_MAP[rawOperation.toLowerCase()]
    || OPERATION_MAP[p.operations?.[0]?.operation_id as number]
    || rawOperation || 'Operacion'
  const rawType = p.type?.name || ''
  const type = TYPE_NAME_MAP[rawType.toLowerCase()] || rawType || 'Propiedad'
  const location = resolvedLocation || p.location?.name || p.address_street || 'Sin ubicacion'
  return `${p.id} - ${cleanName(operation)} ${cleanName(type)} ${cleanName(location)}`
}

/** Agent (producer) display name. */
export function getAgentName(property: TokkoRawProperty): string {
  const producer = (property as unknown as TokkoProp).producer
  if (!producer) return 'Sin Asesor'
  const name = `${producer.name || ''} ${producer.last_name || ''}`.trim()
  return name || producer.email || 'Sin Asesor'
}

/** Fetch every property from Tokko (paginated). */
export async function getAllProperties(apiKey: string): Promise<TokkoRawProperty[]> {
  const properties: TokkoRawProperty[] = []
  let offset = 0
  let total: number | null = null

  while (total === null || offset < total) {
    const data = await fetchPage(apiKey, offset)

    if (total === null) {
      total = data.meta?.total_count ?? data.count ?? data.objects?.length ?? 0
    }

    const page = data.objects || data.results || []
    if (page.length === 0) break

    properties.push(...page)
    offset += page.length

    if (page.length < PAGE_SIZE) break
  }

  return properties
}
