'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, ChevronDown, Download, Upload, Table2, LayoutGrid } from 'lucide-react'
import {
  useContactStore,
  SOURCE_OPTIONS, SOURCE_LABELS,
  type Contact, type Source, type Category,
} from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { ContactsTable } from '@/components/productividad/contactos/ContactsTable'
import { ContactsCards } from '@/components/productividad/contactos/ContactsCards'
import { ImportCSVModal } from '@/components/productividad/contactos/ImportCSVModal'
import { exportContactsCSV } from '@/lib/csv/export'

type ViewMode = 'table' | 'cards'

export default function ContactosPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState<Source | 'all'>('all')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')
  const [filterCirculo, setFilterCirculo] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)

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

  const filtered = useMemo(() => {
    return contacts
      .filter(c => {
        if (search) {
          const q = search.toLowerCase()
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
  }, [contacts, search, filterSource, filterCategory, filterCirculo])

  if (!useContactStore.getState().initialized) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-10 bg-white/[0.04] rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-white/[0.04] space-y-2 shrink-0">
        {/* Top row: count + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-500 mr-auto">
            {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== contacts.length && ` de ${contacts.length}`}
          </span>

          {/* View toggle (mobile only show both, desktop default table) */}
          <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded cursor-pointer ${viewMode === 'table' ? 'bg-white/[0.08] text-zinc-300' : 'text-zinc-600'}`}
              title="Tabla"
            >
              <Table2 size={14} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded cursor-pointer ${viewMode === 'cards' ? 'bg-white/[0.08] text-zinc-300' : 'text-zinc-600'}`}
              title="Cards"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.06] cursor-pointer"
            title="Importar CSV"
          >
            <Upload size={13} /> Importar
          </button>
          <button
            onClick={() => exportContactsCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.06] cursor-pointer"
            title="Exportar CSV"
          >
            <Download size={13} /> Exportar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer"
          >
            <Plus size={13} /> Nuevo
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-2 border border-white/[0.06] flex-1 min-w-0">
            <Search size={14} className="text-zinc-600 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre, teléfono, email, rol, contexto..."
              className="flex-1 bg-transparent text-xs text-shell-text placeholder:text-zinc-700 outline-none"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
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
      </div>

      {/* Content — clicking a contact navigates to full-page detail */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
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

      {/* Quick add modal */}
      {showForm && (
        <ContactFormModal
          onSave={async (data) => {
            const result = await addContact(data)
            if (result) {
              setShowForm(false)
            } else {
              alert('No se pudo crear el contacto. Verificá tu sesión e intentá nuevamente.')
            }
          }}
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
  const active = value !== 'all'
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`appearance-none text-[11px] font-medium px-2.5 py-1.5 pr-6 rounded-lg border cursor-pointer outline-none transition-all [color-scheme:dark] ${
          active
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
            : 'border-white/[0.06] bg-white/[0.04] text-zinc-400'
        }`}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{label}: {opt.label}</option>
        ))}
      </select>
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
    </div>
  )
}

function ContactFormModal({
  onSave, onClose,
}: {
  onSave: (data: Partial<Contact> & { first_name: string }) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    primary_phone: '',
    primary_email: '',
    source: 'otro',
  })
  const [duplicate, setDuplicate] = useState<Contact | undefined>(undefined)
  const findDuplicate = useContactStore(s => s.findDuplicate)

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const checkDuplicate = (phone: string, email: string) => {
    setDuplicate(findDuplicate(phone, email))
  }

  const handleSave = () => {
    if (!form.first_name.trim()) return
    onSave(form as Partial<Contact> & { first_name: string })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a24] rounded-t-2xl lg:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-shell-text">Nuevo contacto</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer">
            <span className="text-zinc-400 text-lg leading-none">&times;</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {duplicate && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-bold text-amber-400">
                Ya existe: {duplicate.first_name} {duplicate.last_name}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {duplicate.primary_phone || duplicate.primary_email}
              </p>
            </div>
          )}
          <FormInput label="Nombre *" value={form.first_name} onChange={v => set('first_name', v)} />
          <FormInput label="Apellido" value={form.last_name} onChange={v => set('last_name', v)} />
          <FormInput
            label="Teléfono"
            value={form.primary_phone}
            onChange={v => { set('primary_phone', v); checkDuplicate(v, form.primary_email) }}
            type="tel"
          />
          <FormInput
            label="Email"
            value={form.primary_email}
            onChange={v => { set('primary_email', v); checkDuplicate(form.primary_phone, v) }}
            type="email"
          />
          <div>
            <label className="text-[11px] text-zinc-500 font-medium block mb-1">Origen</label>
            <select
              value={form.source}
              onChange={e => set('source', e.target.value)}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none border border-white/[0.06] cursor-pointer [color-scheme:dark]"
            >
              {SOURCE_OPTIONS.map(s => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-zinc-400 hover:bg-white/[0.06] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 cursor-pointer"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function FormInput({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="text-[11px] text-zinc-500 font-medium block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30"
      />
    </div>
  )
}
