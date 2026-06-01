"use client"

import { useFunnelStore } from "@/lib/stores/funnelStore"
import type { Period } from "@/lib/embudo/funnel"

const OPTIONS: { value: Period; label: string }[] = [
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
]

export function PeriodToggle() {
  const { period, setPeriod } = useFunnelStore()
  return (
    <div className="inline-flex bg-surface-1 border border-border-subtle p-1 rounded-xl">
      {OPTIONS.map(o => (
        <button
          key={o.value}
          onClick={() => setPeriod(o.value)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            period === o.value
              ? "bg-shell-accent/10 text-shell-accent"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
