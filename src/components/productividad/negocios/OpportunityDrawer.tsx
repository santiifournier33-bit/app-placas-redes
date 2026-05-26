'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Check,
  Copy,
  ExternalLink,
  Clock,
  Trash2,
  ChevronRight,
  Circle,
  Calendar,
  Flag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  useContactStore,
  getLeadHealth,
  getDaysSinceActivity,
  SOURCE_LABELS,
  type KanbanContact,
  type HealthStatus,
} from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { useTaskStore, TASK_TYPES, type TaskType } from '@/lib/stores/taskStore'
import { ContactDataTab } from '@/components/productividad/contactos/ContactDataTab'
import { ContactNotesTab } from '@/components/productividad/contactos/ContactNotesTab'
import { QuickAddTask } from '@/components/productividad/QuickAddTask'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/* ── Health styling maps ───────────────────────────────── */

const HEALTH_LABELS: Record<HealthStatus, string> = {
  green: 'En tiempo',
  orange: 'Por vencer',
  red: 'Vencido',
  gray: 'Sin SLA',
}

const HEALTH_BG: Record<HealthStatus, string> = {
  green: 'bg-emerald-500/15 text-emerald-400',
  orange: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
  gray: 'bg-zinc-500/15 text-text-muted',
}

const HEALTH_AVATAR: Record<HealthStatus, string> = {
  green: 'bg-emerald-500/15 text-emerald-400',
  orange: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
  gray: 'bg-blue-500/15 text-blue-400',
}

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-orange-400',
  3: 'text-blue-400',
  4: 'text-text-muted',
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(TASK_TYPES).map(([k, v]) => [k, v.label])
)

/* ── Props ─────────────────────────────────────────────── */

interface OpportunityDrawerProps {
  contact: KanbanContact
  onClose: () => void
  onRemove: () => void
}

/* ── Component ─────────────────────────────────────────── */

