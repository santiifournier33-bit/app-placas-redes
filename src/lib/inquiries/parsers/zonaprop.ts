import * as cheerio from 'cheerio'

export interface ZonaPropParsed {
  reference_code: string | null
  aviso_id: string | null
  contact: {
    name: string | null
    email: string | null
    phones: string[]
  }
  property_title: string | null
  property_address: string | null
  operation_property_type: string | null  // raw "Departamento en Venta"
  message: string | null
  user_preferences: {
    operation_type?: number | null
    property_type?: string | null
    price_min?: number | null
    price_max?: number | null
    currency?: string | null
    zones?: string[]
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
    antiguedad_anios?: number | null
  } | null
}

// Unicode-tolerant regex: matches CÓD, COD, NFD-decomposed forms
const SUBJECT_REGEX = /C[ÓOÓo][̀-ͯ]*D:?\s*([A-Z]{2,5}\d{4,12})/iu

export function parseZonapropSubject(subject: string): { reference_code: string | null; aviso_id: string | null } {
  const normalized = (subject || '').normalize('NFC')
  const m = normalized.match(SUBJECT_REGEX)
  if (!m) return { reference_code: null, aviso_id: null }
  const avM = normalized.match(/REF:?#?(\d+)/i)
  return { reference_code: m[1].toUpperCase(), aviso_id: avM ? avM[1] : null }
}

function detectOperationType(text: string): number | null {
  const t = text.toLowerCase()
  if (/alquiler\s+temporal|temporario/.test(t)) return 3
  if (/alquiler/.test(t)) return 2
  if (/venta/.test(t)) return 1
  return null
}

function parsePriceRange(text: string): { min: number | null; max: number | null; currency: string | null } {
  // Match patterns like "USD 60.000 - USD 98.000" or "ARS 100.000 - ARS 200.000"
  const m = text.match(/(USD|ARS|\$)\s*([\d.,]+)\s*-\s*(USD|ARS|\$)?\s*([\d.,]+)/i)
  if (!m) {
    const single = text.match(/(USD|ARS|\$)\s*([\d.,]+)/i)
    if (single) {
      const num = Number(single[2].replace(/[.,]/g, ''))
      return { min: num, max: num, currency: single[1].toUpperCase().replace('$', 'ARS') }
    }
    return { min: null, max: null, currency: null }
  }
  return {
    min: Number(m[2].replace(/[.,]/g, '')),
    max: Number(m[4].replace(/[.,]/g, '')),
    currency: m[1].toUpperCase().replace('$', 'ARS'),
  }
}

function parseNumericRange(text: string): { min: number | null; max: number | null } {
  const m = text.match(/(\d+)\s*a\s*(\d+)/)
  if (m) return { min: Number(m[1]), max: Number(m[2]) }
  const single = text.match(/(\d+)/)
  if (single) {
    const n = Number(single[1])
    return { min: n, max: n }
  }
  return { min: null, max: null }
}

/** Parse Zonaprop email body HTML. Email comes as multipart with HTML part. */
export function parseZonapropBody(html: string): Omit<ZonaPropParsed, 'reference_code' | 'aviso_id'> {
  const $ = cheerio.load(html)
  const text = $.root().text()

  // Email of user
  const emailMatch = text.match(/E-?mail:\s*([^\s<>]+@[^\s<>]+)/i)
  const contact_email = emailMatch ? emailMatch[1].trim() : null

  // Name
  const nameMatch = text.match(/Nombre y apellido:\s*([^\n\r]+)/i)
  const contact_name = nameMatch ? nameMatch[1].trim() : null

  // Phones (can be multiple)
  const phones: string[] = []
  const phoneMatches = [...text.matchAll(/Tel[ée]fono:\s*([0-9+\-\s()]+)/gi)]
  for (const m of phoneMatches) {
    const p = m[1].trim().replace(/\s+$/, '')
    if (p && /\d{5,}/.test(p)) phones.push(p)
  }

  // Message body
  const messageMatch = text.match(/Este es el mensaje que te enviaron:?\s*([\s\S]+?)(?=Datos del interesado|Tu contacto busca|Conocé lo que busca|$)/i)
  const message = messageMatch ? messageMatch[1].trim().slice(0, 1000) : null

  // Operation + property type (immediate after "Conocé lo que busca")
  const opTypeMatch = text.match(/Tu contacto busca:\s*\n?\s*([A-Za-záéíóú]+(?:\s+en\s+[A-Za-záéíóú]+)?)/i)
  const operation_property_type = opTypeMatch ? opTypeMatch[1].trim() : null

  // === Preferences section ===
  // Price range
  const priceSection = text.match(/(USD|ARS|\$)\s*[\d.,]+\s*-\s*(USD|ARS|\$)?\s*[\d.,]+/i)
  const priceRange = priceSection ? parsePriceRange(priceSection[0]) : { min: null, max: null, currency: null }

  // Zones (after "Le interesa encontrar una propiedad en:")
  const zonesMatch = text.match(/Le interesa encontrar una propiedad en:\s*([\s\S]+?)(?=Con las siguientes|$)/i)
  let zones: string[] = []
  if (zonesMatch) {
    const zonasRaw = zonesMatch[1].trim()
    zones = zonasRaw.split(/[\n,]/).map(z => z.trim()).filter(z => z && z.length > 1 && z.length < 80)
  }

  // Características section
  const charsMatch = text.match(/Con las siguientes caracter[ií]sticas:?\s*([\s\S]+?)(?=La respuesta|$)/i)
  const charsText = charsMatch ? charsMatch[1] : ''
  const ambientesM = charsText.match(/(\d+)\s*a\s*(\d+)\s*Ambientes?/i)
  const dorm = charsText.match(/(\d+)\s*a\s*(\d+)\s*Dormitorios?/i)
  const banios = charsText.match(/(\d+)\s*a\s*(\d+)\s*Ba[ñn]os?/i)
  const supTotal = charsText.match(/(\d+)\s*a\s*(\d+)\s*m[²2]\s*Totales?/i)
  const supCub = charsText.match(/(\d+)\s*a\s*(\d+)\s*m[²2]\s*Cubiertos?/i)
  const expensas = charsText.match(/Entre\s+(USD|ARS|\$)?\s*([\d.,]+)\s*a\s*(USD|ARS|\$)?\s*([\d.,]+)\s*expensas/i)
  const antiguedad = charsText.match(/(\d+)\s*A[ñn]os/i)

  const property_type_only = operation_property_type ? operation_property_type.replace(/\s+en\s+\w+$/i, '').trim() : null

  const user_preferences = {
    operation_type: operation_property_type ? detectOperationType(operation_property_type) : null,
    property_type: property_type_only,
    price_min: priceRange.min,
    price_max: priceRange.max,
    currency: priceRange.currency,
    zones,
    bedrooms_min: dorm ? Number(dorm[1]) : null,
    bedrooms_max: dorm ? Number(dorm[2]) : null,
    bathrooms_min: banios ? Number(banios[1]) : null,
    bathrooms_max: banios ? Number(banios[2]) : null,
    surface_total_min: supTotal ? Number(supTotal[1]) : null,
    surface_total_max: supTotal ? Number(supTotal[2]) : null,
    surface_covered_min: supCub ? Number(supCub[1]) : null,
    surface_covered_max: supCub ? Number(supCub[2]) : null,
    expenses_min: expensas ? Number(expensas[2].replace(/[.,]/g, '')) : null,
    expenses_max: expensas ? Number(expensas[4].replace(/[.,]/g, '')) : null,
    antiguedad_anios: antiguedad ? Number(antiguedad[1]) : null,
  }

  // Property details from email banner
  const propertyTitleMatch = text.match(/Ver aviso\s*([\s\S]{1,200}?)(?=\n|$)/i)

  return {
    contact: { name: contact_name, email: contact_email, phones },
    property_title: propertyTitleMatch ? propertyTitleMatch[1].trim().split('\n')[0].slice(0, 200) : null,
    property_address: null,
    operation_property_type,
    message,
    user_preferences,
  }
}

export function parseZonapropEmail(subject: string, htmlBody: string): ZonaPropParsed {
  const subj = parseZonapropSubject(subject)
  const body = parseZonapropBody(htmlBody)
  return { ...subj, ...body }
}
