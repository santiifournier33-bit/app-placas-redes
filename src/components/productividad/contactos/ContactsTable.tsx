'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronUp, ChevronDown, ExternalLink, Phone, MessageSquare, Check, Copy } from 'lucide-react'
import {
  useContactStore,
  type Contact,
} from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { EditableCell } from './EditableCell'
import { InlineSelectChip } from './InlineSelectChip'
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
      className="group inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[11px] cursor-pointer max-w-full"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check size={11} className="text-emerald-400 shrink-0" />
      ) : (
        <Copy size={11} className="text-zinc-500 opacity-0 group-hover:opacity-100 shrink-0" />
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const pipeline = pipelines.find(p => p.id === activePipelineId)
  const stages = pipeline ? [...pipeline.stages].sort((a, b) => a.position - b.position) : []
  const kanbanEntry = kanbanContacts.find(k => k.id === contact.id && k.pipelineId === activePipelineId)
  const currentStage = stages.find(s => s.id === kanbanEntry?.stageId)

  useEffect(() => {
    if (!open) return
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left })
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (!buttonRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false)
    }
    const scroll = () => setOpen(false)
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', scroll)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', scroll)
    }
  }, [open])

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
    return <span className="text-[11px] text-zinc-700 px-1">—</span>
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] cursor-pointer max-w-full"
        style={
          currentStage
            ? { background: `${currentStage.color}26`, color: currentStage.color || '#a3a3a3' }
            : { background: 'rgba(255,255,255,0.04)', color: '#71717a' }
        }
      >
        <span className="truncate">{currentStage?.name || 'Sin etapa'}</span>
        <ChevronDown size={10} className="shrink-0" />
      </button>
      {open && pos && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-[#1e1e2c] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 min-w-[180px] max-h-72 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {stages.map(stage => {
            const isSelected = stage.id === currentStage?.id
            const c = stage.color || '#3b82f6'
            return (
              <button
                key={stage.id}
                onClick={(e) => handleSelect(stage.id, e)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{ background: `${c}26`, color: c }}
                >
                  {stage.name}
                </span>
                {isSelected && (
                  <span className="ml-auto text-zinc-400 text-xs">✓</span>
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}

export function ContactsTable({ contacts, onSelectContact, selectedId }: ContactsTableProps) {
  const { updateContact } = useContactStore()
  const [sortKey, setSortKey] = useState<SortKey>('full_name' as unknown as SortKey)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('contacts-hidden-cols') : null
    return stored ? new Set(JSON.parse(stored)) : new Set<string>()
  })
  const [showColPicker, setShowColPicker] = useState(false)

  const visibleCols = ALL_COLUMNS.filter(c => !hiddenCols.has(c.key))

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
          onClick={() => setShowColPicker(!showColPicker)}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          Columnas ({visibleCols.length}/{ALL_COLUMNS.length})
        </button>
        {showColPicker && (
          <div className="absolute right-4 top-10 z-30 bg-[#1e1e2c] rounded-xl border border-white/[0.08] shadow-xl p-3 w-52 max-h-80 overflow-y-auto">
            {ALL_COLUMNS.map(col => (
              <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hiddenCols.has(col.key)}
                  onChange={() => toggleCol(col.key)}
                  className="accent-blue-500"
                />
                <span className="text-xs text-zinc-400">{col.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-[#12121a]">
            <tr className="border-b border-white/[0.06]">
              {visibleCols.map((col, idx) => (
                <th
                  key={col.key}
                  className={`text-left px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider ${col.width} ${
                    col.sortable ? 'cursor-pointer hover:text-zinc-300 select-none' : ''
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
              <th className="w-20 px-2 py-2.5 font-semibold text-zinc-500 uppercase tracking-wider">Acc.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(contact => (
              <tr
                key={contact.id}
                onClick={() => onSelectContact(contact)}
                className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group cursor-pointer ${
                  selectedId === contact.id ? 'bg-blue-500/[0.06] border-l-2 border-l-blue-500/50' : ''
                }`}
              >
                {visibleCols.map((col, idx) => (
                  <td key={col.key} className={`px-1 py-0.5 ${col.width} ${idx === 0 ? 'sticky left-0 z-[5] bg-[#14141e]' : ''}`}>
                    {col.key === 'full_name' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectContact(contact) }}
                        className="px-1 text-left text-xs text-shell-text hover:underline cursor-pointer truncate block w-full"
                      >
                        {`${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || '—'}
                      </button>
                    ) : col.key === 'tags' ? (
                      <div className="flex gap-1 flex-wrap px-1">
                        {(contact.tags ?? []).map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{tag}</span>
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
                      className="p-1.5 hover:bg-white/[0.06] rounded cursor-pointer"
                      title="Detalle"
                    >
                      <ExternalLink size={13} className="text-zinc-500" />
                    </button>
                    {contact.primary_phone && (
                      <>
                        <a href={`tel:${contact.primary_phone}`} className="p-1.5 hover:bg-white/[0.06] rounded">
                          <Phone size={13} className="text-zinc-500" />
                        </a>
                        <a
                          href={`https://wa.me/${contact.primary_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener"
                          className="p-1.5 hover:bg-white/[0.06] rounded"
                        >
                          <MessageSquare size={13} className="text-zinc-500" />
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
            <p className="text-zinc-600 text-sm">Sin contactos</p>
          </div>
        )}
      </div>
    </div>
  )
}
