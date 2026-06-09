'use client'

import { useMemo, Fragment } from 'react'
import { Info } from 'lucide-react'
import { useContactStore, type Contact } from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { EditableCell } from './EditableCell'
import { InlineSelectChip, type ChipColor } from './InlineSelectChip'
import { InlineCreatableCombobox } from './InlineCreatableCombobox'
import { ContactProcessList, EMPTY_MEMBERSHIPS, type PipelineWithStages } from './PipelineStageControls'
import {
  CIRCLE_OPTIONS,
  CATEGORY_OPTIONS,
  TIPO_OPTIONS,
  CERCANIA_OPTIONS,
  FIELD_HINTS,
} from './options'

// Label con ícono de ayuda (tooltip nativo, hover/long-press) según FIELD_HINTS.
function FieldLabel({ label, fieldKey }: { label: string; fieldKey: string }) {
  const hint = FIELD_HINTS[fieldKey]
  return (
    <span className="flex items-center gap-1 text-xs md:text-[11px] text-text-muted w-28 shrink-0">
      {label}
      {hint && (
        <span title={hint} className="cursor-help inline-flex">
          <Info size={11} className="text-text-muted/50 shrink-0" />
        </span>
      )}
    </span>
  )
}

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

const CREATABLE_FIELDS = ['rol', 'contexto', 'ubicacion'] as const
type CreatableKey = typeof CREATABLE_FIELDS[number]

export function ContactDataTab({ contact }: ContactDataTabProps) {
  const { updateContact, contacts, pipelineMemberships, addToPipeline, moveToStage, removeFromPipeline } = useContactStore()
  const pipelines = usePipelinesStore(s => s.pipelines) as PipelineWithStages[]
  const memberships = pipelineMemberships.get(contact.id) ?? EMPTY_MEMBERSHIPS

  const creatableSuggestions = useMemo(() => ({
    rol:       [...new Set(contacts.map(c => c.rol).filter(Boolean) as string[])].sort(),
    contexto:  [...new Set(contacts.map(c => c.contexto).filter(Boolean) as string[])].sort(),
    ubicacion: [...new Set(contacts.map(c => c.ubicacion).filter(Boolean) as string[])].sort(),
  }), [contacts])

  const handleSave = (key: keyof Contact, value: string | number | boolean | null) => {
    updateContact(contact.id, { [key]: value } as Partial<Contact>)
  }

  return (
    <div className="p-5 space-y-4">
      <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-wider">Datos</h3>
      <div className="space-y-2">
        {FIELDS.map(field => {
          const raw = contact[field.key]

          const fieldRow = (() => {
          if (field.type === 'select' && field.options) {
            const stringVal = raw != null ? String(raw) : null
            return (
              <div key={field.key} className="flex items-center gap-3">
                <FieldLabel label={field.label} fieldKey={field.key as string} />
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

          if (CREATABLE_FIELDS.includes(field.key as CreatableKey)) {
            const stringVal = raw != null ? String(raw) : null
            return (
              <div key={field.key} className="flex items-center gap-3">
                <FieldLabel label={field.label} fieldKey={field.key as string} />
                <div className="flex-1">
                  <InlineCreatableCombobox
                    value={stringVal}
                    fieldKey={field.key}
                    suggestions={creatableSuggestions[field.key as CreatableKey]}
                    onChange={val => handleSave(field.key, val)}
                  />
                </div>
              </div>
            )
          }

          return (
            <div key={field.key} className="flex items-center gap-3">
              <span className="text-xs md:text-[11px] text-text-muted w-28 shrink-0">{field.label}</span>
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
          })()

          // "Proceso comercial" va como una variable más, justo debajo de "Último contacto".
          return (
            <Fragment key={field.key}>
              {fieldRow}
              {field.key === 'last_contact_date' && (
                <div className="flex items-start gap-3">
                  <FieldLabel label="Proceso comercial" fieldKey="pipeline_stage" />
                  <div className="flex-1 min-w-0">
                    <ContactProcessList
                      pipelines={pipelines}
                      memberships={memberships}
                      onAssign={(pipelineId, stageId) => addToPipeline(contact.id, pipelineId, stageId)}
                      onMove={(cpId, stageId) => moveToStage(cpId, stageId)}
                      onRemove={(cpId) => removeFromPipeline(cpId)}
                    />
                  </div>
                </div>
              )}
            </Fragment>
          )
        })}
      </div>

    </div>
  )
}
