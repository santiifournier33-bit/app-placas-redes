'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface InlineSelectChipProps {
  value: string | null | undefined
  options: { value: string; label: string }[]
  onChange: (val: string | null) => void
  placeholder?: string
}

export function InlineSelectChip({
  value,
  options,
  onChange,
  placeholder = '—',
}: InlineSelectChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
          selected
            ? 'bg-violet-500/15 text-violet-300 hover:bg-violet-500/25'
            : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]'
        }`}
      >
        <span className="truncate max-w-[140px]">{selected?.label ?? placeholder}</span>
        <ChevronDown size={10} className="shrink-0 opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-40 bg-[#1e1e2c] border border-white/[0.08] rounded-lg shadow-xl py-1 min-w-[160px] max-h-72 overflow-y-auto">
          {value && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-zinc-500 hover:bg-white/[0.04] cursor-pointer"
            >
              Sin valor
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer flex items-center gap-2 ${
                opt.value === value
                  ? 'bg-violet-500/10 text-violet-300'
                  : 'text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && <span className="ml-auto text-violet-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
