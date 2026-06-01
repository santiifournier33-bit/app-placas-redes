"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronDown, MoreVertical, Pencil, Trash2, Eye, Plus } from "lucide-react"
import {
  FUNNEL_STAGES, STAGE_META, optionLabel, toISODate,
  ACTION_OPTIONS, ORIGIN_OPTIONS, OPERATION_OPTIONS, type FunnelStage,
} from "@/lib/embudo/funnel"
import type { FunnelActivity } from "@/lib/stores/funnelStore"
import { MonthCalendar } from "./MonthCalendar"
import { AddActivityWizard } from "./AddActivityWizard"

export function FunnelCalendar() {
  const [calMonth, setCalMonth] = useState<Date>(new Date())
  const [selected, setSelected] = useState<string>(toISODate(new Date()))
  const [items, setItems] = useState<FunnelActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<FunnelActivity | null>(null)
  const [adding, setAdding] = useState(false)

  const monthAnchor = toISODate(calMonth)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/embudo/activities?period=month&date=${monthAnchor}`)
      if (res.ok) {
        const body = await res.json()
        setItems(body.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [monthAnchor])

  useEffect(() => { reload() }, [reload])

  // iso date → array of stage colors (for calendar dots)
  const dots = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const it of items) {
      const color = STAGE_META[it.stage]?.color
      if (!color) continue
      if (!map[it.activity_date]) map[it.activity_date] = []
      if (!map[it.activity_date].includes(color)) map[it.activity_date].push(color)
    }
    return map
  }, [items])

  const dayItems = useMemo(() => items.filter(it => it.activity_date === selected), [items, selected])
  const byStage = useMemo(() => {
    const m = {} as Record<FunnelStage, FunnelActivity[]>
    for (const s of FUNNEL_STAGES) m[s] = []
    for (const it of dayItems) m[it.stage]?.push(it)
    return m
  }, [dayItems])

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este registro?")) return
    const res = await fetch(`/api/embudo/activities/${id}`, { method: "DELETE" })
    if (res.ok) reload()
  }

  const selectedLabel = format(new Date(`${selected}T12:00:00`), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <MonthCalendar
          month={calMonth}
          selected={selected}
          onSelectDate={setSelected}
          onMonthChange={setCalMonth}
          dots={dots}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary capitalize">{selectedLabel}</h3>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-shell-accent/10 text-shell-accent hover:bg-shell-accent/20 cursor-pointer"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-overlay rounded-xl animate-pulse" />)}</div>
        ) : dayItems.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8 border border-dashed border-border-subtle rounded-2xl">
            Sin actividad este día
          </p>
        ) : (
          <div className="space-y-2">
            {FUNNEL_STAGES.filter(s => byStage[s].length > 0).map(s => (
              <StageSection
                key={s}
                stage={s}
                items={byStage[s]}
                onEdit={setEditing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <AddActivityWizard editing={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}
      {adding && (
        <AddActivityWizard defaultDate={selected} onClose={() => setAdding(false)} onSaved={reload} />
      )}
    </div>
  )
}

function StageSection({ stage, items, onEdit, onDelete }: {
  stage: FunnelStage
  items: FunnelActivity[]
  onEdit: (a: FunnelActivity) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const meta = STAGE_META[stage]
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-1/50 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
          {meta.label}
          <span className="text-xs text-text-muted">({items.length})</span>
        </span>
        <ChevronDown size={16} className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="divide-y divide-border-subtle border-t border-border-subtle">
          {items.map(it => <EntryRow key={it.id} item={it} onEdit={onEdit} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  )
}

function EntryRow({ item, onEdit, onDelete }: {
  item: FunnelActivity
  onEdit: (a: FunnelActivity) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [detail, setDetail] = useState(false)
  const meta = STAGE_META[item.stage]

  const chips: string[] = []
  if (meta.hasQuantity) chips.push(`${item.quantity} ${item.quantity === 1 ? "evento" : "eventos"}`)
  if (meta.hasOperation && item.operation_type) chips.push(optionLabel(OPERATION_OPTIONS, item.operation_type)!)
  if (meta.hasAction && item.action) chips.push(optionLabel(ACTION_OPTIONS, item.action)!)
  if (meta.hasOrigin && item.origin) chips.push(optionLabel(ORIGIN_OPTIONS, item.origin)!)

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary truncate">{item.address_or_name || "Sin dirección"}</p>
          {chips.length > 0 && <p className="text-[11px] text-text-muted truncate">{chips.join(" · ")}</p>}
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-surface-overlay-hover text-text-muted cursor-pointer" aria-label="Opciones">
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-border-subtle bg-surface-2 shadow-[var(--shadow-modal)] py-1">
                <MenuItem icon={<Eye size={15} />} label="Mostrar detalle" onClick={() => { setDetail(d => !d); setMenuOpen(false) }} />
                <MenuItem icon={<Pencil size={15} />} label="Editar" onClick={() => { onEdit(item); setMenuOpen(false) }} />
                <MenuItem icon={<Trash2 size={15} />} label="Eliminar" danger onClick={() => { onDelete(item.id); setMenuOpen(false) }} />
              </div>
            </>
          )}
        </div>
      </div>
      {detail && (
        <div className="mt-2 rounded-xl bg-surface-2/50 px-3 py-2 space-y-1 text-xs">
          {chips.map((c, i) => <p key={i} className="text-text-secondary">{c}</p>)}
          {item.note && <p className="text-text-muted italic">“{item.note}”</p>}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-surface-overlay-hover ${danger ? "text-red-400" : "text-text-primary"}`}
    >
      {icon}{label}
    </button>
  )
}
