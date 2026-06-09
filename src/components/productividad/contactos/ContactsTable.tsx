'use client'

import { useState, useMemo, useRef, useCallback, useDeferredValue } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronUp, ChevronDown, Check, Copy, GripVertical } from 'lucide-react'
import {
  useContactStore,
  type Contact,
} from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { EditableCell } from './EditableCell'
import { InlineSelectChip } from './InlineSelectChip'
import { PortalDropdown } from '@/components/ui/PortalDropdown'
import {
  PipelineStageCell,
  EMPTY_MEMBERSHIPS,
  type PipelineWithStages,
} from './PipelineStageControls'
import {
  CIRCLE_OPTIONS,
  CATEGORY_SHORT as CATEGORY_OPTIONS,
  TIPO_OPTIONS,
  CERCANIA_OPTIONS,
  FIELD_HINTS,
} from './options'

type SortKey = keyof Contact | null
type SortDir = 'asc' | 'desc'

interface Column {
  key: string
  label: string
  width: string
  sortable?: boolean
  visible?: boolean
  description?: string
}

// Orden por defecto (de fábrica). full_name va siempre 1ª y fija. El resto sigue
// este orden salvo que el usuario lo reordene por drag (se persiste en localStorage).
const ALL_COLUMNS: Column[] = [
  { key: 'full_name', label: 'Nombre', width: 'w-56', sortable: true, description: 'Nombre y apellido del contacto.' },
  { key: 'last_contact_date', label: 'Último contacto', width: 'w-32', sortable: true, description: FIELD_HINTS.last_contact_date },
  { key: 'primary_phone', label: 'Teléfono', width: 'w-32', description: FIELD_HINTS.primary_phone },
  { key: 'primary_email', label: 'Email', width: 'w-40', description: FIELD_HINTS.primary_email },
  { key: 'category', label: 'Cat.', width: 'w-20', description: FIELD_HINTS.category },
  { key: 'rol', label: 'Rol', width: 'w-28', description: FIELD_HINTS.rol },
  { key: 'tipo', label: 'Tipo', width: 'w-28', description: FIELD_HINTS.tipo },
  { key: 'cercania', label: 'Cercanía', width: 'w-24', description: FIELD_HINTS.cercania },
  { key: 'contexto', label: 'Contexto', width: 'w-36', description: FIELD_HINTS.contexto },
  { key: 'ubicacion', label: 'Ubicación', width: 'w-32', description: FIELD_HINTS.ubicacion },
  { key: 'pipeline_stage', label: 'Proceso comercial', width: 'w-44', description: FIELD_HINTS.pipeline_stage },
  { key: 'circulo', label: 'Círculo', width: 'w-28', description: FIELD_HINTS.circulo },
  { key: 'es_estrategico', label: 'Estratégico', width: 'w-24', description: FIELD_HINTS.es_estrategico },
  { key: 'es_influyente', label: 'Influyente', width: 'w-24', description: FIELD_HINTS.es_influyente },
  { key: 'es_mentor', label: 'Mentor', width: 'w-20', description: FIELD_HINTS.es_mentor },
]

const COLUMN_BY_KEY = new Map(ALL_COLUMNS.map(c => [c.key, c]))

// Columns that can never be hidden — the contact's name is the primary
// reference, so it stays pinned (and first) regardless of the picker/reorder.
const LOCKED_COLS = new Set<string>(['full_name'])

// Orden por defecto de las columnas reordenables (sin full_name, que va fija 1ª).
const DEFAULT_COL_ORDER = ALL_COLUMNS.filter(c => !LOCKED_COLS.has(c.key)).map(c => c.key)
// Set para validar membresía en sanitizeOrder.
const REORDERABLE_KEYS = DEFAULT_COL_ORDER
// v2: bump de clave → resetea el orden viejo guardado y aplica el nuevo default a todos.
const ORDER_STORAGE_KEY = 'contacts-col-order-v2'

// Sanitize a persisted order against the current schema: drop unknown keys
// (e.g. a removed `source`/`tags`) and append any new reorderable key not yet
// present, so the table never breaks when ALL_COLUMNS changes.
function sanitizeOrder(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? (raw as unknown[]).filter((k): k is string => typeof k === 'string') : []
  const known = arr.filter(k => REORDERABLE_KEYS.includes(k) && !LOCKED_COLS.has(k))
  const seen = new Set(known)
  for (const k of REORDERABLE_KEYS) if (!seen.has(k)) known.push(k)
  return known
}

