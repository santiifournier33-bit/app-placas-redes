'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ExternalLink, Phone, MessageSquare } from 'lucide-react'
import {
  useContactStore,
  SOURCE_LABELS,
  CIRCLE_LABELS,
  CATEGORY_LABELS,
  type Contact, type Source, type Circle, type Category,
} from '@/lib/stores/contactStore'
import { EditableCell } from './EditableCell'

type SortKey = keyof Contact | null
type SortDir = 'asc' | 'desc'

const SOURCE_OPTIONS = [
  { value: 'referido', label: 'Referido' },
  { value: 'portal', label: 'Portal' },
  { value: 'redes', label: 'Redes' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'otro', label: 'Otro' },
]

const CIRCLE_OPTIONS = [
  { value: 'principal', label: 'Principal' },
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'vital', label: 'Vital' },
]

const CATEGORY_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
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

interface Column {
  key: string
  label: string
  width: string
  sortable?: boolean
  visible?: boolean
}

const ALL_COLUMNS: Column[] = [
  { key: 'first_name', label: 'Nombre', width: 'w-40', sortable: true },
  { key: 'last_name', label: 'Apellido', width: 'w-32', sortable: true },
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

export function ContactsTable({ contacts, onSelectContact, selectedId }: ContactsTableProps) {
  const { updateContact } = useContactStore()
  const [sortKey, setSortKey] = useState<SortKey>('first_name')
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
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp = String(aVal).localeCompare(String(bVal), 'es', { sensitivity: 'base' })
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
                    {col.key === 'tags' ? (
                      <div className="flex gap-1 flex-wrap px-1">
                        {(contact.tags ?? []).map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{tag}</span>
                        ))}
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
