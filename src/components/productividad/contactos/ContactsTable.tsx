'use client'

import { useState, useMemo, useRef, useCallback, useDeferredValue } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronUp, ChevronDown, ExternalLink, Phone, MessageSquare, Check, Copy, Download, Trash2, X } from 'lucide-react'
import {
  useContactStore,
  type Contact,
  type KanbanContact,
} from '@/lib/stores/contactStore'
import { exportContactsCSV } from '@/lib/csv/export'
import { notify } from '@/lib/stores/toastStore'
import { usePipelinesStore, type PipelineStage } from '@/lib/stores/pipelinesStore'
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

// Presentational only: stages + current stage come from the parent (read once
// from the stores), so 1000s of rows don't each subscribe two zustand stores.
function PipelineStageCell({
  hasPipeline,
  stages,
  currentStage,
  onSelectStage,
}: {
  hasPipeline: boolean
  stages: PipelineStage[]
  currentStage: PipelineStage | undefined
  onSelectStage: (stageId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleSelect = (stageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
    onSelectStage(stageId)
  }

  if (!hasPipeline) {
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
  const { updateContact, deleteContact, kanbanContacts, moveToStage, addToPipeline, fetchKanban } = useContactStore()
  const { activePipelineId, pipelines } = usePipelinesStore()

  // Pipeline data read ONCE here (not per row). Build the stage list and a
  // contactId -> kanban entry map so each row is a cheap O(1) lookup with no
  // store subscription of its own — critical for smooth virtualized scroll.
  const activePipeline = pipelines.find(p => p.id === activePipelineId)
  const pipelineStages = useMemo(
    () => (activePipeline ? [...activePipeline.stages].sort((a, b) => a.position - b.position) : []),
    [activePipeline],
  )
  const kanbanByContact = useMemo(() => {
    const m = new Map<string, KanbanContact>()
    for (const k of kanbanContacts) {
      if (k.pipelineId === activePipelineId) m.set(k.id, k)
    }
    return m
  }, [kanbanContacts, activePipelineId])
  const handleStageSelect = useCallback(
    async (contactId: string, stageId: string) => {
      if (!activePipelineId) return
      const entry = kanbanByContact.get(contactId)
      if (entry) {
        await moveToStage(entry.contactPipelineId, stageId)
      } else {
        await addToPipeline(contactId, activePipelineId, stageId)
        await fetchKanban(activePipelineId)
      }
    },
    [activePipelineId, kanbanByContact, moveToStage, addToPipeline, fetchKanban],
  )

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

  // F7: selección múltiple para acciones masivas (exportar / eliminar).
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const clearSelection = () => setSelected(new Set())

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

  const allSelected = sorted.length > 0 && sorted.every(c => selected.has(c.id))
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(sorted.map(c => c.id)))
  }
  const handleBulkExport = () => {
    const rows = sorted.filter(c => selected.has(c.id))
    exportContactsCSV(rows)
    notify(`${rows.length} contacto${rows.length !== 1 ? 's' : ''} exportado${rows.length !== 1 ? 's' : ''}`, 'info')
  }
  const handleBulkDelete = async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    if (!confirm(`¿Eliminar ${ids.length} contacto${ids.length !== 1 ? 's' : ''}? Esta acción se puede revertir desde la base.`)) return
    for (const id of ids) await deleteContact(id)
    clearSelection()
    notify(`${ids.length} contacto${ids.length !== 1 ? 's' : ''} eliminado${ids.length !== 1 ? 's' : ''}`)
  }

  // Row virtualization: only the rows in view (+overscan) are mounted, so the
  // table stays at 60fps regardless of how many thousands of contacts load.
  // Scroll happens in our own bounded container (scrollRef) for deterministic
  // measurement independent of the parent layout.
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 33,
    overscan: 12,
    // Keyed by contact id so re-sorts/filters don't scramble measured sizes.
    getItemKey: (index) => sorted[index]?.id ?? index,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0

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
      {/* Toolbar: acciones masivas (izq, si hay selección) + selector de columnas (der) */}
      <div className="flex items-center justify-between px-4 py-2 gap-2 min-h-9">
        {selected.size > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">{selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
            <button
              onClick={handleBulkExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
            >
              <Download size={13} /> Exportar
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 cursor-pointer"
            >
              <Trash2 size={13} /> Eliminar
            </button>
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-muted hover:bg-surface-overlay-hover cursor-pointer"
            >
              <X size={13} /> Limpiar
            </button>
          </div>
        ) : <span />}
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

      {/* Table — own bounded scroll container so row virtualization is
          deterministic and the sticky header sticks within it. */}
      <div ref={scrollRef} className="overflow-auto h-[calc(100dvh-12rem)]">
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
                  <div className="flex items-center gap-1.5">
                    {idx === 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        onClick={e => e.stopPropagation()}
                        title="Seleccionar todo"
                        className="accent-blue-500 cursor-pointer shrink-0"
                      />
                    )}
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp size={12} />
                        : <ChevronDown size={12} />
                    )}
                  </div>
                </th>
              ))}
              <th className="w-20 px-2 py-2.5 font-semibold text-text-muted uppercase tracking-wider sticky right-0 z-20 bg-[#12121a]">Acc.</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true"><td colSpan={visibleCols.length + 1} style={{ height: paddingTop }} /></tr>
            )}
            {virtualRows.map(vr => {
              const contact = sorted[vr.index]
              return (
              <tr
                key={contact.id}
                data-index={vr.index}
                style={{ height: 33 }}
                onClick={() => onSelectContact(contact)}
                className={`border-b border-white/[0.03] hover:bg-surface-overlay transition-colors group cursor-pointer ${
                  selectedId === contact.id ? 'bg-blue-500/[0.06] border-l-2 border-l-blue-500/50' : ''
                }`}
              >
                {visibleCols.map((col, idx) => (
                  <td key={col.key} className={`px-1 py-0.5 ${col.width} ${idx === 0 ? 'sticky left-0 z-[5] bg-[#14141e]' : ''}`}>
                    {col.key === 'full_name' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selected.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                          onClick={e => e.stopPropagation()}
                          className="accent-blue-500 cursor-pointer shrink-0"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectContact(contact) }}
                          className="px-1 text-left text-xs text-text-primary hover:underline cursor-pointer truncate block min-w-0 flex-1"
                        >
                          {`${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || '—'}
                        </button>
                      </div>
                    ) : col.key === 'tags' ? (
                      <div className="flex gap-1 flex-wrap px-1">
                        {(contact.tags ?? []).map((tag, i) => (
                          <span key={i} className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-text-muted">{tag}</span>
                        ))}
                      </div>
                    ) : col.key === 'pipeline_stage' ? (
                      <div className="px-1">
                        <PipelineStageCell
                          hasPipeline={!!activePipeline}
                          stages={pipelineStages}
                          currentStage={pipelineStages.find(s => s.id === kanbanByContact.get(contact.id)?.stageId)}
                          onSelectStage={(stageId) => handleStageSelect(contact.id, stageId)}
                        />
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
                <td className="px-1 py-0.5 w-20 sticky right-0 z-[5] bg-[#14141e]">
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
              )
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true"><td colSpan={visibleCols.length + 1} style={{ height: paddingBottom }} /></tr>
            )}
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
