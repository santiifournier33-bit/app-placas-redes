'use client'

import { useState, useMemo, useRef, useDeferredValue } from 'react'
import { ChevronUp, ChevronDown, ExternalLink, Phone, MessageSquare, Check, Copy } from 'lucide-react'
import {
  useContactStore,
  type Contact,
} from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { EditableCell } from './EditableCell'
import { InlineSelectChip } from './InlineSelectChip'
import { PortalDropdown } from '@/components/ui/PortalDropdown'
import {
  SOURCE_OPTIONS,
  CIRCLE_OPTIONS,
  CATEGORY_SHORT as CATEGORY_OPTIONS,
  TIPO_OPTIONS,
  CERCANIA_OPTIONS,
} from './options'

type SortKey = keyof Contact | null
type SortDir = 'asc' | 'desc'

interface Column {
  key: string
  label: string
  width: string
  sortable?: boolean
  visible?: boolean
}

const ALL_COLUMNS: Column[] = [
  { key: 'full_name', label: 'Nombre', width: 'w-56', sortable: true },
  { key: 'pipeline_stage', label: 'Pipeline', width: 'w-36' },
  { key: 'primary_phone', label: 'Teléfono', width: 'w-32' },
  { key: 'primary_email', label: 'Email', width: 'w-40' },
  { key: 'rol', label: 'Rol', width: 'w-28' },
  { key: 'tipo', label: 'Tipo', width: 'w-28' },
  { key: 'cercania', label: 'Cercanía', width: 'w-24' },
  { key: 'circulo', label: 'Círculo', width: 'w-28' },
  { key: 'contexto', label: 'Contexto', width: 'w-36' },
  { key: 'ubicacion', label: 'Ubicación', width: 'w-32' },
  { key: 'last_contact_date', label: 'Último contacto', width: 'w-32', sortable: true },
  { key: 'es_estrategico', label: 'Estratégico', width: 'w-24' },
  { key: 'es_influyente', label: 'Influyente', width: 'w-24' },
  { key: 'es_mentor', label: 'Mentor', width: 'w-20' },
  { key: 'category', label: 'Cat.', width: 'w-20' },
  { key: 'source', label: 'Origen', width: 'w-24' },
  { key: 'tags', label: 'Tags', width: 'w-32' },
]

// Columns that can never be hidden — the contact's name is the primary
// reference, so it stays pinned regardless of the picker.
const LOCKED_COLS = new Set<string>(['full_name'])

interface ContactsTableProps {
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
  selectedId?: string | null
}

function CopyChip({ value, kind }: { value: string; kind: 'phone' | 'email' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copiar ${kind === 'phone' ? 'teléfono' : 'email'}`}
      className="group inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-overlay hover:bg-surface-overlay-hover text-text-secondary text-xs md:text-[11px] cursor-pointer max-w-full"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check size={11} className="text-emerald-400 shrink-0" />
      ) : (
        <Copy size={11} className="text-text-muted opacity-0 group-hover:opacity-100 shrink-0" />
      )}
    </button>
  )
}

function PipelineStageCell({
  contact,
}: {
  contact: Contact
  onSelect: () => void
}) {
  const { activePipelineId, pipelines } = usePipelinesStore()
  const { kanbanContacts, moveToStage, addToPipeline, fetchKanban } = useContactStore()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const pipeline = pipelines.find(p => p.id === activePipelineId)
  const stages = pipeline ? [...pipeline.stages].sort((a, b) => a.position - b.position) : []
  const kanbanEntry = kanbanContacts.find(k => k.id === contact.id && k.pipelineId === activePipelineId)
  const currentStage = stages.find(s => s.id === kanbanEntry?.stageId)

  const handleSelect = async (stageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    if (!activePipelineId) return
    if (kanbanEntry) {
      await moveToStage(kanbanEntry.contactPipelineId, stageId)
    } else {
      await addToPipeline(contact.id, activePipelineId, stageId)
      await fetchKanban(activePipelineId)
    }
  }

  if (!pipeline) {
    return <span className="text-xs md:text-[11px] text-zinc-700 px-1">—</span>
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs md:text-[11px] cursor-pointer max-w-full"
        style={
          currentStage
            ? { background: `${currentStage.color}26`, color: currentStage.color || '#a3a3a3' }
            : { background: 'rgba(255,255,255,0.04)', color: '#71717a' }
        }
      >
        <span className="truncate">{currentStage?.name || 'Sin etapa'}</span>
        <ChevronDown size={10} className="shrink-0" />
      </button>
      <PortalDropdown
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
        className="bg-[#1e1e2c] border border-border-default rounded-xl shadow-2xl p-1.5 max-h-72 overflow-y-auto"
        minWidth={180}
      >
        {stages.map(stage => {
          const isSelected = stage.id === currentStage?.id
          const c = stage.color || '#3b82f6'
          return (
            <button
              key={stage.id}
              onClick={(e) => handleSelect(stage.id, e)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                isSelected ? 'bg-surface-overlay-hover' : 'hover:bg-surface-overlay'
              }`}
            >
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs md:text-[11px] font-medium"
                style={{ background: `${c}26`, color: c }}
              >
                {stage.name}
              </span>
              {isSelected && (
                <span className="ml-auto text-text-secondary text-xs">✓</span>
              )}
            </button>
          )
        })}
      </PortalDropdown>
    </>
  )
}

