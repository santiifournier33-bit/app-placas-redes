'use client'

import { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ChevronDown, Download, Upload, Table2, LayoutGrid, MoreHorizontal, Check } from 'lucide-react'
import { PortalDropdown } from '@/components/ui/PortalDropdown'
import {
  useContactStore,
  SOURCE_OPTIONS, SOURCE_LABELS,
  type Contact, type Source, type Category,
} from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { ContactsTable } from '@/components/productividad/contactos/ContactsTable'
import { ContactsCards } from '@/components/productividad/contactos/ContactsCards'
import { AddContactPanel } from '@/components/productividad/contactos/AddContactPanel'
import { ImportCSVModal } from '@/components/productividad/contactos/ImportCSVModal'
import { exportContactsCSV } from '@/lib/csv/export'

type ViewMode = 'table' | 'cards'

export default function ContactosPage() {
  const router = useRouter()
  // Filtros persistentes entre sesiones (localStorage). Mismo patrón que columnas en ContactsTable.
  const persisted = (() => {
    if (typeof window === 'undefined') return null
    try { return JSON.parse(localStorage.getItem('contacts-filters') ?? 'null') } catch { return null }
  })()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [filterSource, setFilterSource] = useState<Source | 'all'>(persisted?.source ?? 'all')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>(persisted?.category ?? 'all')
  const [filterCirculo, setFilterCirculo] = useState<string>(persisted?.circulo ?? 'all')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const moreBtnRef = useRef<HTMLButtonElement>(null)

  const openContact = (c: Contact) => router.push(`/productividad/contactos/${c.id}`)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'cards'
    return 'table'
  })

  const { contacts, init, addContact, deleteContact, fetchKanban } = useContactStore()
  const pipelinesStore = usePipelinesStore()
  const { activePipelineId } = usePipelinesStore()

  useEffect(() => {
    init()
    pipelinesStore.init()
  }, [])

  useEffect(() => {
    if (activePipelineId) fetchKanban(activePipelineId)
  }, [activePipelineId])

  // Wire mobile ContextualFAB (fab:new-contact) to open the add panel.
  useEffect(() => {
    const open = () => setShowForm(true)
    window.addEventListener("fab:new-contact", open)
    return () => window.removeEventListener("fab:new-contact", open)
  }, [])

  // Persistir filtros entre sesiones.
  useEffect(() => {
    try {
      localStorage.setItem('contacts-filters', JSON.stringify({
        source: filterSource, category: filterCategory, circulo: filterCirculo,
      }))
    } catch { /* storage lleno/no disponible: no crítico */ }
  }, [filterSource, filterCategory, filterCirculo])

  const filtered = useMemo(() => {
    return contacts
      .filter(c => {
        if (deferredSearch) {
          const q = deferredSearch.toLowerCase()
          const match =
            `${c.first_name} ${c.last_name ?? ''}`.toLowerCase().includes(q) ||
            (c.primary_phone ?? '').includes(q) ||
            (c.primary_email ?? '').toLowerCase().includes(q) ||
            (c.rol ?? '').toLowerCase().includes(q) ||
            (c.contexto ?? '').toLowerCase().includes(q)
          if (!match) return false
        }
        if (filterSource !== 'all' && c.source !== filterSource) return false
        if (filterCategory !== 'all' && c.category !== filterCategory) return false
        if (filterCirculo !== 'all' && c.circulo !== filterCirculo) return false
        return true
      })
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
  }, [contacts, deferredSearch, filterSource, filterCategory, filterCirculo])

  if (!useContactStore.getState().initialized) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-10 bg-surface-overlay rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border-subtle space-y-2 shrink-0">
        {/* Top row: count + actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted mr-auto">
            {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== contacts.length && ` de ${contacts.length}`}
          </span>

          {/* View toggle — desktop only (mobile is cards-only) */}
          <div className="hidden md:flex items-center bg-surface-overlay rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded cursor-pointer ${viewMode === 'table' ? 'bg-surface-overlay-hover text-text-secondary' : 'text-text-muted'}`}
              title="Tabla"
            >
              <Table2 size={14} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded cursor-pointer ${viewMode === 'cards' ? 'bg-surface-overlay-hover text-text-secondary' : 'text-text-muted'}`}
              title="Cards"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {/* Desktop inline actions */}
          <button
            onClick={() => setShowImport(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
            title="Importar CSV"
          >
            <Upload size={13} /> Importar
          </button>
          <button
            onClick={() => exportContactsCSV(filtered)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
            title="Exportar CSV"
          >
            <Download size={13} /> Exportar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer"
          >
            <Plus size={13} /> Nuevo
          </button>

          {/* Mobile overflow — secondary actions (alta = FAB) */}
          <button
            ref={moreBtnRef}
            onClick={() => setShowMore(o => !o)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
            aria-label="Más acciones"
          >
            <MoreHorizontal size={18} />
          </button>
          <PortalDropdown
            anchorRef={moreBtnRef}
            open={showMore}
            onClose={() => setShowMore(false)}
            placement="bottom-end"
            className="bg-[#1e1e2c] border border-border-default rounded-xl shadow-2xl p-1.5"
            minWidth={168}
          >
            <button
              onClick={() => { setShowImport(true); setShowMore(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-text-secondary hover:bg-surface-overlay cursor-pointer text-left"
            >
              <Upload size={15} /> Importar CSV
            </button>
            <button
              onClick={() => { exportContactsCSV(filtered); setShowMore(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-text-secondary hover:bg-surface-overlay cursor-pointer text-left"
            >
              <Download size={15} /> Exportar CSV
            </button>
          </PortalDropdown>
        </div>

        {/* Search — own full-width row */}
        <div className="flex items-center gap-2 bg-surface-overlay rounded-xl px-3 h-11 border border-border-subtle min-w-0">
          <Search size={15} className="text-text-muted shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, teléfono, email, rol..."
            className="flex-1 bg-transparent text-base md:text-sm text-text-primary placeholder:text-text-muted/50 outline-none"
          />
        </div>

        {/* Filters — own row */}
        <div className="flex gap-1.5 overflow-x-auto scroll-x-affordance">
            <FilterChip
              label="Origen"
              value={filterSource}
              options={[{ value: 'all', label: 'Todos' }, ...SOURCE_OPTIONS.map(s => ({ value: s, label: SOURCE_LABELS[s] }))]}
              onChange={v => setFilterSource(v as Source | 'all')}
            />
            <FilterChip
              label="Cat."
              value={filterCategory}
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'A', label: 'A' }, { value: 'B', label: 'B' },
                { value: 'C', label: 'C' }, { value: 'D', label: 'D' },
              ]}
              onChange={v => setFilterCategory(v as Category | 'all')}
            />
            <FilterChip
              label="Círculo"
              value={filterCirculo}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'principal', label: 'Principal' },
                { value: 'fundamental', label: 'Fundamental' },
                { value: 'vital', label: 'Vital' },
              ]}
              onChange={v => setFilterCirculo(v)}
            />
        </div>
      </div>

      {/* Content — clicking a contact navigates to full-page detail */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-[max(5rem,env(safe-area-inset-bottom))] md:pb-0">
          {viewMode === 'table' ? (
            <ContactsTable
              contacts={filtered}
              onSelectContact={openContact}
            />
          ) : (
            <ContactsCards
              contacts={filtered}
              onSelectContact={openContact}
            />
          )}
        </div>
      </div>

      {/* Right-side AddContact panel */}
      {showForm && (
        <AddContactPanel
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Import CSV modal */}
      {showImport && (
        <ImportCSVModal onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}

function FilterChip({ label, value, options, onChange }: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const active = value !== 'all'
  const current = options.find(o => o.value === value)

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg border cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
          active
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
            : 'border-border-subtle bg-surface-overlay text-text-secondary'
        }`}
      >
        <span>{active ? current?.label ?? label : label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PortalDropdown
        anchorRef={btnRef}
        open={open}
        onClose={() => setOpen(false)}
        className="bg-[#1e1e2c] border border-border-default rounded-xl shadow-2xl p-1.5 max-h-72 overflow-y-auto"
        minWidth={168}
      >
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false) }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer text-left transition-colors ${
              opt.value === value ? 'bg-surface-overlay-hover' : 'hover:bg-surface-overlay'
            }`}
          >
            <span className="text-xs text-text-secondary flex-1">{opt.label}</span>
            {opt.value === value && <Check size={13} className="text-blue-400 shrink-0" />}
          </button>
        ))}
      </PortalDropdown>
    </>
  )
}
