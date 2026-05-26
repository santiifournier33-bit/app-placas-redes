"use client"

import { useState } from "react"
import { ChevronDown, Check } from "lucide-react"
import { RECURRENCE_LABELS } from "@/lib/servicios/recurrence"
import type { Recurrence, RecurrenceFreq } from "@/lib/stores/serviciosStore"

interface RecurrencePickerProps {
  value: Recurrence | null
  onChange: (rec: Recurrence | null) => void
}

const FREQS: RecurrenceFreq[] = [
  "once", "daily", "weekly", "biweekly",
  "monthly", "bimonthly", "quarterly", "semiannual", "annual", "custom",
]

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [open, setOpen] = useState(false)
  const freq = value?.freq ?? "once"

  const handleFreq = (f: RecurrenceFreq) => {
    if (f === "once") { onChange(null); setOpen(false); return }
    onChange({ freq: f, ...(value ?? {}) })
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm hover:bg-surface-overlay-hover transition-colors"
        >
          <span className={value ? "text-text-primary" : "text-text-muted"}>
            {RECURRENCE_LABELS[freq]}
          </span>
          <ChevronDown size={14} className="text-text-muted" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-full z-50 bg-[#1e1e2c] border border-border-default rounded-xl shadow-2xl overflow-hidden">
              {FREQS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFreq(f)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-surface-overlay transition-colors text-sm text-left"
                >
                  <span className={freq === f ? "text-text-primary" : "text-text-secondary"}>{RECURRENCE_LABELS[f]}</span>
                  {freq === f && <Check size={12} className="text-blue-400" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {value?.freq === "monthly" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted shrink-0">Día del mes:</span>
          <input
            type="number" inputMode="decimal"
            min={1}
            max={31}
            value={value.dayOfMonth ?? ""}
            onChange={(e) => onChange({ ...value, dayOfMonth: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="1-31"
            className="w-20 px-2 py-1 bg-surface-overlay border border-border-default rounded-lg text-sm text-text-primary placeholder-zinc-600"
          />
        </div>
      )}

      {value?.freq === "custom" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted shrink-0">Cada</span>
          <input
            type="number" inputMode="decimal"
            min={1}
            value={value.customDays ?? ""}
            onChange={(e) => onChange({ ...value, customDays: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="N"
            className="w-20 px-2 py-1 bg-surface-overlay border border-border-default rounded-lg text-sm text-text-primary placeholder-zinc-600"
          />
          <span className="text-xs text-text-muted">días</span>
        </div>
      )}
    </div>
  )
}