export function OpportunityDrawer({ contact, onClose, onRemove }: OpportunityDrawerProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [showAddTask, setShowAddTask] = useState(false)

  const { pipelines } = usePipelinesStore()
  const { markContacted, moveToStage, contacts } = useContactStore()
  const { tasks, toggleTask } = useTaskStore()

  // Fresh contact data from store
  const freshContact = useMemo(() => {
    return contacts.find(c => c.id === contact.id) ?? contact
  }, [contacts, contact.id, contact])

  // Pipeline & stage state
  const [selectedPipelineId, setSelectedPipelineId] = useState(contact.pipelineId)
  const [selectedStageId, setSelectedStageId] = useState(contact.stageId)

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const pipelineStages = useMemo(
    () => selectedPipeline ? [...selectedPipeline.stages].sort((a, b) => a.position - b.position) : [],
    [selectedPipeline]
  )
  const currentStage = pipelineStages.find(s => s.id === selectedStageId)

  // Health
  const health = getLeadHealth(contact.lastPipelineActivity, currentStage)
  const days = getDaysSinceActivity(contact.lastPipelineActivity)

  // Contact tasks
  const contactTasks = useMemo(
    () => tasks
      .filter(t => t.contact_id === contact.id && !t.parent_id && !t.deleted_at)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        const da = a.due_date ?? ''
        const db = b.due_date ?? ''
        return da.localeCompare(db)
      }),
    [tasks, contact.id]
  )

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 1500)
  }

  // Handle pipeline change
  const handlePipelineChange = async (newPipelineId: string) => {
    setSelectedPipelineId(newPipelineId)
    const newPipeline = pipelines.find(p => p.id === newPipelineId)
    if (!newPipeline) return
    const sortedStages = [...newPipeline.stages].sort((a, b) => a.position - b.position)
    const firstStage = sortedStages[0]
    if (!firstStage) return
    setSelectedStageId(firstStage.id)

    const sb = createClient()
    await sb
      .from('contact_pipelines')
      .update({
        pipeline_id: newPipelineId,
        stage_id: firstStage.id,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', contact.contactPipelineId)
  }

  // Handle stage change
  const handleStageChange = async (newStageId: string) => {
    setSelectedStageId(newStageId)
    await moveToStage(contact.contactPipelineId, newStageId)
  }

  // Handle remove with confirmation
  const handleRemove = () => {
    if (confirm('¿Eliminar esta oportunidad del pipeline? El contacto no se borrará.')) {
      onRemove()
    }
  }

  const sourceLabel = contact.source
    ? SOURCE_LABELS[contact.source as keyof typeof SOURCE_LABELS] ?? contact.source
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full h-full lg:w-[90vw] lg:max-w-6xl lg:h-[85vh] bg-[#14141e] border-0 lg:border border-border-default rounded-none lg:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 ${HEALTH_AVATAR[health]}`}>
              {(contact.first_name || '?')[0].toUpperCase()}
            </div>

            {/* Name + badges + pipeline */}
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-text-primary truncate">
                {contact.first_name} {contact.last_name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {sourceLabel && (
                  <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-text-muted">
                    {sourceLabel}
                  </span>
                )}
                {freshContact.circulo && (
                  <span className="text-xs md:text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {freshContact.circulo}
                  </span>
                )}
                <span className="text-xs md:text-[10px] text-text-muted">•</span>
                <span className="text-xs md:text-[11px] text-text-muted">
                  {selectedPipeline?.emoji} {selectedPipeline?.name}
                </span>
                <ChevronRight size={10} className="text-zinc-700" />
                <span className="text-xs md:text-[11px] text-text-secondary">
                  {currentStage?.emoji} {currentStage?.name}
                </span>
              </div>
            </div>

            {/* Close */}
            <button onClick={onClose} className="p-2 hover:bg-surface-overlay-hover rounded-lg cursor-pointer shrink-0">
              <X size={20} className="text-text-secondary" />
            </button>
          </div>

          {/* Contact chips + actions row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Chips */}
            {contact.primary_phone && (
              <button
                onClick={() => copyToClipboard(contact.primary_phone!, 'phone')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-overlay border border-border-subtle hover:bg-surface-overlay-hover transition-colors cursor-pointer group"
              >
                <Phone size={12} className="text-text-muted" />
                <span className="text-xs text-text-secondary">{contact.primary_phone}</span>
                {copied === 'phone'
                  ? <Check size={11} className="text-emerald-400" />
                  : <Copy size={11} className="text-text-muted group-hover:text-text-secondary" />}
              </button>
            )}
            {contact.primary_email && (
              <button
                onClick={() => copyToClipboard(contact.primary_email!, 'email')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-overlay border border-border-subtle hover:bg-surface-overlay-hover transition-colors cursor-pointer group"
              >
                <Mail size={12} className="text-text-muted" />
                <span className="text-xs text-text-secondary truncate max-w-[200px]">{contact.primary_email}</span>
                {copied === 'email'
                  ? <Check size={11} className="text-emerald-400" />
                  : <Copy size={11} className="text-text-muted group-hover:text-text-secondary" />}
              </button>
            )}

            <div className="w-px h-4 bg-surface-overlay-hover" />

            {/* Actions */}
            <button
              onClick={() => markContacted(contact.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 cursor-pointer"
            >
              <Check size={13} /> Contactado
            </button>
            {contact.primary_phone && (
              <>
                <a href={`tel:${contact.primary_phone}`} className="p-2 rounded-lg hover:bg-surface-overlay-hover" title="Llamar">
                  <Phone size={15} className="text-text-secondary" />
                </a>
                <a
                  href={`https://wa.me/${contact.primary_phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener"
                  className="p-2 rounded-lg hover:bg-surface-overlay-hover" title="WhatsApp"
                >
                  <MessageSquare size={15} className="text-text-secondary" />
                </a>
              </>
            )}
            {contact.primary_email && (
              <a href={`mailto:${contact.primary_email}`} className="p-2 rounded-lg hover:bg-surface-overlay-hover" title="Email">
                <Mail size={15} className="text-text-secondary" />
              </a>
            )}

            <div className="flex-1" />

            {/* SLA badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${HEALTH_BG[health]}`}>
              <Clock size={12} />
              {health === 'gray' ? 'Sin SLA' : (
                <>{days === 999 ? 'Sin actividad' : `${days}d en esta fase`}{currentStage?.sla_days ? ` / ${currentStage.sla_days}d` : ''}</>
              )}
            </div>
            <span className="text-xs md:text-[10px] text-text-muted">{HEALTH_LABELS[health]}</span>
          </div>

          {/* Pipeline/Stage movement */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs md:text-[10px] text-text-muted font-medium">Pipeline</label>
              <select
                value={selectedPipelineId}
                onChange={(e) => handlePipelineChange(e.target.value)}
                className="bg-surface-overlay rounded-lg px-2.5 py-1.5 text-xs text-text-secondary outline-none border border-border-subtle cursor-pointer [color-scheme:dark]"
              >
                {pipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs md:text-[10px] text-text-muted font-medium">Fase</label>
              <select
                value={selectedStageId}
                onChange={(e) => handleStageChange(e.target.value)}
                className="bg-surface-overlay rounded-lg px-2.5 py-1.5 text-xs text-text-secondary outline-none border border-border-subtle cursor-pointer [color-scheme:dark]"
              >
                {pipelineStages.map(s => (
                  <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Body: 2-column layout ─────────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left column: DATOS (35%) */}
          <div className="w-full lg:w-[35%] border-r-0 lg:border-r border-border-subtle lg:overflow-y-auto shrink-0 lg:shrink">
            <div className="px-1">
              <ContactDataTab contact={freshContact} />
            </div>
          </div>

          {/* Right column: NOTAS + TAREAS (65%) */}
          <div className="w-full lg:w-[65%] lg:overflow-y-auto shrink-0 lg:shrink border-t border-border-subtle lg:border-t-0">
            {/* Notas section */}
            <div className="border-b border-border-subtle">
              <div className="px-5 pt-4 pb-1">
                <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-wider">Notas</h3>
              </div>
              <ContactNotesTab contactId={contact.id} />
            </div>

            {/* Tareas section */}
            <div className="px-5 pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-wider">Tareas</h3>
                {!showAddTask && (
                  <button
                    onClick={() => setShowAddTask(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs md:text-[11px] font-medium hover:bg-blue-500/20 cursor-pointer"
                  >
                    + Nueva tarea
                  </button>
                )}
              </div>

              {/* QuickAddTask inline */}
              {showAddTask && (
                <div className="mb-4">
                  <QuickAddTask
                    initialSectionId={null}
                    onClose={() => setShowAddTask(false)}
                    preselectedContactId={contact.id}
                    hideContactPicker={true}
                  />
                </div>
              )}

              {/* Task list */}
              <div className="space-y-1">
                {contactTasks.length === 0 && !showAddTask ? (
                  <p className="text-xs text-text-muted py-4 text-center">Sin tareas asignadas</p>
                ) : (
                  contactTasks.map(t => (
                    <div
                      key={t.id}
                      className="flex items-start gap-2.5 px-2 py-2 hover:bg-surface-overlay rounded-lg group"
                    >
                      <button
                        onClick={() => toggleTask(t.id)}
                        className="shrink-0 mt-0.5 cursor-pointer"
                      >
                        {t.completed
                          ? <Check size={14} className="text-emerald-400" />
                          : <Circle size={14} className="text-text-muted" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${t.completed ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {t.due_date && (
                            <span className="text-xs md:text-[10px] text-text-muted flex items-center gap-0.5">
                              <Calendar size={9} />
                              {format(new Date(t.due_date), "d 'de' MMM", { locale: es })}
                            </span>
                          )}
                          {t.priority && t.priority < 4 && (
                            <span className={`text-xs md:text-[10px] flex items-center gap-0.5 ${PRIORITY_COLORS[t.priority]}`}>
                              <Flag size={9} />
                              P{t.priority}
                            </span>
                          )}
                          {t.task_type && t.task_type !== 'tarea' && (
                            <span className="text-xs md:text-[10px] text-violet-400/70">
                              {TYPE_LABELS[t.task_type] ?? t.task_type}
                            </span>
                          )}
                          {t.description && (
                            <span className="text-xs md:text-[10px] text-zinc-700 truncate max-w-[150px]">
                              {t.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-border-subtle shrink-0 flex items-center justify-between">
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 cursor-pointer"
          >
            <Trash2 size={13} />
            Eliminar del pipeline
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
