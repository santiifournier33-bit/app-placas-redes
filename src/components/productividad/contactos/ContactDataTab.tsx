'use client'

import { useContactStore, type Contact, SOURCE_LABELS, CIRCLE_LABELS, CATEGORY_LABELS } from '@/lib/stores/contactStore'
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
  section: string
}

const FIELDS: FieldDef[] = [
  { key: 'first_name', label: 'Nombre', type: 'text', section: 'Básicos' },
  { key: 'last_name', label: 'Apellido', type: 'text', section: 'Básicos' },
  { key: 'primary_phone', label: 'Teléfono', type: 'text', section: 'Básicos' },
  { key: 'primary_email', label: 'Email', type: 'text', section: 'Básicos' },
  { key: 'source', label: 'Origen', type: 'select', options: SOURCE_OPTIONS, section: 'Básicos' },
  { key: 'category', label: 'Categoría', type: 'select', options: CATEGORY_OPTIONS, section: 'Básicos' },
  { key: 'last_contact_date', label: 'Último contacto', type: 'date', section: 'Básicos' },
  { key: 'rol', label: 'Rol', type: 'text', section: 'Magnín' },
  { key: 'tipo', label: 'Tipo', type: 'select', options: TIPO_OPTIONS, section: 'Magnín' },
  { key: 'cercania', label: 'Cercanía', type: 'select', options: CERCANIA_OPTIONS, section: 'Magnín' },
  { key: 'circulo', label: 'Círculo', type: 'select', options: CIRCLE_OPTIONS, section: 'Magnín' },
  { key: 'contexto', label: 'Contexto', type: 'text', section: 'Magnín' },
  { key: 'ubicacion', label: 'Ubicación', type: 'text', section: 'Magnín' },
  { key: 'es_estrategico', label: '¿Estratégico?', type: 'boolean', section: 'Magnín' },
  { key: 'es_influyente', label: '¿Influyente?', type: 'boolean', section: 'Magnín' },
  { key: 'es_mentor', label: '¿Mentor?', type: 'boolean', section: 'Magnín' },
]

export function ContactDataTab({ contact }: ContactDataTabProps) {
  const { updateContact } = useContactStore()

  const handleSave = (key: keyof Contact, value: string | number | boolean | null) => {
    updateContact(contact.id, { [key]: value } as Partial<Contact>)
  }

  const sections = [...new Set(FIELDS.map(f => f.section))]

  return (
    <div className="p-5 space-y-5">
      {sections.map(section => (
        <div key={section}>
          <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">{section}</h3>
          <div className="space-y-1">
            {FIELDS.filter(f => f.section === section).map(field => (
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
        </div>
      ))}

      {/* Notes (inline textarea) */}
      <div>
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Notas rápidas</h3>
        <textarea
          defaultValue={contact.notes ?? ''}
          onBlur={(e) => handleSave('notes', e.target.value || null)}
          rows={3}
          className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-700 outline-none resize-none border border-white/[0.06] focus:border-blue-500/30"
          placeholder="Notas sobre este contacto..."
        />
      </div>

      {/* Meta info */}
      <div className="text-[10px] text-zinc-700 space-y-1">
        <p>Creado: {contact.created_at ? new Date(contact.created_at).toLocaleDateString('es-AR') : '—'}</p>
        <p>Actualizado: {contact.updated_at ? new Date(contact.updated_at).toLocaleDateString('es-AR') : '—'}</p>
      </div>
    </div>
  )
}
