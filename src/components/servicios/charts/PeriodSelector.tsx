"use client"

export type Period = "year" | "month" | "week" | "day"

interface PeriodSelectorProps {
  value: Period
  onChange: (p: Period) => void
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "year", label: "Por año" },
  { key: "month", label: "Por mes" },
  { key: "week", label: "Por semana" },
  { key: "day", label: "Por día" },
]

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-1 p-0.5 bg-surface-overlay rounded-xl border border-border-subtle">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === p.key
              ? "bg-surface-overlay-hover text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
