import Papa from 'papaparse'

export interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        resolve({
          headers: result.meta.fields ?? [],
          rows: result.data as Record<string, string>[],
        })
      },
      error: (err) => reject(err),
    })
  })
}

export interface ColumnMapping {
  csvHeader: string
  dbField: string | null
}

export const MAPPABLE_FIELDS = [
  { value: 'first_name', label: 'Nombre' },
  { value: 'last_name', label: 'Apellido' },
  { value: 'primary_phone', label: 'Teléfono' },
  { value: 'primary_email', label: 'Email' },
  { value: 'rol', label: 'Rol' },
  { value: 'tipo', label: 'Tipo' },
  { value: 'cercania', label: 'Cercanía' },
  { value: 'circulo', label: 'Círculo' },
  { value: 'contexto', label: 'Contexto' },
  { value: 'ubicacion', label: 'Ubicación' },
  { value: 'category', label: 'Categoría' },
  { value: 'notes', label: 'Notas' },
] as const

export function autoMapHeaders(csvHeaders: string[]): ColumnMapping[] {
  const aliases: Record<string, string> = {
    nombre: 'first_name',
    name: 'first_name',
    first_name: 'first_name',
    apellido: 'last_name',
    last_name: 'last_name',
    telefono: 'primary_phone',
    teléfono: 'primary_phone',
    phone: 'primary_phone',
    celular: 'primary_phone',
    email: 'primary_email',
    correo: 'primary_email',
    mail: 'primary_email',
    rol: 'rol',
    role: 'rol',
    tipo: 'tipo',
    type: 'tipo',
    cercania: 'cercania',
    cercanía: 'cercania',
    circulo: 'circulo',
    círculo: 'circulo',
    circle: 'circulo',
    contexto: 'contexto',
    context: 'contexto',
    ubicacion: 'ubicacion',
    ubicación: 'ubicacion',
    location: 'ubicacion',
    categoria: 'category',
    categoría: 'category',
    category: 'category',
    notas: 'notes',
    notes: 'notes',
    observaciones: 'notes',
  }

  return csvHeaders.map(h => ({
    csvHeader: h,
    dbField: aliases[h.toLowerCase().trim()] ?? null,
  }))
}
