'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import {
  useContactStore,
  getLeadHealth,
  SOURCE_OPTIONS,
  SOURCE_LABELS,
  type KanbanContact,
  type Source,
  type HealthStatus,
} from '@/lib/stores/contactStore'
import { KanbanBoard } from '@/components/productividad/KanbanBoard'
import { PipelineSelector } from '@/components/productividad/negocios/PipelineSelector'

export default function NegociosPage() {
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState<Source | 'all'>('all')
  const [filterHealth, setFilterHealth] = useState<HealthStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState<KanbanContact | null>(null)

  const pipelinesStore = usePipelinesStore()
  const contactStore = useContactStore()

  const { pipelines, activePipelineId } = usePipelinesStore()

  const activePipeline = useMemo(
    () => pipelines.find(p => p.id === activePipelineId) ?? null,
    [pipelines, activePipelineId]
  )

  const activeStages = useMemo(
    () => activePipeline ? [...activePipeline.stages].sort((a, b) => a.position - b.position) : [],
    [activePipeline]
  )

  useEffect(() => {
    pipelinesStore.init()
    contactStore.init()
  }, [])

  useEffect(() => {
    if (activePipeline) {
      contactStore.fetchKanban(activePipeline.id)
    }
  }, [activePipeline?.id])

  useEffect(() => {
    if (!activePipeline) return

    const sb = createClient()
    const channel = sb
      .channel(`kanban-${activePipeline.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contact_pipelines',
        filter: `pipeline_id=eq.${activePipeline.id}`,
      }, () => {
        contactStore.fetchKanban(activePipeline.id)
      })
      .subscribe()

    return () => {
      sb.removeChannel(channel)
    }
  }, [activePipeline?.id])

  const filtered = useMemo(() => {
    return contactStore.kanbanContacts.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        const match =
          `${c.first_name} ${c.last_name ?? ''}`.toLowerCase().includes(q) ||
          (c.primary_phone ?? '').includes(q)
        if (!match) return false
      }
      if (filterSource !== 'all' && c.source !== filterSource) return false
      if (filterHealth !== 'all') {
        const stage = activeStages.find(s => s.id === c.stageId)
        if (getLeadHealth(c.lastPipelineActivity, stage) !== filterHealth) return false
      }
      return true
    })
  }, [contactStore.kanbanContacts, activeStages, search, filterSource, filterHealth])

  if (pipelinesStore.loading || !pipelinesStore.initialized) {
    return (
      <div className="p-6">
        <div className="animate-pulse flex gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-72 h-64 bg-white/[0.04] rounded-2xl shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (!activePipeline) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-zinc-500 text-sm">No hay pipelines configurados. Iniciá sesión para crear los pipelines por defecto.</p>
      </div>
    )
  }

  const activeFilters = [filterSource !== 'all', filterHealth !== 'all', search].filter(Boolean).length

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Pipeline selector + toolbar */}
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-white/[0.04] shrink-0">
        <PipelineSelector />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-3 py-1.5 border border-white/[0.06] flex-1 max-w-xs">
            <Search size={14} className="text-zinc-600 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lead..."
              className="flex-1 bg-transparent text-sm text-shell-text placeholder:text-zinc-700 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="cursor-pointer">
                <X size={14} className="text-zinc-500" />
              </button>
            )}
          </div>

          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as Source | 'all')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-400 cursor-pointer outline-none [color-scheme:dark]"
          >
            <option value="all">Origen: Todos</option>
            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
          </select>

          <select
            value={filterHealth}
            onChange={(e) => setFilterHealth(e.target.value as HealthStatus | 'all')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-400 cursor-pointer outline-none [color-scheme:dark]"
          >
            <option value="all">Salud: Todos</option>
            <option value="green">Verde</option>
            <option value="orange">Naranja</option>
            <option value="red">Rojo</option>
            <option value="gray">Gris</option>
          </select>

          <div className="flex-1" />

          <span className="text-xs text-zinc-600 tabular-nums">{filtered.length} leads</span>

          <button
            onClick={() => { setEditingContact(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo lead</span>
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-hidden pt-3">
        <KanbanBoard
          contacts={filtered}
          stages={activeStages}
          onDrop={contactStore.moveToStage}
          onTapContact={(contact) => { setEditingContact(contact); setShowForm(true) }}
        />
      </div>

      {/* Quick add/edit modal */}
      {showForm && (
        <QuickLeadModal
          contact={editingContact}
          stages={activeStages}
          pipelineId={activePipeline.id}
          onSave={async (data) => {
            if (editingContact) {
              await contactStore.updateContact(editingContact.id, data)
            } else {
              const firstStage = activeStages[0]
              if (firstStage) {
                const result = await contactStore.addContact(data, activePipeline.id, firstStage.id)
                if (!result) {
                  alert('No se pudo crear el lead. Verificá tu sesión e intentá nuevamente.')
                  return
                }
              }
            }
            await contactStore.fetchKanban(activePipeline.id)
            setShowForm(false)
            setEditingContact(null)
          }}
          onDelete={editingContact ? async () => {
            await contactStore.deleteContact(editingContact.id)
            setShowForm(false)
            setEditingContact(null)
          } : undefined}
          onClose={() => { setShowForm(false); setEditingContact(null) }}
        />
      )}
    </div>
  )
}

function QuickLeadModal({
  contact,
  stages,
  pipelineId,
  onSave,
  onDelete,
  onClose,
}: {
  contact: KanbanContact | null
  stages: { id: string; name: string; emoji: string | null }[]
  pipelineId: string
  onSave: (data: Partial<KanbanContact> & { first_name: string }) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const findDuplicate = useContactStore(s => s.findDuplicate)
  const [duplicate, setDuplicate] = useState<ReturnType<typeof findDuplicate>>(undefined)

  const [form, setForm] = useState({
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    primary_phone: contact?.primary_phone ?? '',
    primary_email: contact?.primary_email ?? '',
    source: contact?.source ?? 'otro',
    notes: contact?.notes ?? '',
    tags: contact?.tags ?? [],
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const checkDup = (phone: string, email: string) => {
    if (!contact) {
      const d = findDuplicate(phone, email)
      setDuplicate(d)
    }
  }

  const handleSave = () => {
    if (!form.first_name.trim()) return
    if (!form.primary_phone.trim() && !form.primary_email.trim()) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a24] rounded-t-2xl lg:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-shell-text">
            {contact ? `${contact.first_name} ${contact.last_name ?? ''}` : 'Nuevo lead'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {duplicate && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-bold text-amber-400">
                Ya existe: {duplicate.first_name} {duplicate.last_name}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 font-medium block mb-1">Nombre *</label>
              <input
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 font-medium block mb-1">Apellido</label>
              <input
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 font-medium block mb-1">Teléfono *</label>
            <input
              type="tel"
              value={form.primary_phone}
              onChange={(e) => { set('primary_phone', e.target.value); checkDup(e.target.value, form.primary_email) }}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 font-medium block mb-1">Email</label>
            <input
              type="email"
              value={form.primary_email}
              onChange={(e) => { set('primary_email', e.target.value); checkDup(form.primary_phone, e.target.value) }}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 font-medium block mb-1">Origen</label>
            <select
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-zinc-300 outline-none border border-white/[0.06] cursor-pointer [color-scheme:dark]"
            >
              {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 font-medium block mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text placeholder:text-zinc-700 outline-none resize-none border border-white/[0.06] focus:border-blue-500/30"
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06] flex gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 cursor-pointer"
            >
              Eliminar
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/[0.06] cursor-pointer"
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
