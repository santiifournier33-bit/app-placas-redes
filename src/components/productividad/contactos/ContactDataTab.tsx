'use client'

import { useContactStore, type Contact } from '@/lib/stores/contactStore'
import { EditableCell } from './EditableCell'
import { InlineSelectChip, type ChipColor } from './InlineSelectChip'
import {
  SOURCE_OPTIONS,
  CIRCLE_OPTIONS,
  CATEGORY_OPTIONS,
  TIPO_OPTIONS,
  CERCANIA_OPTIONS,
} from './options'

interface ContactDataTabProps {
  contact: Contact
}

interface ChipOption {
  value: string
  label: string
  color?: ChipColor
}

interface FieldDef {
  key: keyof Contact
  label: string
  type: 'text' | 'select' | 'boolean' | 'number' | 'date'
  options?: ChipOption[]
  numericValue?: boolean
}

const FIELDS: FieldDef[] = [
  { key: 'first_name',        label: 'Nombre',          type: 'text' },
  { key: 'last_name',         label: 'Apellido',        type: 'text' },
  { key: 'primary_phone',     label: 'Teléfono',        type: 'text' },
  { key: 'primary_email',     label: 'Email',           type: 'text' },
  { key: 'source',            label: 'Origen',          type: 'select', options: SOURCE_OPTIONS },
  { key: 'category',          label: 'Categoría',       type: 'select', options: CATEGORY_OPTIONS },
  { key: 'last_contact_date', label: 'Último contacto', type: 'date' },
  { key: 'rol',               label: 'Rol',             type: 'text' },
  { key: 'tipo',              label: 'Tipo',            type: 'select', options: TIPO_OPTIONS },
  { key: 'cercania',          label: 'Cercanía',        type: 'select', options: CERCANIA_OPTIONS, numericValue: true },
  { key: 'circulo',           label: 'Círculo',         type: 'select', options: CIRCLE_OPTIONS },
  { key: 'contexto',          label: 'Contexto',        type: 'text' },
  { key: 'ubicacion',         label: 'Ubicación',       type: 'text' },
  { key: 'es_estrategico',    label: '¿Estratégico?',   type: 'boolean' },
  { key: 'es_influyente',     label: '¿Influyente?',    type: 'boolean' },
  { key: 'es_mentor',         label: '¿Mentor?',        type: 'boolean' },
]

export function ContactDataTab({ contact }: ContactDataTabProps) {
  const { updateContact } = useContactStore()

  const handleSave = (key: keyof Contact, value: string | number | boolean | null) => {
    updateContact(contact.id, { [key]: value } as Partial<Contact>)
  }

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-xs md:text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Datos</h3>
      <div className="space-y-2">
        {FIELDS.map(field => {
          const raw = contact[field.key]

          if (field.type === 'select' && field.options) {
            const stringVal = raw != null ? String(raw) : null
            return (
              <div key={field.key} className="flex items-center gap-3">
                <span className="text-xs md:text-[11px] text-zinc-500 w-28 shrink-0">{field.label}</span>
                <div className="flex-1">
                  <InlineSelectChip
                    value={stringVal}
                    options={field.options}
                    onChange={(val) => {
                      if (field.numericValue) {
                        handleSave(field.key, val != null ? Number(val) : null)
                      } else {
                        handleSave(field.key, val)
                      }
                    }}
                  />
                </div>
              </div>
            )
          }

          return (
            <div key={field.key} className="flex items-center gap-3">
              <span className="text-xs md:text-[11px] text-zinc-500 w-28 shrink-0">{field.label}</span>
              <div className="flex-1">
                <EditableCell
                  value={raw as string | number | boolean | null}
                  type={field.type}
                  onSave={(val) => handleSave(field.key, val)}
                  className="text-xs"
                />
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
