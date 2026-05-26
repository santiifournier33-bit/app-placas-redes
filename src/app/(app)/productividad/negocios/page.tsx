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
import { OpportunityDrawer } from '@/components/productividad/negocios/OpportunityDrawer'

export default function NegociosPage() {
  const [search, setSearch] = useState('')
  const [filterSource, setFilterSource] = useState<Source | 'all'>('all')
  const [filterHealth, setFilterHealth] = useState<HealthStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [viewingContact, setViewingContact] = useState<KanbanContact | null>(null)

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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-zinc-500 text-sm">No hay pipelines configurados.</p>
        <button
          onClick={async () => {
            await pipelinesStore.seedDefaultPipelines()
          }}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Crear pipelines por defecto
        </button>
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
            onClick={() => setShowForm(true)}
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
          onTapContact={(contact) => setViewingContact(contact)}
        />
      </div>

      {/* Quick add modal (new leads only) */}
      {showForm && (
        <QuickLeadModal
          stages={activeStages}
          pipelineId={activePipeline.id}
          onSave={async (data) => {
            const sb = createClient()
            await contactStore.updateContact(data.contactId, {
              primary_phone: data.primary_phone,
              primary_email: data.primary_email,
              notes: data.notes,
            })

            const { data: { user } } = await sb.auth.getUser()
            if (!user) {
              alert('Sesión expirada. Por favor, volvé a iniciar sesión.')
              return
            }

            // Check for duplicates
            const { data: existing } = await sb
              .from('contact_pipelines')
              .select('id')
              .eq('contact_id', data.contactId)
              .eq('pipeline_id', data.pipelineId)
              .eq('owner_id', user.id)
              .limit(1)

            if (existing && existing.length > 0) {
              alert('Este contacto ya se encuentra en este pipeline.')
              return
            }

            const { error } = await sb
              .from('contact_pipelines')
              .insert({
                contact_id: data.contactId,
                pipeline_id: data.pipelineId,
                stage_id: data.stageId,
                owner_id: user.id,
              })

            if (error) {
              console.error('Error adding to pipeline:', error)
              alert('No se pudo asociar el contacto al pipeline.')
              return
            }

            await contactStore.fetchKanban(activePipeline.id)
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Opportunity detail drawer */}
      {viewingContact && (
        <OpportunityDrawer
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
          onRemove={async () => {
            await contactStore.removeFromPipeline(viewingContact.contactPipelineId)
            setViewingContact(null)
          }}
        />
      )}
    </div>
  )
}

function QuickLeadModal({
  stages,
  pipelineId,
  onSave,
  onClose,
}: {
  stages: { id: string; name: string; emoji: string | null }[]
  pipelineId: string
  onSave: (data: {
    contactId: string
    pipelineId: string
    stageId: string
    primary_phone: string
    primary_email: string
    notes: string
  }) => void
  onClose: () => void
}) {
  const { contacts } = useContactStore()
  const { pipelines } = usePipelinesStore()

  const [selectedContactId, setSelectedContactId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Selected pipeline & stage
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(pipelineId)
  const [selectedStageId, setSelectedStageId] = useState<string>('')

  // Contact details
  const [primaryPhone, setPrimaryPhone] = useState<string>('')
  const [primaryEmail, setPrimaryEmail] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const pipelineStages = selectedPipeline
    ? [...selectedPipeline.stages].sort((a, b) => a.position - b.position)
    : []

  // Update selected stage when pipeline changes
  useEffect(() => {
    const firstStage = pipelineStages[0]?.id ?? ''
    setSelectedStageId(firstStage)
  }, [selectedPipelineId, pipelineStages.length])

  // Close suggestions on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowSuggestions(false)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    return contacts.filter(c => {
      const fullName = `${c.first_name} ${c.last_name ?? ''}`.toLowerCase()
      return fullName.includes(query)
    })
  }, [searchQuery, contacts])

  const handleSelectContact = (c: typeof contacts[0]) => {
    setSelectedContactId(c.id)
    setSearchQuery(`${c.first_name} ${c.last_name ?? ''}`.trim())
    setPrimaryPhone(c.primary_phone ?? '')
    setPrimaryEmail(c.primary_email ?? '')
    setNotes(c.notes ?? '')
    setShowSuggestions(false)
  }

  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setSelectedContactId('')
    setPrimaryPhone('')
    setPrimaryEmail('')
    setNotes('')
    setShowSuggestions(true)
  }

  const handleSave = () => {
    if (!selectedContactId) return
    if (!primaryPhone.trim()) return
    if (!selectedPipelineId || !selectedStageId) return

    onSave({
      contactId: selectedContactId,
      pipelineId: selectedPipelineId,
      stageId: selectedStageId,
      primary_phone: primaryPhone.trim(),
      primary_email: primaryEmail.trim(),
      notes: notes.trim(),
    })
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
            Nuevo lead
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Contact Search Field */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Nombre del contacto *</label>
            <div className="relative flex items-center">
              <input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar por nombre..."
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2.5 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30 disabled:opacity-60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedContactId('')
                    setPrimaryPhone('')
                    setPrimaryEmail('')
                    setNotes('')
                  }}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && searchQuery.trim() && !selectedContactId && (
              <div className="absolute left-0 right-0 mt-1 bg-[#1e1e2d] border border-white/[0.08] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-white/[0.04]">
                {filteredContacts.length === 0 ? (
                  <div className="p-3 text-xs text-zinc-500 text-center">
                    No se encontraron contactos.
                    <p className="mt-1 text-xs md:text-[10px] text-zinc-600">Creá el contacto en la sección de contactos primero.</p>
                  </div>
                ) : (
                  filteredContacts.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContact(c)}
                      className="w-full text-left px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors flex flex-col gap-0.5 cursor-pointer"
                    >
                      <span className="font-semibold">{c.first_name} {c.last_name ?? ''}</span>
                      <span className="text-zinc-500 text-xs md:text-[10px]">
                        📞 {c.primary_phone ?? 'Sin teléfono'} {c.primary_email ? `| ✉️ ${c.primary_email}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Phone & Email Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Teléfono *</label>
              <input
                type="tel" inputMode="tel"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder={selectedContactId ? "Obligatorio" : "Seleccioná contacto"}
                disabled={!selectedContactId}
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2.5 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Email</label>
              <input
                type="email" inputMode="email"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                placeholder={selectedContactId ? "Opcional" : "Seleccioná contacto"}
                disabled={!selectedContactId}
                className="w-full bg-white/[0.04] rounded-xl px-3 py-2.5 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Pipeline & Stage Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Pipeline</label>
              <select
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                className="w-full bg-[#1a1a24] rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none border border-white/[0.06] cursor-pointer [color-scheme:dark]"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Fase</label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full bg-[#1a1a24] rounded-xl px-3 py-2.5 text-sm text-zinc-300 outline-none border border-white/[0.06] cursor-pointer [color-scheme:dark]"
              >
                {pipelineStages.map(s => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes Selection */}
          <div>
            <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!selectedContactId}
              rows={2}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2.5 text-sm text-shell-text placeholder:text-zinc-700 outline-none resize-none border border-white/[0.06] focus:border-blue-500/30 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06] flex gap-2">
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/[0.06] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedContactId || !primaryPhone.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/40 disabled:text-white/40 cursor-pointer transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
