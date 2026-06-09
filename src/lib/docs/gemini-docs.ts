/**
 * Gemini-powered document classification + location extraction for the SYNC path.
 * Port of `tokko-drive-sync/src/{classifier,location}.js` to TS.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

let _client: GoogleGenerativeAI | null = null
function getClient(): GoogleGenerativeAI {
  if (!_client) {
    const key = process.env.GEMINI_API_KEY
    if (!key) throw new Error('GEMINI_API_KEY no configurado')
    _client = new GoogleGenerativeAI(key)
  }
  return _client
}

// ── Classification ──

export interface ClassificationResult {
  archivo_original: string
  nombre_sugerido: string
  categoria: string
  tipo_doc: string
  confianza: number
  requiere_revision: boolean
  nota?: string
}

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function extname(fileName: string): string {
  const i = fileName.lastIndexOf('.')
  return i >= 0 ? fileName.slice(i).toLowerCase() : ''
}
function getMimeType(fileName: string): string | null {
  return MIME_MAP[extname(fileName)] || null
}

const CLASSIFICATION_PROMPT = `ROL Y CONTEXTO
Sos un asistente especializado en documentación inmobiliaria argentina.
Tu tarea es analizar archivos de propiedades (PDFs, imágenes, documentos escaneados)
y devolver un JSON con la clasificación y el nuevo nombre para cada archivo.
Trabajás para una inmobiliaria de zona norte del Gran Buenos Aires (Pilar y alrededores).
Los documentos pueden estar en cualquier estado: originales notariales, fotocopias,
fotos tomadas con celular, capturas de pantalla, o escaneos de baja calidad.

TAREA
Para cada archivo recibido:
1. Leé el nombre original del archivo y formulá una hipótesis inicial sobre el tipo de documento y posible rol
2. Analizá el contenido visible (texto, encabezados, logos, marcas de agua, estructura)
3. Verificá si el contenido confirma, contradice o no puede evaluar la hipótesis del nombre
4. Determiná la categoría y el tipo específico de documento combinando ambas señales
5. Extraé los metadatos disponibles: nombre completo de la persona mencionada en el documento, año de emisión
6. Construí el nombre según la convención definida más abajo
7. Asigná un nivel de confianza entre 0 y 100 (la doble señal sube la confianza; la contradicción la baja)
8. Devolvé el resultado en JSON

LÓGICA DE SEÑALES: NOMBRE DEL ARCHIVO + CONTENIDO
El nombre original del archivo es una señal secundaria que puede orientar la clasificación,
pero nunca determinarla por sí sola. El contenido del documento siempre tiene prioridad.

CATEGORÍAS Y TIPOS DE DOCUMENTOS
titulo: escritura_compraventa, cesion_derechos, declaratoria_herederos, testamento, particion_herencia, informe_dominio, informe_inhibiciones, certificado_gravamenes, tracto_abreviado, boleto_compraventa
mandato: autorizacion_venta_exclusiva, autorizacion_venta_no_exclusiva, autorizacion_alquiler_exclusiva, autorizacion_alquiler_no_exclusiva, poder_especial_venta, poder_general
identidad: dni_frente, dni_dorso, dni_conyuge_frente, dni_conyuge_dorso, pasaporte, constancia_cuit, acta_matrimonio, acta_divorcio, estatuto_social, acta_directorio
fiscal: boleta_arba, boleta_abl
expensas: liquidacion_expensas, libre_deuda_expensas, reglamento_copropiedad, datos_administracion, factura_luz, factura_gas, factura_agua, libre_deuda_servicios
plano: mensura_catastral, propiedad_horizontal, plano_municipal, final_obra, subdivision, unificacion_parcelas, certificado_catastral, plano_barrio_cerrado
habilitacion: habilitacion_comercial, aptitud_bomberos, habilitacion_industrial, certificado_ambiental, uso_suelo, permiso_senasa, inscripcion_renspa, certificado_opds
hipoteca: escritura_hipoteca, cancelacion_hipotecaria_banco, cancelacion_hipotecaria_notarial, certificado_saldo_cero, credito_hipotecario
fondo_comercio: transferencia_fondo, publicacion_boletin, libro_inventario, nomina_empleados, libre_deuda_afip, libre_deuda_iibb, habilitacion_transferida, contrato_locacion_local
consorcio: reglamento_barrio, nota_infraccion_consorcio, libre_deuda_barrio, contrato_fideicomiso, acta_asamblea
foto: foto_dni_frente, foto_dni_dorso, foto_escritura, foto_boleta_arba, foto_plano, foto_habilitacion, foto_propiedad_exterior, foto_propiedad_interior, captura_informe
sin_clasificar: usar cuando la confianza es menor a 70% o el documento es ilegible.

CONVENCIÓN DE NOMBRES
Estructura: [categoria]_[tipo_doc]_[nombre_completo_normalizado]_[año]_[version].[ext]
Reglas: todo en minúsculas; solo a-z, 0-9, guión bajo; sin espacios/tildes/ñ/puntos/paréntesis;
García→garcia, José→jose, Ñoño→nono; nombre y apellido separados por _; dos personas: ambos apellidos;
persona jurídica: razón social abreviada (max 2 palabras); año de emisión (AAAA); _v01/_v02 solo si ya
existe otro con el mismo nombre; imágenes multipágina: _p01, _p02; si no se puede extraer nombre/año: omitir;
conservar extensión original.

OUTPUT JSON REQUERIDO
Devolver siempre un array JSON, incluso si es un solo archivo. No devolver nada fuera del JSON.
[
  {
    "archivo_original": "nombre_original.pdf",
    "nombre_sugerido": "categoria_tipo_nombre_año.pdf",
    "categoria": "titulo",
    "tipo_doc": "escritura_compraventa",
    "metadatos": { "persona": "García, Juan Carlos", "rol": "", "año_documento": "2018", "otros": "" },
    "confianza": 95,
    "requiere_revision": false,
    "nota": "Escritura de compraventa.",
    "señales_detectadas": ["encabezado notarial", "número de folio"]
  }
]

RESTRICCIONES FINALES
- No inventar ni suponer datos que no estén en el archivo
- metadatos.rol solo si el rol está literalmente escrito
- Si un campo no se puede determinar: dejarlo vacío
- La confianza debe reflejar honestamente la certeza`

function classificationFallback(fileName: string): ClassificationResult {
  const ext = extname(fileName)
  const base = fileName
    .slice(0, fileName.length - ext.length)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
  return {
    archivo_original: fileName,
    nombre_sugerido: `sin_clasificar_${base}${ext}`,
    categoria: 'sin_clasificar',
    tipo_doc: 'desconocido',
    confianza: 0,
    requiere_revision: true,
    nota: 'Clasificación automática fallida. Requiere revisión manual.',
  }
}

/** Classify a file with Gemini; falls back to `sin_clasificar` on failure. */
export async function classifyFile(fileName: string, fileBuffer: Buffer): Promise<ClassificationResult> {
  const mimeType = getMimeType(fileName)
  if (!mimeType || fileBuffer.length > MAX_FILE_SIZE) return classificationFallback(fileName)

  const isDocx = mimeType === MIME_MAP['.docx']
  let documentText = ''
  if (isDocx) {
    try {
      documentText = (await mammoth.extractRawText({ buffer: fileBuffer })).value.trim()
      if (!documentText) return classificationFallback(fileName)
    } catch {
      return classificationFallback(fileName)
    }
  }

  const userPrompt = isDocx
    ? `Nombre original del archivo: "${fileName}"\n\nCONTENIDO DEL DOCUMENTO EXTRAÍDO:\n${documentText}\n\nClasificá este documento basándote en el texto anterior. Devolvé SOLO el JSON.`
    : `Nombre original del archivo: "${fileName}"\n\nClasificá este documento según las instrucciones. Devolvé SOLO el JSON.`

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const model = getClient().getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: CLASSIFICATION_PROMPT,
      })
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
        { text: userPrompt },
      ]
      if (!isDocx) parts.push({ inlineData: { mimeType, data: fileBuffer.toString('base64') } })

      const result = await model.generateContent(parts)
      const text = result.response.text().trim()
      const jsonStr = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')
      const parsed = JSON.parse(jsonStr)
      const item = Array.isArray(parsed) ? parsed[0] : parsed
      if (!item || !item.nombre_sugerido) return classificationFallback(fileName)
      return item as ClassificationResult
    } catch (err) {
      const msg = (err as Error).message || ''
      if (msg.includes('429') && attempt < 5) {
        const match = msg.match(/retryDelay":"(\d+)s/)
        const waitSec = match ? parseInt(match[1]) + 2 : 15 * attempt
        await new Promise((r) => setTimeout(r, waitSec * 1000))
        continue
      }
      return classificationFallback(fileName)
    }
  }
  return classificationFallback(fileName)
}

