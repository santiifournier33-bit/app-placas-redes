"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import {
  FUNNEL_STAGES, STAGE_META, sumByStage, displayTarget, pct, type FunnelStage,
} from "@/lib/embudo/funnel"
import { useFunnelStore } from "@/lib/stores/funnelStore"
import { ProgressRing } from "@/components/ui/progress-ring"
import { PeriodToggle } from "./PeriodToggle"
import { AddActivityWizard } from "./AddActivityWizard"

interface FunnelRingsGridProps {
  /** "summary" = compact (dashboard), "full" = module tracker. */
  variant?: "summary" | "full"
  /** Override ring click (e.g. navigate from dashboard). Defaults to opening the wizard. */
  onRingClick?: (stage: FunnelStage) => void
}

export function FunnelRingsGrid({ variant = "full", onRingClick }: FunnelRingsGridProps) {
  const { activities, period, goalFor, init } = useFunnelStore()
  const [wizardStage, setWizardStage] = useState<FunnelStage | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => { init() }, [init])

  const totals = useMemo(() => sumByStage(activities), [activities])
  const ringSize = variant === "summary" ? 84 : 104

  function handleRing(stage: FunnelStage) {
    if (onRingClick) onRingClick(stage)
    else setWizardStage(stage)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PeriodToggle />
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-shell-accent text-shell-bg hover:opacity-90 cursor-pointer transition-opacity"
        >
          <Plus size={15} /> Cargar actividad
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {FUNNEL_STAGES.map(stage => {
          const meta = STAGE_META[stage]
          const actual = totals[stage]
          const monthly = goalFor(stage)
          const denom = displayTarget(monthly, period)
          const percent = denom === null ? (actual > 0 ? 100 : 0) : pct(actual, monthly, period)
          return (
            <button
              key={stage}
              onClick={() => handleRing(stage)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border-subtle bg-surface-1/50 hover:border-shell-accent/20 hover:bg-surface-1/80 cursor-pointer transition-all active:scale-[0.98] shadow-sm"
            >
              <ProgressRing
                percent={percent}
                color={meta.color}
                size={ringSize}
                centerLabel={denom === null ? `${actual}` : `${actual}/${denom}`}
                centerSubLabel={denom === null ? "Sin meta" : undefined}
              />
              <span className="text-xs font-semibold text-text-primary">{meta.label}</span>
            </button>
          )
        })}
      </div>

      {pickerOpen && (
        <AddActivityWizard onClose={() => setPickerOpen(false)} />
      )}
      {wizardStage && (
        <AddActivityWizard initialStage={wizardStage} onClose={() => setWizardStage(null)} />
      )}
    </div>
  )
}
