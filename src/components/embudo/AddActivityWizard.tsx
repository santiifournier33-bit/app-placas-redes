"use client"

import { useMemo, useState } from "react"
import { X, ArrowRight, ArrowLeft, Check, Minus, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  FUNNEL_STAGES, STAGE_META, ACTION_OPTIONS, ORIGIN_OPTIONS, OPERATION_OPTIONS,
  optionLabel, toISODate, type FunnelStage,
} from "@/lib/embudo/funnel"
import { useFunnelStore, type FunnelActivity, type ActivityInput } from "@/lib/stores/funnelStore"
import { ProgressRing } from "@/components/ui/progress-ring"
import { MonthCalendar } from "./MonthCalendar"

type StepKey = "date" | "quantity_action" | "operation" | "origin" | "details"

function stepsFor(stage: FunnelStage): StepKey[] {
  const meta = STAGE_META[stage]
  const steps: StepKey[] = ["date"]
  if (meta.hasQuantity || meta.hasAction) steps.push("quantity_action")
  if (meta.hasOperation) steps.push("operation")
  if (meta.hasOrigin) steps.push("origin")
  steps.push("details")
  return steps
}

interface AddActivityWizardProps {
  initialStage?: FunnelStage
  editing?: FunnelActivity
  defaultDate?: string
  onClose: () => void
  onSaved?: () => void
}

