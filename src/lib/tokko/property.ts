// Fetch + parse de una propiedad desde la API pública de Tokko Broker.
// Extraído de src/app/api/property/route.ts para reuso desde la ruta pública
// de "ficha para colegas" (src/app/ficha/[token]/page.tsx).

const TOKKO_BASE_URL = 'https://www.tokkobroker.com/api/v1'

export class TokkoConfigError extends Error {
  constructor() {
    super('Falta configuración de TOKKO_API_KEY')
    this.name = 'TokkoConfigError'
  }
}

export class TokkoNotFoundError extends Error {
  constructor(public tokkoId: string) {
    super(`Propiedad con ID ${tokkoId} no encontrada en Tokko Broker`)
    this.name = 'TokkoNotFoundError'
  }
}

export interface ParsedProperty {
  id: number
  reference_code: string
  type: string
  operation_type: string
  price: string
  price_raw: number
  currency: string
  address: string
  location: string
  full_location: string
  description: string
  surface_total: number
  surface_covered: number
  surface_uncovered: number
  surface_semicovered: number
  surface_land: number
  front_measure: number
  depth_measure: number
  rooms: number
  bathrooms: number
  bedrooms: number
  parking: number
  orientation: string
  age: number
  expenses: number
  apt_credit: string
  photos: string[]
  thumbnail: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videos: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom_tags: any[]
  geo_lat: number | null
  geo_long: number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  producer: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broker: any
}

/**
 * Trae la propiedad de Tokko por ID y la normaliza a ParsedProperty.
 * Lanza TokkoConfigError si falta la API key y TokkoNotFoundError si Tokko devuelve != 2xx.
 */
export async function fetchAndParseTokkoProperty(tokkoId: string | number): Promise<ParsedProperty> {
  const apiKey = process.env.TOKKO_API_KEY
  if (!apiKey) throw new TokkoConfigError()

  const id = String(tokkoId)
  const tokkoUrl = `${TOKKO_BASE_URL}/property/${id}/?key=${apiKey}&format=json&lang=es_ar`
  const response = await fetch(tokkoUrl, { signal: AbortSignal.timeout(10_000) })

  if (!response.ok) throw new TokkoNotFoundError(id)

  const data = await response.json()
  return parseTokkoData(data)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTokkoData(data: any): ParsedProperty {
  const operations = data.operations || []
  const firstOp = operations[0] || {}
  const prices = firstOp.prices || []
  const firstPrice = prices[0] || {}

  const typeNameMap: Record<string, string> = {
    'House': 'Casa', 'Apartment': 'Departamento', 'Land': 'Terreno', 'Office': 'Oficina',
    'Warehouse': 'Galpón', 'Commercial': 'Local', 'Garage': 'Cochera'
  }
  const opNameMap: Record<string, string> = {
    'Sale': 'Venta', 'Rent': 'Alquiler', 'Temporary rent': 'Alquiler Temporal'
  }

  const rawType = data.type?.name || "Propiedad"
  const rawOp = firstOp.operation_type || "Venta"

  return {
    id: data.id,
    reference_code: data.reference_code || "",
    type: typeNameMap[rawType] || rawType,
    operation_type: opNameMap[rawOp] || rawOp,
    price: firstPrice.price ? `${firstPrice.currency} ${Number(firstPrice.price).toLocaleString('es-AR')}` : "Consultar precio",
    price_raw: firstPrice.price || 0,
    currency: firstPrice.currency || "USD",
    address: data.fake_address || data.address || data.location?.name || "Dirección no disponible",
    location: data.location?.name || "",
    full_location: data.location?.full_location || "",
    description: (data.rich_description || data.description || "")
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/gi, ' ')
      .trim(),
    surface_total: data.surface || data.total_surface || 0,
    surface_covered: data.roofed_surface || 0,
    surface_uncovered: data.unroofed_surface || 0,
    surface_semicovered: data.semiroofed_surface || 0,
    surface_land: data.surface || data.land_surface || 0,
    front_measure: data.front_measure || 0,
    depth_measure: data.depth_measure || 0,
    rooms: data.room_amount || 0,
    bathrooms: data.bathroom_amount || 0,
    bedrooms: data.suite_amount || 0,
    parking: data.parking_lot_amount || 0,
    orientation: data.disposition || "",
    age: data.age || 0,
    expenses: data.expenses || 0,
    apt_credit: data.apt_professional_use ? "Sí" : "No",
    photos: data.photos?.map((p: { original: string }) => p.original) || [],
    thumbnail: data.photos?.[0]?.thumb || data.photos?.[0]?.original || "",
    videos: data.videos || [],
    tags: data.tags || [],
    custom_tags: data.custom_tags || [],
    geo_lat: data.geo_lat || null,
    geo_long: data.geo_long || null,
    agent: data.agent || null,
    producer: data.producer || null,
    broker: data.broker || null,
  }
}
