'use client'

import { useContactStore, type Contact } from '@/lib/stores/contactStore'
import { EditableCell } from './EditableCell'

interface ContactDataTabProps {
  contact: Contact
}

const SOURCE_OPTIONS = [
  { value: 'referido', label: 'Referido' },
  { value: 'portal', label: 'Portal' },
  { value: 'redes', label: 'Redes' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'otro', label: 'Otro' },
]

const CIRCLE_OPTIONS = [
  { value: 'principal', label: 'Principal (5)' },
  { value: 'fundamental', label: 'Fundamental (50)' },
  { value: 'vital', label: 'Vital (100)' },
]

const CATEGORY_OPTIONS = [
  { value: 'A', label: 'A — Refiere solo' },
  { value: 'B', label: 'B — Refiere si pedís' },
  { value: 'C', label: 'C — Buena relación' },
  { value: 'D', label: 'D — Sin relación' },
]

const TIPO_OPTIONS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'personal', label: 'Personal' },
  { value: 'ambos', label: 'Ambos' },
]

const CERCANIA_OPTIONS = [
  { value: '1', label: '1 — Alta' },
  { value: '2', label: '2 — Media' },
  { value: '3', label: '3 — Baja' },
]

interface FieldDef {
  key: keyof Contact
  label: string
  type: 'text' | 'select' | 'boolean' | 'number' | 'date'
  options?: { value: string; label: string }[]
}

const FIELDS: FieldDef[] = [
  { key: 'first_name', label: 'Nombre', type: 'text' },
  { key: 'last_name', label: 'Apellido', type: 'text' },
  { key: 'primary_phone', label: 'Teléfono', type: 'text' },
  { key: 'primary_email', label: 'Email', type: 'text' },
  { key: 'source', label: 'Origen', type: 'select', options: SOURCE_OPTIONS },
  { key: 'category', label: 'Categoría', type: 'select', options: CATEGORY_OPTIONS },
  { key: 'last_contact_date', label: 'Último contacto', type: 'date' },
  { key: 'rol', label: 'Rol', type: 'text' },
  { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_OPTIONS },
  { key: 'cercania', label: 'Cercanía', type: 'select', options: CERCANIA_OPTIONS },
  { key: 'circulo', label: 'Círculo', type: 'select', options: CIRCLE_OPTIONS },
  { key: 'contexto', label: 'Contexto', type: 'text' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text' },
  { key: 'es_estrategico', label: '¿Estratégico?', type: 'boolean' },
  { key: 'es_influyente', label: '¿Influyente?', type: 'boolean' },
  { key: 'es_mentor', label: '¿Mentor?', type: 'boolean' },
]

export function ContactDataTab({ contact }: ContactDataTabProps) {
  const { updateContact } = useContactStore()

  const handleSave = (key: keyof Contact, value: string | number | boolean | null) => {
    updateContact(contact.id, { [key]: value } as Partial<Contact>)
  }

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Datos</h3>
      <div className="space-y-2">
        {FIELDS.map(field => (
          <div key={field.key} className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 w-28 shrink-0">{field.label}</span>
            <div className="flex-1">
              <EditableCell
                value={contact[field.key] as string | number | boolean | null}
                type={field.type}
                options={field.options}
                onSave={(val) => handleSave(field.key, val)}
                className="text-xs"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Meta info */}
      <div className="text-[10px] text-zinc-700 space-y-1 pt-4 border-t border-white/[0.04]">
        <p>Creado: {contact.created_at ? new Date(contact.created_at).toLocaleDateString('es-AR') : '—'}</p>
        <p>Actualizado: {contact.updated_at ? new Date(contact.updated_at).toLocaleDateString('es-AR') : '—'}</p>
      </div>
    </div>
  )
}