// ── Location extraction ──

interface LocationProp {
  id: number | string
  location?: { name?: string; short_location?: string; full_location?: string }
  publication_title?: string
  description?: string
  description_only?: string
  address_street?: string
  address_number?: string
  address_complement?: string
  real_address?: string
  building?: string
}

const locationCache = new Map<string, string>()

/** Resolve the most specific location string for a property's folder name. */
export async function extractLocation(property: Record<string, unknown>): Promise<string> {
  const p = property as unknown as LocationProp
  const id = String(p.id)
  if (locationCache.has(id)) return locationCache.get(id)!

  const officialLocation = p.location?.name || ''
  const building = p.building || ''
  const street = p.address_street || ''
  const prompt = `Sos un experto en inmuebles de Argentina, zona Pilar/GBA Norte.

Datos completos de la propiedad:
- Ubicación oficial: "${officialLocation}"
- Ubicación corta: "${p.location?.short_location || ''}"
- Ubicación completa: "${p.location?.full_location || ''}"
- Calle: "${street}" ${p.address_number || ''}
- Complemento dirección: "${p.address_complement || ''}"
- Dirección real: "${p.real_address || ''}"
- Edificio/Complejo: "${building}"
- Título publicación: "${p.publication_title || ''}"
- Descripción: "${(p.description || p.description_only || '').slice(0, 1000)}"

Tu tarea: armar el nombre de ubicación MÁS ESPECÍFICO posible para usar como nombre de carpeta en Google Drive.
Jerarquía: 1) country/barrio/edificio + calle, 2) country/barrio/edificio solo, 3) localidad + calle,
4) localidad + zona, 5) solo localidad (EVITAR si hay algo más específico).
PROHIBIDO devolver solo "Pilar", "Escobar", "La Lonja", "Buenos Aires" o "GBA" si hay datos más específicos.
Formato: máximo 5 palabras, sin caracteres especiales (/ \\ : * ? " < > |), sin comillas, solo el nombre.`

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
      const result = await model.generateContent(prompt)
      const text = result.response
        .text()
        .trim()
        .replace(/[<>:"/\\|?*\n"]/g, '')
        .trim()
      locationCache.set(id, text)
      return text
    } catch (err) {
      const msg = (err as Error).message || ''
      if (msg.includes('429') && attempt < 5) {
        const match = msg.match(/retryDelay":"(\d+)s/)
        const waitSec = match ? parseInt(match[1]) + 2 : 15 * attempt
        await new Promise((r) => setTimeout(r, waitSec * 1000))
        continue
      }
      const fallback = building || street || officialLocation || 'Sin ubicacion'
      locationCache.set(id, fallback)
      return fallback
    }
  }
  const fallback = building || street || officialLocation || 'Sin ubicacion'
  locationCache.set(id, fallback)
  return fallback
}