export function ContactsTable({ contacts, onSelectContact, selectedId }: ContactsTableProps) {
  const { updateContact } = useContactStore()
  const [sortKey, setSortKey] = useState<SortKey>('full_name' as unknown as SortKey)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('contacts-hidden-cols') : null
    const raw: string[] = stored ? JSON.parse(stored) : []
    // Drop any locked column persisted by an older config so it can't stay hidden.
    return new Set(raw.filter(k => !LOCKED_COLS.has(k)))
  })
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerBtnRef = useRef<HTMLButtonElement>(null)

  // Defer the heavy table re-render so toggling a column checkbox feels instant:
  // the picker reads `hiddenCols` (live) while the 1000-row table reads the
  // deferred value, letting React commit the table update in a non-blocking pass.
  const deferredHidden = useDeferredValue(hiddenCols)
  const visibleCols = useMemo(
    () => ALL_COLUMNS.filter(c => !deferredHidden.has(c.key)),
    [deferredHidden],
  )

  const sorted = useMemo(() => {
    if (!sortKey) return contacts
    return [...contacts].sort((a, b) => {
      let aVal: string
      let bVal: string
      if (sortKey === ('full_name' as unknown as SortKey)) {
        aVal = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim()
        bVal = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim()
      } else {
        aVal = String(a[sortKey] ?? '')
        bVal = String(b[sortKey] ?? '')
      }
      const cmp = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [contacts, sortKey, sortDir])

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key as SortKey)
      setSortDir('asc')
    }
  }

  const toggleCol = (key: string) => {
    if (LOCKED_COLS.has(key)) return
    setHiddenCols(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      localStorage.setItem('contacts-hidden-cols', JSON.stringify([...next]))
      return next
    })
  }

  const handleCellSave = (contactId: string, field: string, value: string | number | boolean | null) => {
    updateContact(contactId, { [field]: value } as Partial<Contact>)
  }

  const getCellType = (key: string): 'text' | 'select' | 'boolean' | 'number' | 'date' => {
    if (['es_estrategico', 'es_influyente', 'es_mentor'].includes(key)) return 'boolean'
    if (['source', 'circulo', 'category', 'tipo', 'cercania'].includes(key)) return 'select'
    if (key === 'last_contact_date') return 'date'
    return 'text'
  }

  const getCellOptions = (key: string) => {
    if (key === 'source') return SOURCE_OPTIONS
    if (key === 'circulo') return CIRCLE_OPTIONS
    if (key === 'category') return CATEGORY_OPTIONS
    if (key === 'tipo') return TIPO_OPTIONS
    if (key === 'cercania') return CERCANIA_OPTIONS
    return undefined
  }

  return (
    <div className="relative">
      {/* Column picker toggle */}
      <div className="flex justify-end px-4 py-2">
        <button
          ref={colPickerBtnRef}
          onClick={() => setShowColPicker(!showColPicker)}
          className="text-xs md:text-[11px] text-text-muted hover:text-text-secondary cursor-pointer"
        >
          Columnas ({visibleCols.length}/{ALL_COLUMNS.length})
        </button>
        <PortalDropdown
          anchorRef={colPickerBtnRef}
          open={showColPicker}
          onClose={() => setShowColPicker(false)}
          placement="bottom-end"
          className="bg-[#1e1e2c] border border-border-default rounded-xl shadow-2xl p-3 max-h-80 overflow-y-auto"
          minWidth={208}
        >
          {ALL_COLUMNS.map(col => {
            const locked = LOCKED_COLS.has(col.key)
            return (
              <label
                key={col.key}
                className={`flex items-center gap-2 py-1 ${locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input
                  type="checkbox"
                  checked={locked || !hiddenCols.has(col.key)}
                  disabled={locked}
                  onChange={() => toggleCol(col.key)}
                  className="accent-blue-500 disabled:opacity-60"
                />
                <span className={`text-xs ${locked ? 'text-text-muted' : 'text-text-secondary'}`}>
                  {col.label}{locked && ' (fija)'}
                </span>
              </label>
            )
          })}
        </PortalDropdown>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[#12121a]">
            <tr className="border-b border-border-subtle">
              {visibleCols.map((col, idx) => (
                <th
                  key={col.key}
                  className={`text-left px-2 py-2.5 font-semibold text-text-muted uppercase tracking-wider ${col.width} ${
                    col.sortable ? 'cursor-pointer hover:text-text-secondary select-none' : ''
                  } ${idx === 0 ? 'sticky left-0 z-20 bg-[#12121a]' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp size={12} />
                        : <ChevronDown size={12} />
                    )}
                  </div>
                </th>
              ))}
              <th className="w-20 px-2 py-2.5 font-semibold text-text-muted uppercase tracking-wider">Acc.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(contact => (
              <tr
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`border-b border-white/[0.03] hover:bg-surface-overlay transition-colors group cursor-pointer ${
                  selectedId === contact.id ? 'bg-blue-500/[0.06] border-l-2 border-l-blue-500/50' : ''
                }`}
              >
                {visibleCols.map((col, idx) => (
                  <td key={col.key} className={`px-1 py-0.5 ${col.width} ${idx === 0 ? 'sticky left-0 z-[5] bg-[#14141e]' : ''}`}>
                    {col.key === 'full_name' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectContact(contact) }}
                        className="px-1 text-left text-xs text-text-primary hover:underline cursor-pointer truncate block w-full"
                      >
                        {`${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || '—'}
                      </button>
                    ) : col.key === 'tags' ? (
                      <div className="flex gap-1 flex-wrap px-1">
                        {(contact.tags ?? []).map((tag, i) => (
                          <span key={i} className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-text-muted">{tag}</span>
                        ))}
                      </div>
                    ) : col.key === 'pipeline_stage' ? (
                      <div className="px-1">
                        <PipelineStageCell contact={contact} onSelect={() => onSelectContact(contact)} />
                      </div>
                    ) : col.key === 'primary_phone' && contact.primary_phone ? (
                      <div className="px-1"><CopyChip value={contact.primary_phone} kind="phone" /></div>
                    ) : col.key === 'primary_email' && contact.primary_email ? (
                      <div className="px-1"><CopyChip value={contact.primary_email} kind="email" /></div>
                    ) : col.key === 'source' ? (
                      <div className="px-1">
                        <InlineSelectChip
                          value={contact.source ?? null}
                          options={SOURCE_OPTIONS}
                          onChange={(v) => handleCellSave(contact.id, 'source', v)}
                        />
                      </div>
                    ) : col.key === 'category' ? (
                      <div className="px-1">
                        <InlineSelectChip
                          value={contact.category ?? null}
                          options={CATEGORY_OPTIONS}
                          onChange={(v) => handleCellSave(contact.id, 'category', v)}
                        />
                      </div>
                    ) : col.key === 'tipo' ? (
                      <div className="px-1">
                        <InlineSelectChip
                          value={contact.tipo ?? null}
                          options={TIPO_OPTIONS}
                          onChange={(v) => handleCellSave(contact.id, 'tipo', v)}
                        />
                      </div>
                    ) : col.key === 'cercania' ? (
                      <div className="px-1">
                        <InlineSelectChip
                          value={contact.cercania != null ? String(contact.cercania) : null}
                          options={CERCANIA_OPTIONS}
                          onChange={(v) => handleCellSave(contact.id, 'cercania', v != null ? Number(v) : null)}
                        />
                      </div>
                    ) : col.key === 'circulo' ? (
                      <div className="px-1">
                        <InlineSelectChip
                          value={contact.circulo ?? null}
                          options={CIRCLE_OPTIONS}
                          onChange={(v) => handleCellSave(contact.id, 'circulo', v)}
                        />
                      </div>
                    ) : (
                      <EditableCell
                        value={contact[col.key as keyof Contact] as string | number | boolean | null}
                        type={getCellType(col.key)}
                        options={getCellOptions(col.key)}
                        onSave={(val) => handleCellSave(contact.id, col.key, val)}
                        className="text-xs"
                      />
                    )}
                  </td>
                ))}
                <td className="px-1 py-0.5 w-20">
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onSelectContact(contact)}
                      className="p-1.5 hover:bg-surface-overlay-hover rounded cursor-pointer"
                      title="Detalle"
                    >
                      <ExternalLink size={13} className="text-text-muted" />
                    </button>
                    {contact.primary_phone && (
                      <>
                        <a href={`tel:${contact.primary_phone}`} className="p-1.5 hover:bg-surface-overlay-hover rounded">
                          <Phone size={13} className="text-text-muted" />
                        </a>
                        <a
                          href={`https://wa.me/${contact.primary_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener"
                          className="p-1.5 hover:bg-surface-overlay-hover rounded"
                        >
                          <MessageSquare size={13} className="text-text-muted" />
                        </a>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-text-muted text-sm">Sin contactos</p>
          </div>
        )}
      </div>
    </div>
  )
}
