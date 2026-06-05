/**
 * Utilidades de formato para documentos de firma (Autorización de comercialización).
 *
 * Extraídas desde SmartAuthorizationForm.tsx para reúso por el motor de plantillas
 * y las rutas de envío. Comportamiento idéntico al original (no reescritura).
 */

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
const ESPECIALES: Record<number, string> = {
  11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
  16: 'DIECISEIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
  21: 'VEINTIUN', 22: 'VEINTIDOS', 23: 'VEINTITRES', 24: 'VEINTICUATRO',
  25: 'VEINTICINCO', 26: 'VEINTISEIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE',
}
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS']

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

/** Convierte un número (0..999999) a palabras en español mayúsculas. Ej: 1000 → "MIL". */
export function numberToWords(num: number): string {
  if (!Number.isFinite(num)) return ''
  if (num === 0) return 'CERO'

  const convertGroup = (n: number): string => {
    let text = ''
    if (n === 100) return 'CIEN'
    if (n > 99) {
      text += CENTENAS[Math.floor(n / 100)] + ' '
      n = n % 100
    }
    if (n > 10 && n < 30 && n !== 20) {
      text += ESPECIALES[n] + ' '
    } else {
      if (n > 9) {
        text += DECENAS[Math.floor(n / 10)]
        n = n % 10
        if (n > 0) text += ' Y '
      }
      if (n > 0) text += UNIDADES[n] + ' '
    }
    return text.trim()
  }

  let result = ''
  if (num >= 1000) {
    const miles = Math.floor(num / 1000)
    if (miles === 1) result += 'MIL '
    else result += convertGroup(miles) + ' MIL '
    num = num % 1000
  }
  if (num > 0) {
    result += convertGroup(num)
  }
  return result.trim()
}

/** Nombre del mes en español a partir de una fecha "YYYY-MM-DD". */
export function getMonthName(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00') // evita corrimiento por timezone
  return MESES[date.getMonth()]
}

/** Formatea un Date como "DD/MM/YYYY". */
export function formatDate(date: Date): string {
  const dd = date.getDate().toString().padStart(2, '0')
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${dd}/${mm}/${date.getFullYear()}`
}

export interface ExclusivaDates {
  /** Fecha de inicio "DD/MM/YYYY". */
  startDateFormatted: string
  /** Fecha de finalización (inicio + días) "DD/MM/YYYY". */
  endDateFormatted: string
  /** Día de firma (sin cero a la izquierda). */
  day: string
  /** Mes de firma en palabras (español). */
  month: string
  /** Año de firma (4 dígitos). */
  year: string
}

/**
 * Calcula las fechas de la exclusiva a partir de la fecha de inicio "YYYY-MM-DD"
 * y la cantidad de días. Replica la lógica original de SmartAuthorizationForm.
 */
export function computeExclusivaDates(startDate: string, exclusivityDays: number): ExclusivaDates {
  const startObj = new Date(startDate + 'T00:00:00')
  const endObj = new Date(startObj)
  endObj.setDate(endObj.getDate() + Number(exclusivityDays))

  return {
    startDateFormatted: formatDate(startObj),
    endDateFormatted: formatDate(endObj),
    day: startObj.getDate().toString(),
    month: getMonthName(startDate),
    year: startObj.getFullYear().toString(),
  }
}