interface ContactsTableProps {
  contacts: Contact[]
  onSelectContact: (contact: Contact) => void
  selectedId?: string | null
  // Selección (estado levantado a page.tsx, compartido con las cards mobile).
  selectMode: boolean
  selected: Set<string>
  onToggleSelect: (id: string) => void
  allSelected: boolean
  onToggleAll: (ids: string[]) => void
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

export function ContactsTable({
  contacts,
  onSelectContact,
  selectedId,
  selectMode,
  selected,
  onToggleSelect,
  allSelected,
  onToggleAll,
}: ContactsTableProps) {
  const { updateContact, moveToStage, addToPipeline, removeFromPipeline, pipelineMemberships } = useContactStore()
  const { pipelines } = usePipelinesStore()

  // Procesos comerciales leídos UNA vez (no por fila). La celda usa las membresías
  // del contacto (todos los procesos, no solo el activo) — lookup O(1) por contactId,
  // sin suscripción zustand por fila, clave para el scroll virtualizado.
  const pipelinesWithStages = pipelines as PipelineWithStages[]
  const handleAssign = useCallback(
    (contactId: string, pipelineId: string, stageId: string) => addToPipeline(contactId, pipelineId, stageId),
    [addToPipeline],
  )

  const [sortKey, setSortKey] = useState<SortKey>('full_name' as unknown as SortKey)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('contacts-hidden-cols') : null
    const raw: string[] = stored ? JSON.parse(stored) : []
    // Drop locked + unknown columns persisted by an older config.
    return new Set(raw.filter(k => !LOCKED_COLS.has(k) && COLUMN_BY_KEY.has(k)))
  })
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerBtnRef = useRef<HTMLButtonElement>(null)

  // Orden de columnas (D&D, persistido). full_name nunca entra: queda fija 1ª.
  const [colOrder, setColOrder] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [...REORDERABLE_KEYS]
    try { return sanitizeOrder(JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) ?? 'null')) }
    catch { return [...REORDERABLE_KEYS] }
  })
  const [dragKey, setDragKey] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const moveColumn = (from: string, to: string) => {
    if (from === to) return
    setColOrder(prev => {
      const next = prev.filter(k => k !== from)
      const idx = next.indexOf(to)
      if (idx === -1) return prev
      next.splice(idx, 0, from)
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  // Defer the heavy table re-render so toggling a column checkbox feels instant:
  // the picker reads `hiddenCols` (live) while the 1000-row table reads the
  // deferred value, letting React commit the table update in a non-blocking pass.
  const deferredHidden = useDeferredValue(hiddenCols)
  // Nombre fija primera + el resto en el orden elegido, filtrando ocultas.
  const visibleCols = useMemo(() => {
    const nameCol = COLUMN_BY_KEY.get('full_name')!
    const rest = colOrder
      .map(k => COLUMN_BY_KEY.get(k))
      .filter((c): c is Column => !!c && !deferredHidden.has(c.key))
    return [nameCol, ...rest]
  }, [colOrder, deferredHidden])

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

  const toggleSelectAll = () => onToggleAll(sorted.map(c => c.id))

  // Row virtualization: only the rows in view (+overscan) are mounted, so the
  // table stays at 60fps regardless of how many thousands of contacts load.
  const scrollRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 33,
    overscan: 12,
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
    if (['circulo', 'category', 'tipo', 'cercania'].includes(key)) return 'select'
    if (key === 'last_contact_date') return 'date'
    return 'text'
  }

  const getCellOptions = (key: string) => {
    if (key === 'circulo') return CIRCLE_OPTIONS
    if (key === 'category') return CATEGORY_OPTIONS
    if (key === 'tipo') return TIPO_OPTIONS
    if (key === 'cercania') return CERCANIA_OPTIONS
    return undefined
  }

  return (
    <div className="relative">
      {/* Toolbar: selector de columnas (la barra de acciones masivas vive en page.tsx) */}
      <div className="flex items-center justify-end px-4 py-2 gap-2 min-h-9">
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
              {visibleCols.map((col, idx) => {
                const reorderable = !LOCKED_COLS.has(col.key)
                const isDropTarget = reorderable && dragOverKey === col.key && dragKey !== col.key
                return (
                <th
                  key={col.key}
                  title={col.description}
                  draggable={reorderable}
                  onDragStart={reorderable ? (e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', col.key)
                    setDragKey(col.key)
                  } : undefined}
                  onDragOver={reorderable ? (e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (dragOverKey !== col.key) setDragOverKey(col.key)
                  } : undefined}
                  onDragLeave={reorderable ? () => setDragOverKey(k => (k === col.key ? null : k)) : undefined}
                  onDrop={reorderable ? (e) => {
                    e.preventDefault()
                    const from = e.dataTransfer.getData('text/plain')
                    if (from) moveColumn(from, col.key)
                    setDragKey(null); setDragOverKey(null)
                  } : undefined}
                  onDragEnd={() => { setDragKey(null); setDragOverKey(null) }}
                  className={`group/th text-left px-2 py-2.5 font-semibold text-text-muted uppercase tracking-wider ${col.width} ${
                    col.sortable ? 'cursor-pointer hover:text-text-secondary select-none' : ''
                  } ${reorderable ? 'cursor-grab active:cursor-grabbing' : ''} ${
                    idx === 0 ? 'sticky left-0 z-20 bg-[#12121a]' : ''
                  } ${dragKey === col.key ? 'opacity-40' : ''} ${
                    isDropTarget ? 'border-l-2 border-l-blue-500' : ''
                  }`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {idx === 0 && selectMode && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        onClick={e => e.stopPropagation()}
                        title="Seleccionar todo"
                        className="accent-blue-500 cursor-pointer shrink-0"
                      />
                    )}
                    {reorderable && (
                      <GripVertical size={11} className="shrink-0 text-text-muted/40 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                    )}
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp size={12} />
                        : <ChevronDown size={12} />
                    )}
                  </div>
                </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr aria-hidden="true"><td colSpan={visibleCols.length} style={{ height: paddingTop }} /></tr>
            )}
            {virtualRows.map(vr => {
              const contact = sorted[vr.index]
              return (
              <tr
                key={contact.id}
                data-index={vr.index}
                style={{ height: 33 }}
                onClick={() => (selectMode ? onToggleSelect(contact.id) : onSelectContact(contact))}
                className={`border-b border-white/[0.03] hover:bg-surface-overlay transition-colors group cursor-pointer ${
                  selectedId === contact.id ? 'bg-blue-500/[0.06] border-l-2 border-l-blue-500/50' : ''
                } ${selectMode && selected.has(contact.id) ? 'bg-blue-500/[0.08]' : ''}`}
              >
                {visibleCols.map((col, idx) => (
                  <td key={col.key} className={`px-1 py-0.5 ${col.width} ${idx === 0 ? 'sticky left-0 z-[5] bg-[#14141e]' : ''}`}>
                    {col.key === 'full_name' ? (
                      <div className="flex items-center gap-1.5">
                        {selectMode && (
                          <input
                            type="checkbox"
                            checked={selected.has(contact.id)}
                            onChange={() => onToggleSelect(contact.id)}
                            onClick={e => e.stopPropagation()}
                            className="accent-blue-500 cursor-pointer shrink-0"
                          />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); selectMode ? onToggleSelect(contact.id) : onSelectContact(contact) }}
                          className="px-1 text-left text-xs text-text-primary hover:underline cursor-pointer truncate block min-w-0 flex-1"
                        >
                          {`${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || '—'}
                        </button>
                      </div>
                    ) : col.key === 'pipeline_stage' ? (
                      <div className="px-1">
                        <PipelineStageCell
                          pipelines={pipelinesWithStages}
                          memberships={pipelineMemberships.get(contact.id) ?? EMPTY_MEMBERSHIPS}
                          onAssign={(pipelineId, stageId) => handleAssign(contact.id, pipelineId, stageId)}
                          onMove={(contactPipelineId, stageId) => moveToStage(contactPipelineId, stageId)}
                          onRemove={(contactPipelineId) => removeFromPipeline(contactPipelineId)}
                        />
                      </div>
                    ) : col.key === 'primary_phone' && contact.primary_phone ? (
                      <div className="px-1"><CopyChip value={contact.primary_phone} kind="phone" /></div>
                    ) : col.key === 'primary_email' && contact.primary_email ? (
                      <div className="px-1"><CopyChip value={contact.primary_email} kind="email" /></div>
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
              </tr>
              )
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true"><td colSpan={visibleCols.length} style={{ height: paddingBottom }} /></tr>
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
