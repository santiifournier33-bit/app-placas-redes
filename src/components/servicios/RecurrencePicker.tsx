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
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm hover:bg-white/[0.06] transition-colors"
        >
          <span className={value ? "text-zinc-200" : "text-zinc-500"}>
            {RECURRENCE_LABELS[freq]}
          </span>
          <ChevronDown size={14} className="text-zinc-500" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-full z-50 bg-[#1e1e2c] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
              {FREQS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFreq(f)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-colors text-sm text-left"
                >
                  <span className={freq === f ? "text-zinc-100" : "text-zinc-300"}>{RECURRENCE_LABELS[f]}</span>
                  {freq === f && <Check size={12} className="text-blue-400" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {value?.freq === "monthly" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Día del mes:</span>
          <input
            type="number" inputMode="decimal"
            min={1}
            max={31}
            value={value.dayOfMonth ?? ""}
            onChange={(e) => onChange({ ...value, dayOfMonth: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="1-31"
            className="w-20 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder-zinc-600"
          />
        </div>
      )}

      {value?.freq === "custom" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 shrink-0">Cada</span>
          <input
            type="number" inputMode="decimal"
            min={1}
            value={value.customDays ?? ""}
            onChange={(e) => onChange({ ...value, customDays: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="N"
            className="w-20 px-2 py-1 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder-zinc-600"
          />
          <span className="text-xs text-zinc-500">días</span>
        </div>
      )}
    </div>
  )
}
