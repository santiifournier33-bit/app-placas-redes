'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronLeft, Trash2, Plus, X } from 'lucide-react'
import type { PipelineMembership } from '@/lib/stores/contactStore'
import type { Pipeline, PipelineStage } from '@/lib/stores/pipelinesStore'
import { PortalDropdown } from '@/components/ui/PortalDropdown'

// Proceso comercial con sus etapas (forma de pipelinesStore.pipelines).
export type PipelineWithStages = Pipeline & { stages: PipelineStage[] }

// Referencia estable para contactos sin membresías: evita crear un array nuevo por
// fila/render (importa con miles de filas virtualizadas en la tabla).
export const EMPTY_MEMBERSHIPS: PipelineMembership[] = []

// ────────────────────────────────────────────────────────────────────────────
// Menú drill-down de 2 niveles (proceso → etapa). Presentacional: lo monta el
// caller dentro de su propio anchor/PortalDropdown. Reutilizado por la celda de
// la tabla, el botón "+ Agregar" del detalle y el cambio de etapa por renglón.
// ────────────────────────────────────────────────────────────────────────────
function ProcessStageDrilldown({
  anchorRef,
  open,
  onClose,
  pipelines,
  memberships,
  onAssign,
  onMove,
  onRemove,
  initialPipelineId = null,
  hideMemberProcesses = false,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  open: boolean
  onClose: () => void
  pipelines: PipelineWithStages[]
  memberships: PipelineMembership[]
  onAssign: (pipelineId: string, stageId: string) => void
  onMove: (contactPipelineId: string, stageId: string) => void
  onRemove?: (contactPipelineId: string) => void
  initialPipelineId?: string | null
  hideMemberProcesses?: boolean
}) {
  // null = lista de procesos (nivel 1); pipelineId = etapas de ese proceso (nivel 2).
  const [viewPipelineId, setViewPipelineId] = useState<string | null>(initialPipelineId)

  // Al abrir, arrancar en el nivel pedido (lista de procesos, o directo a uno).
  useEffect(() => {
    if (open) setViewPipelineId(initialPipelineId)
  }, [open, initialPipelineId])

  const membershipFor = (pipelineId: string) => memberships.find(m => m.pipelineId === pipelineId)
  const viewPipeline = viewPipelineId ? pipelines.find(p => p.id === viewPipelineId) : null
  const level1 = hideMemberProcesses
    ? pipelines.filter(p => !membershipFor(p.id))
    : pipelines

  const handleStage = (pipelineId: string, stageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const existing = membershipFor(pipelineId)
    if (existing) {
      if (existing.stageId !== stageId) onMove(existing.contactPipelineId, stageId)
    } else {
      onAssign(pipelineId, stageId)
    }
    onClose()
  }

  return (
    <PortalDropdown
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      className="bg-[#1e1e2c] border border-border-default rounded-xl shadow-2xl p-1.5 max-h-72 overflow-y-auto"
      minWidth={210}
    >
      {!viewPipeline ? (
        // ── Nivel 1: elegir proceso comercial ──
        level1.length === 0 ? (
          <div className="px-2 py-1.5 text-[11px] text-text-muted">No hay procesos disponibles.</div>
        ) : (
          level1.map(p => {
            const mem = membershipFor(p.id)
            const cur = mem ? p.stages.find(s => s.id === mem.stageId) : undefined
            return (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); setViewPipelineId(p.id) }}
                className="w-full flex items-center gap-2 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md cursor-pointer transition-colors hover:bg-surface-overlay text-left"
              >
                <span className="text-sm shrink-0">{p.emoji}</span>
                <span className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs md:text-[11px] text-text-primary truncate">{p.name}</span>
                  {cur && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-text-muted truncate">
                      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cur.color || '#71717a' }} />
                      {cur.name}
                    </span>
                  )}
                </span>
                <ChevronDown size={12} className="shrink-0 -rotate-90 text-text-muted" />
              </button>
            )
          })
        )
      ) : (
        // ── Nivel 2: elegir etapa del proceso ──
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setViewPipelineId(null) }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md cursor-pointer hover:bg-surface-overlay text-text-secondary"
          >
            <ChevronLeft size={13} className="shrink-0" />
            <span className="text-xs md:text-[11px] truncate">{viewPipeline.emoji} {viewPipeline.name}</span>
          </button>
          <div className="h-px bg-border-subtle my-1" />
          {[...viewPipeline.stages].sort((a, b) => a.position - b.position).map(stage => {
            const mem = membershipFor(viewPipeline.id)
            const isSelected = mem?.stageId === stage.id
            const c = stage.color || '#3b82f6'
            return (
              <button
                key={stage.id}
                onClick={(e) => handleStage(viewPipeline.id, stage.id, e)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-surface-overlay-hover' : 'hover:bg-surface-overlay'
                }`}
              >
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs md:text-[11px] font-medium"
                  style={{ background: `${c}26`, color: c }}
                >
                  {stage.name}
                </span>
                {isSelected && <span className="ml-auto text-text-secondary text-xs">✓</span>}
              </button>
            )
          })}
          {onRemove && membershipFor(viewPipeline.id) && (
            <>
              <div className="h-px bg-border-subtle my-1" />
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(membershipFor(viewPipeline.id)!.contactPipelineId); onClose() }}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 min-h-11 md:min-h-0 rounded-md cursor-pointer hover:bg-red-500/10 text-red-400"
              >
                <Trash2 size={12} className="shrink-0" />
                <span className="text-xs md:text-[11px]">Quitar de este proceso</span>
              </button>
            </>
          )}
        </>
      )}
    </PortalDropdown>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Celda compacta de la TABLA: un chip (proceso+etapa, +N) que abre el drill-down.
// ────────────────────────────────────────────────────────────────────────────
export function PipelineStageCell({
  pipelines,
  memberships,
  onAssign,
  onMove,
  onRemove,
}: {
  pipelines: PipelineWithStages[]
  memberships: PipelineMembership[]
  onAssign: (pipelineId: string, stageId: string) => void
  onMove: (contactPipelineId: string, stageId: string) => void
  onRemove: (contactPipelineId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const chips = memberships
    .map(m => {
      const p = pipelines.find(pp => pp.id === m.pipelineId)
      const s = p?.stages.find(st => st.id === m.stageId)
      return p && s ? { pipeline: p, stage: s } : null
    })
    .filter((x): x is { pipeline: PipelineWithStages; stage: PipelineStage } => !!x)

  const first = chips[0]
  const extra = chips.length - 1

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs md:text-[11px] cursor-pointer max-w-full"
        style={
          first
            ? { background: `${first.stage.color}26`, color: first.stage.color || '#a3a3a3' }
            : { background: 'rgba(255,255,255,0.04)', color: '#71717a' }
        }
        title={chips.map(c => `${c.pipeline.name}: ${c.stage.name}`).join(' · ') || 'Sin proceso'}
      >
        {first ? (
          <span className="truncate">
            {first.pipeline.emoji ? `${first.pipeline.emoji} ` : ''}{first.stage.name}
          </span>
        ) : (
          <span className="truncate">Sin proceso</span>
        )}
        {extra > 0 && <span className="shrink-0 opacity-70">+{extra}</span>}
        <ChevronDown size={10} className="shrink-0" />
      </button>
      <ProcessStageDrilldown
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
        pipelines={pipelines}
        memberships={memberships}
        onAssign={onAssign}
        onMove={onMove}
        onRemove={onRemove}
      />
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Lista EXPANDIDA del DETALLE: un renglón por proceso (etapa editable + × quitar)
// y un botón "+ Agregar a proceso". Cada control abre el mismo drill-down.
// ────────────────────────────────────────────────────────────────────────────
function ProcessRow({
  pipeline,
  membership,
  pipelines,
  memberships,
  onMove,
  onRemove,
}: {
  pipeline: PipelineWithStages
  membership: PipelineMembership
  pipelines: PipelineWithStages[]
  memberships: PipelineMembership[]
  onMove: (contactPipelineId: string, stageId: string) => void
  onRemove: (contactPipelineId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)
  const stage = pipeline.stages.find(s => s.id === membership.stageId)
  const c = stage?.color || '#3b82f6'

  return (
    <div className="flex items-center gap-2 min-h-11">
      <span className="text-sm shrink-0">{pipeline.emoji}</span>
      <span className="text-xs md:text-[11px] text-text-primary truncate flex-1 min-w-0">{pipeline.name}</span>
      <button
        ref={chipRef}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs md:text-[11px] font-medium cursor-pointer shrink-0"
        style={{ background: `${c}26`, color: c }}
        title="Cambiar etapa"
      >
        <span className="truncate max-w-[9rem]">{stage?.name || 'Sin etapa'}</span>
        <ChevronDown size={11} className="shrink-0" />
      </button>
      <button
        onClick={() => onRemove(membership.contactPipelineId)}
        className="p-2 rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/10 cursor-pointer shrink-0"
        title={`Quitar de ${pipeline.name}`}
        aria-label={`Quitar de ${pipeline.name}`}
      >
        <X size={14} />
      </button>
      {/* Cambiar etapa: abre directo en el nivel 2 de este proceso. */}
      <ProcessStageDrilldown
        anchorRef={chipRef}
        open={open}
        onClose={() => setOpen(false)}
        pipelines={pipelines}
        memberships={memberships}
        onAssign={() => { /* ya es miembro: solo se mueve */ }}
        onMove={onMove}
        initialPipelineId={pipeline.id}
      />
    </div>
  )
}

export function ContactProcessList({
  pipelines,
  memberships,
  onAssign,
  onMove,
  onRemove,
}: {
  pipelines: PipelineWithStages[]
  memberships: PipelineMembership[]
  onAssign: (pipelineId: string, stageId: string) => void
  onMove: (contactPipelineId: string, stageId: string) => void
  onRemove: (contactPipelineId: string) => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef<HTMLButtonElement>(null)

  // Procesos del contacto, en el orden de `pipelines` (por posición).
  const rows = pipelines
    .map(p => {
      const m = memberships.find(mm => mm.pipelineId === p.id)
      return m ? { pipeline: p, membership: m } : null
    })
    .filter((x): x is { pipeline: PipelineWithStages; membership: PipelineMembership } => !!x)

  const canAdd = memberships.length < pipelines.length

  return (
    <div className="flex flex-col gap-1.5">
      {rows.length === 0 && (
        <span className="text-xs md:text-[11px] text-text-muted">Sin proceso</span>
      )}
      {rows.map(r => (
        <ProcessRow
          key={r.pipeline.id}
          pipeline={r.pipeline}
          membership={r.membership}
          pipelines={pipelines}
          memberships={memberships}
          onMove={onMove}
          onRemove={onRemove}
        />
      ))}
      {canAdd && (
        <>
          <button
            ref={addRef}
            onClick={() => setAddOpen(o => !o)}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 min-h-11 md:min-h-9 rounded-md text-xs md:text-[11px] text-blue-400 hover:bg-blue-500/10 cursor-pointer self-start"
          >
            <Plus size={13} className="shrink-0" />
            Agregar a proceso
          </button>
          <ProcessStageDrilldown
            anchorRef={addRef}
            open={addOpen}
            onClose={() => setAddOpen(false)}
            pipelines={pipelines}
            memberships={memberships}
            onAssign={onAssign}
            onMove={onMove}
            hideMemberProcesses
          />
        </>
      )}
    </div>
  )
}
