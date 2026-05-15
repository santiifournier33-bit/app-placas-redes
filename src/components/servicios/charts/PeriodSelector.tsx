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
    <div className="flex gap-1 p-0.5 bg-white/[0.03] rounded-xl border border-white/[0.06]">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === p.key
              ? "bg-white/[0.08] text-zinc-200"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
