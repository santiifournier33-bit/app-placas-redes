/**
 * Construye los datos para el motor de plantillas y los submitters de DocuSeal
 * a partir del input del formulario de "Autorización de comercialización".
 *
 * Firmantes dinámicos: N propietarios (cada uno opcionalmente con cónyuge firmante)
 * + corredor fijo. Los `role` generados aquí matchean exactamente los tags de firma
 * que el motor inyecta vía [[firma]] (scope.role), garantizando el ruteo en DocuSeal.
 */

import { numberToWords, computeExclusivaDates } from './format'
import type { TemplateData } from './template-engine'

export interface ConyugeInput {
  nombre: string
  caracter: string // "Cónyuge" | "Conviviente"
  email: string
}

export interface PropietarioInput {
  nombre: string
  dni: string
  domicilio: string
  localidad: string
  partido: string
  estadoCivil: string
  telefono: string
  email: string
  conyuge?: ConyugeInput | null
}

export interface AutorizacionInput {
  propietarios: PropietarioInput[]
  propiedad: {
    domicilio: string
    localidad: string
    partido: string
    partidaInmobiliaria?: string
    afectacion?: string
    aptoCredito: string // "SI" | "NO"
  }
  precioUsd: number
  exclusividadDias: number
  startDate: string // "YYYY-MM-DD"
  ejemplares: number
  ciudadFirma: string
  corredor: { nombre: string; email: string }
}

export interface Submitter {
  role: string
  name: string
  email: string
}

export interface BuiltAutorizacion {
  data: TemplateData
  submitters: Submitter[]
  docTitle: string
}

/** Email válido (formato). La detección de typos es UX del frontend. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
}

export function buildAutorizacion(input: AutorizacionInput): BuiltAutorizacion {
  const { propietarios, propiedad, corredor } = input

  // Firmantes (lado "PROPIETARIO/S"): propietarios + cónyuges que firman.
  const firmantes: Array<{ role: string; nombre: string; rol_label: string }> = []
  const submitters: Submitter[] = []

  propietarios.forEach((p, i) => {
    const role = `Propietario ${i + 1}`
    firmantes.push({ role, nombre: p.nombre, rol_label: 'PROPIETARIO' })
    submitters.push({ role, name: p.nombre, email: p.email })
  })

  let conyugeIdx = 0
  for (const p of propietarios) {
    if (p.conyuge) {
      conyugeIdx += 1
      const role = `Conyuge ${conyugeIdx}`
      firmantes.push({ role, nombre: p.conyuge.nombre, rol_label: 'CÓNYUGE' })
      submitters.push({ role, name: p.conyuge.nombre, email: p.conyuge.email })
    }
  }

  // Corredor (fijo, último).
  submitters.push({ role: 'Corredor', name: corredor.nombre, email: corredor.email })

  // Cónyuges para el bloque ASENTIMIENTO (todos los presentes).
  const conyuges = propietarios
    .filter((p) => p.conyuge)
    .map((p) => ({ nombre: p.conyuge!.nombre, caracter: p.conyuge!.caracter }))

  const dates = computeExclusivaDates(input.startDate, input.exclusividadDias)

  const data: TemplateData = {
    logo_url: 'https://www.freirepropiedades.com/logo.png', // placeholder; ajustar a asset real
    // Propietarios (intro repetido)
    propietarios: propietarios.map((p) => ({
      nombre: p.nombre,
      dni: p.dni,
      domicilio: p.domicilio,
      localidad: p.localidad,
      partido: p.partido,
      estado_civil: p.estadoCivil,
      telefono: p.telefono,
      email: p.email,
    })),
    conyuges,
    firmantes,
    corredor: [{ role: 'Corredor', nombre: corredor.nombre }],
    // Propiedad
    domicilio_propiedad: propiedad.domicilio,
    localidad_propiedad: propiedad.localidad,
    partido_propiedad: propiedad.partido,
    partida_inmobiliaria: propiedad.partidaInmobiliaria || '---',
    afectacion: propiedad.afectacion || '---',
    apto_credito: propiedad.aptoCredito,
    // Precio / exclusiva / cierre
    precio_numeros: String(input.precioUsd),
    precio_palabras: numberToWords(input.precioUsd),
    dias_exclusiva_numeros: String(input.exclusividadDias),
    dias_exclusiva_palabras: numberToWords(input.exclusividadDias),
    fecha_inicio: dates.startDateFormatted,
    fecha_fin: dates.endDateFormatted,
    ejemplares_numero: String(input.ejemplares),
    ejemplares_palabra: numberToWords(input.ejemplares),
    ciudad_firma: input.ciudadFirma,
    dia: dates.day,
    mes: dates.month,
    anio: dates.year,
  }

  const docTitle = `Autorización - ${propietarios.map((p) => p.nombre).join(', ')}`

  return { data, submitters, docTitle }
}
