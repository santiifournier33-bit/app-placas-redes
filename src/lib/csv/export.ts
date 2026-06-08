import Papa from 'papaparse'
import type { Contact } from '@/lib/stores/contactStore'

const EXPORT_COLUMNS: { key: keyof Contact; label: string }[] = [
  { key: 'first_name', label: 'Nombre' },
  { key: 'last_name', label: 'Apellido' },
  { key: 'primary_phone', label: 'Teléfono' },
  { key: 'primary_email', label: 'Email' },
  { key: 'rol', label: 'Rol' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'cercania', label: 'Cercanía' },
  { key: 'circulo', label: 'Círculo' },
  { key: 'contexto', label: 'Contexto' },
  { key: 'ubicacion', label: 'Ubicación' },
  { key: 'es_estrategico', label: 'Estratégico' },
  { key: 'es_influyente', label: 'Influyente' },
  { key: 'es_mentor', label: 'Mentor' },
  { key: 'category', label: 'Categoría' },
  { key: 'last_contact_date', label: 'Último contacto' },
  { key: 'notes', label: 'Notas' },
]

export function exportContactsCSV(contacts: Contact[]) {
  const rows = contacts.map(c =>
    Object.fromEntries(
      EXPORT_COLUMNS.map(col => {
        const val = c[col.key]
        if (Array.isArray(val)) return [col.label, val.join(', ')]
        if (typeof val === 'boolean') return [col.label, val ? 'Sí' : 'No']
        return [col.label, val ?? '']
      })
    )
  )

  const csv = Papa.unparse(rows)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `contactos_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