export function AddActivityWizard({ initialStage, editing, defaultDate, onClose, onSaved }: AddActivityWizardProps) {
  const { addActivity, updateActivity } = useFunnelStore()

  const [stage, setStage] = useState<FunnelStage | null>(editing?.stage ?? initialStage ?? null)
  const [stepIndex, setStepIndex] = useState(0)
  const [calMonth, setCalMonth] = useState<Date>(
    new Date(`${editing?.activity_date ?? defaultDate ?? toISODate(new Date())}T12:00:00`)
  )
  const [date, setDate] = useState<string>(editing?.activity_date ?? defaultDate ?? toISODate(new Date()))
  const [quantity, setQuantity] = useState<number>(editing?.quantity ?? 1)
  const [action, setAction] = useState<string | null>(editing?.action ?? null)
  const [origin, setOrigin] = useState<string | null>(editing?.origin ?? null)
  const [operation, setOperation] = useState<string | null>(editing?.operation_type ?? null)
  const [addressOrName, setAddressOrName] = useState<string>(editing?.address_or_name ?? "")
  const [note, setNote] = useState<string>(editing?.note ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = useMemo(() => (stage ? stepsFor(stage) : []), [stage])
  const currentStep = steps[stepIndex]
  const meta = stage ? STAGE_META[stage] : null
  const isLast = stepIndex === steps.length - 1

  const canAdvance = (() => {
    switch (currentStep) {
      case "quantity_action": return !meta?.hasAction || !!action
      case "operation": return !!operation
      case "origin": return !!origin
      default: return true
    }
  })()

  const headerSummary = (() => {
    const parts: string[] = [format(new Date(`${date}T12:00:00`), "d MMM yyyy", { locale: es })]
    if (meta?.hasQuantity && stepIndex > 1) parts.push(`${quantity} ${quantity === 1 ? "evento" : "eventos"}`)
    if (meta?.hasOperation && operation && currentStep !== "operation") parts.push(optionLabel(OPERATION_OPTIONS, operation)!)
    if (meta?.hasAction && action && currentStep === "details") parts.push(optionLabel(ACTION_OPTIONS, action)!)
    if (meta?.hasOrigin && origin && currentStep === "details") parts.push(optionLabel(ORIGIN_OPTIONS, origin)!)
    return parts.join(" · ")
  })()

  async function handleSave() {
    if (!stage) return
    setSaving(true)
    setError(null)
    const input: ActivityInput = {
      stage,
      activity_date: date,
      quantity: meta?.hasQuantity ? quantity : 1,
      action: meta?.hasAction ? action : null,
      origin: meta?.hasOrigin ? origin : null,
      operation_type: meta?.hasOperation ? operation : null,
      address_or_name: addressOrName.trim() || null,
      note: note.trim() || null,
    }
    const res = editing
      ? await updateActivity(editing.id, input)
      : await addActivity(input)
    setSaving(false)
    if (res.ok) {
      onSaved?.()
      onClose()
    } else {
      setError(res.error ?? "No se pudo guardar")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface-1 border border-border-subtle rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-[var(--shadow-modal)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {stepIndex > 0 && stage && !editing && (
              <button
                onClick={() => setStepIndex(i => Math.max(0, i - 1))}
                className="p-1 -ml-1 rounded-lg hover:bg-surface-overlay-hover text-text-muted cursor-pointer"
                aria-label="Atrás"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text-primary truncate">
                {editing ? "Editar" : ""} {meta ? meta.label : "Cargar actividad"}
              </h3>
              {stage && (
                <p className="text-[11px] text-text-muted">
                  Paso {stepIndex + 1} de {steps.length}
                  {stepIndex > 0 && headerSummary ? ` · ${headerSummary}` : ""}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer shrink-0" aria-label="Cerrar">
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Stage picker (only when no stage preset) */}
          {!stage && (
            <div className="grid grid-cols-2 gap-3">
              {FUNNEL_STAGES.map(s => {
                const m = STAGE_META[s]
                return (
                  <button
                    key={s}
                    onClick={() => { setStage(s); setStepIndex(0) }}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border-subtle bg-surface-2/40 hover:border-shell-accent/30 hover:bg-surface-2/80 cursor-pointer transition-all active:scale-95"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-xs font-semibold text-text-primary text-center">{m.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {stage && currentStep === "date" && (
            <div>
              <p className="text-sm font-medium text-text-secondary mb-3">Seleccioná la fecha</p>
              <MonthCalendar
                month={calMonth}
                selected={date}
                onSelectDate={setDate}
                onMonthChange={setCalMonth}
              />
            </div>
          )}

          {stage && currentStep === "quantity_action" && (
            <div className="space-y-6">
              {meta?.hasQuantity && (
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Cantidad de eventos</p>
                  <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-2/40 px-4 py-2">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="p-1.5 rounded-full border border-border-default text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
                      aria-label="Restar"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-lg font-bold text-text-primary tabular-nums">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(1000, q + 1))}
                      className="p-1.5 rounded-full border border-border-default text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
                      aria-label="Sumar"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}
              {meta?.hasAction && (
                <RadioList label="Acción" options={ACTION_OPTIONS} value={action} onChange={setAction} />
              )}
            </div>
          )}

          {stage && currentStep === "operation" && (
            <RadioList label="Operación" options={OPERATION_OPTIONS} value={operation} onChange={setOperation} />
          )}

          {stage && currentStep === "origin" && (
            <RadioList label="Origen" options={ORIGIN_OPTIONS} value={origin} onChange={setOrigin} />
          )}

          {stage && currentStep === "details" && (
            <div className="space-y-4">
              <input
                value={addressOrName}
                onChange={e => setAddressOrName(e.target.value)}
                placeholder="Dirección o nombre (opcional)"
                className="w-full rounded-xl border border-border-subtle bg-surface-2/40 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-shell-accent/50"
              />
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Nota (opcional)"
                rows={4}
                className="w-full rounded-xl border border-border-subtle bg-surface-2/40 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-shell-accent/50 resize-none"
              />
              {meta && (
                <div className="flex items-center gap-3 pt-2">
                  <ProgressRing percent={100} color={meta.color} size={44} strokeWidth={5} />
                  <p className="text-xs text-text-muted">Se sumará a <span className="font-semibold text-text-secondary">{meta.label}</span>.</p>
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-4 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        {stage && (
          <div className="px-5 py-4 border-t border-border-subtle flex flex-col gap-2 shrink-0">
            {isLast ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-shell-accent text-shell-bg hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
              >
                {saving ? "Guardando…" : <>Guardar <Check size={16} /></>}
              </button>
            ) : (
              <button
                onClick={() => canAdvance && setStepIndex(i => i + 1)}
                disabled={!canAdvance}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-shell-accent text-shell-bg hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
              >
                Siguiente <ArrowRight size={16} />
              </button>
            )}
            <button onClick={onClose} className="w-full px-5 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary cursor-pointer">
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function RadioList({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <div>
      <p className="text-sm font-medium text-text-secondary mb-3">{label}</p>
      <div className="space-y-1">
        {options.map(o => {
          const active = value === o.value
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                active
                  ? "border-shell-accent/50 bg-shell-accent/10"
                  : "border-border-subtle hover:bg-surface-overlay-hover"
              }`}
            >
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                active ? "border-shell-accent" : "border-border-default"
              }`}>
                {active && <span className="w-2 h-2 rounded-full bg-shell-accent" />}
              </span>
              <span className="text-sm text-text-primary">{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
