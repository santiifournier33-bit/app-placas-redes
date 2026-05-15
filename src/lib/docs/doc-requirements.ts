/**
 * Configuración de documentos requeridos por tipo de operación.
 * Las categorías (keys) coinciden con las del clasificador IA (classifier.js).
 * Los labels usan la terminología interna de Freire Propiedades.
 */

export type DocPriority = 'obligatorio' | 'recomendado'
export type PropertyStatus = 'complete' | 'partial' | 'incomplete' | 'missing' | 'unsynced'

export interface DocRequirement {
  category: string          // key del clasificador IA (ej: 'mandato', 'titulo')
  label: string             // nombre visible en UI (ej: 'Autorización de venta')
  priority: DocPriority
  validTypes: string[]      // tipos específicos que satisfacen este requerimiento
}

export interface OperationRequirements {
  obligatorios: DocRequirement[]
  recomendados: DocRequirement[]
}

// ── Labels de categorías (UI) ──
// "mandato" del clasificador → "Autorización" en UI
export const CATEGORY_LABELS: Record<string, string> = {
  mandato: 'Autorización',
  titulo: 'Título de propiedad',
  identidad: 'DNI Titulares',
  fiscal: 'Documentación fiscal',
  expensas: 'Expensas',
  plano: 'Planos',
  habilitacion: 'Habilitaciones',
  hipoteca: 'Hipotecas',
  fondo_comercio: 'Fondo de comercio',
  consorcio: 'Consorcio / PH',
  foto: 'Fotografías',
  sin_clasificar: 'Sin clasificar',
}

// ── Tipos válidos por categoría que satisfacen el requerimiento ──

const TITULO_TYPES = [
  'escritura_compraventa',
  'boleto_compraventa',
  'declaratoria_herederos',
  'cesion_derechos',
  'tracto_abreviado',
]

const MANDATO_VENTA_TYPES = [
  'autorizacion_venta_exclusiva',
  'autorizacion_venta_no_exclusiva',
]

const MANDATO_ALQUILER_TYPES = [
  'autorizacion_alquiler_exclusiva',
  'autorizacion_alquiler_no_exclusiva',
]

const DNI_TITULAR_TYPES = [
  'dni_frente',
  'dni_dorso',
  'foto_dni_frente',
  'foto_dni_dorso',
]

const DNI_CONYUGE_TYPES = [
  'dni_conyuge_frente',
  'dni_conyuge_dorso',
]

// ── Requerimientos por operación ──

export const VENTA_REQUIREMENTS: OperationRequirements = {
  obligatorios: [
    {
      category: 'mandato',
      label: 'Autorización de venta',
      priority: 'obligatorio',
      validTypes: MANDATO_VENTA_TYPES,
    },
    {
      category: 'titulo',
      label: 'Título de propiedad',
      priority: 'obligatorio',
      validTypes: TITULO_TYPES,
    },
    {
      category: 'identidad',
      label: 'DNI Titulares',
      priority: 'obligatorio',
      validTypes: DNI_TITULAR_TYPES,
    },
  ],
  recomendados: [
    {
      category: 'identidad_conyuge',
      label: 'DNI Cónyuge',
      priority: 'recomendado',
      validTypes: DNI_CONYUGE_TYPES,
    },
  ],
}

export const ALQUILER_REQUIREMENTS: OperationRequirements = {
  obligatorios: [
    {
      category: 'mandato',
      label: 'Autorización de alquiler',
      priority: 'obligatorio',
      validTypes: MANDATO_ALQUILER_TYPES,
    },
  ],
  recomendados: [
    {
      category: 'titulo',
      label: 'Título de propiedad',
      priority: 'recomendado',
      validTypes: TITULO_TYPES,
    },
    {
      category: 'identidad',
      label: 'DNI Titulares',
      priority: 'recomendado',
      validTypes: DNI_TITULAR_TYPES,
    },
    {
      category: 'identidad_conyuge',
      label: 'DNI Cónyuge',
      priority: 'recomendado',
      validTypes: DNI_CONYUGE_TYPES,
    },
  ],
}

/**
 * Retorna los requerimientos según el tipo de operación.
 * Fallback a venta si no se reconoce.
 */
export function getRequirements(operationType: string): OperationRequirements {
  const op = operationType.toLowerCase()
  if (op.includes('alquiler') || op.includes('rent')) return ALQUILER_REQUIREMENTS
  return VENTA_REQUIREMENTS
}

/**
 * Extrae la categoría de un nombre de archivo clasificado por IA.
 * Ej: "titulo_escritura_compraventa_garcia_2023.pdf" → "titulo"
 * Ej: "mandato_autorizacion_venta_no_exclusiva_perez_2026.pdf" → "mandato"
 * Ej: "sin_clasificar_documento.pdf" → "sin_clasificar"
 */
export function extractCategory(fileName: string): string {
  const base = fileName.split('.')[0] || ''
  const categories = [
    'sin_clasificar', 'fondo_comercio', // multi-word first
    'mandato', 'titulo', 'identidad', 'fiscal',
    'expensas', 'plano', 'habilitacion', 'hipoteca',
    'consorcio', 'foto',
  ]
  for (const cat of categories) {
    if (base.startsWith(cat)) return cat
  }
  return 'sin_clasificar'
}

/**
 * Extrae el tipo específico de documento del nombre clasificado.
 * Ej: "mandato_autorizacion_venta_exclusiva_perez_2026.pdf"
 *   → busca en MANDATO_VENTA_TYPES y retorna "autorizacion_venta_exclusiva"
 */
export function extractDocType(fileName: string): string | null {
  const base = fileName.split('.')[0] || ''

  const allTypes = [
    ...TITULO_TYPES, ...MANDATO_VENTA_TYPES, ...MANDATO_ALQUILER_TYPES,
    ...DNI_TITULAR_TYPES, ...DNI_CONYUGE_TYPES,
  ]

  for (const type of allTypes) {
    if (base.includes(type)) return type
  }
  return null
}

/**
 * Calcula el status de una propiedad dado los archivos clasificados presentes.
 */
export function calculateStatus(
  operationType: string,
  presentCategories: string[],
  presentDocTypes: string[],
): PropertyStatus {
  const reqs = getRequirements(operationType)

  if (presentCategories.length === 0 && presentDocTypes.length === 0) return 'missing'

  // Check obligatorios
  const obligatoriosMet = reqs.obligatorios.every(req =>
    req.validTypes.some(t => presentDocTypes.includes(t))
  )

  if (!obligatoriosMet) return 'incomplete'

  // Check recomendados
  const recomendadosMet = reqs.recomendados.every(req =>
    req.validTypes.some(t => presentDocTypes.includes(t))
  )

  return recomendadosMet ? 'complete' : 'partial'
}

// ── Status labels y colores para UI ──

export const STATUS_CONFIG: Record<PropertyStatus, { label: string; color: string; emoji: string }> = {
  complete: { label: 'Completa', color: 'emerald', emoji: '✅' },
  partial: { label: 'Parcial', color: 'amber', emoji: '⚠️' },
  incomplete: { label: 'Incompleta', color: 'amber', emoji: '🟠' },
  missing: { label: 'Sin documentación', color: 'red', emoji: '🔴' },
  unsynced: { label: 'Sin sincronizar', color: 'zinc', emoji: '⚪' },
}
