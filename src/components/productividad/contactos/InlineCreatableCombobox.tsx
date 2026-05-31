'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Plus } from 'lucide-react'
import { PortalDropdown } from '@/components/ui/PortalDropdown'
import { type ChipColor, COLOR_CLASS, COLOR_HOVER } from './InlineSelectChip'

const COLOR_CYCLE: ChipColor[] = ['violet', 'blue', 'cyan', 'emerald', 'amber', 'red', 'pink', 'zinc']

// Deterministic color: same value always gets same color, consistent across sessions.
function hashColor(val: string): ChipColor {
  let h = 0
  for (const c of val) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLOR_CYCLE[h % COLOR_CYCLE.length]
}

interface InlineCreatableComboboxProps {
  value: string | null | undefined
  fieldKey: string
  suggestions: string[]
  onChange: (val: string | null) => void
  placeholder?: string
}

export function InlineCreatableCombobox({
  value,
  fieldKey: _fieldKey,
  suggestions,
  onChange,
  placeholder = '—',
}: InlineCreatableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery(value ?? '')
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [open, value])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return suggestions
    return suggestions.filter(s => s.toLowerCase().includes(q))
  }, [query, suggestions])

  const exactMatch = suggestions.some(s => s.toLowerCase() === query.toLowerCase().trim())
  const showCreate = query.trim().length > 0 && !exactMatch

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
  }

  const handleCreate = () => {
    const newVal = query.trim()
    if (!newVal) return
    onChange(newVal)
    setOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setOpen(false)
  }

  const currentColor: ChipColor = value ? hashColor(value) : 'zinc'
  const triggerClass = value
    ? `${COLOR_CLASS[currentColor]} ${COLOR_HOVER[currentColor]}`
    : 'bg-surface-overlay text-text-muted hover:bg-surface-overlay-hover'

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs md:text-[11px] font-medium cursor-pointer transition-colors ${triggerClass}`}
      >
        <span className="truncate max-w-[140px]">{value ?? placeholder}</span>
        <ChevronDown size={10} className="shrink-0 opacity-70" />
      </button>

      <PortalDropdown
        anchorRef={buttonRef}
        open={open}
        onClose={() => setOpen(false)}
        className="bg-[#1e1e2c] border border-border-default rounded-xl shadow-2xl p-1.5"
        minWidth={200}
      >
        <div className="px-1 pb-1.5">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (showCreate) handleCreate()
                else if (filtered.length > 0) handleSelect(filtered[0])
              }
              if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
            }}
            placeholder="Buscar o crear..."
            className="w-full bg-surface-overlay rounded-md px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none border border-border-subtle focus:border-border-default transition-colors"
          />
        </div>

        {value && (
          <button
            onClick={(e) => { e.stopPropagation(); handleClear() }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs md:text-[11px] text-text-muted hover:bg-surface-overlay cursor-pointer"
          >
            <span className="px-2 py-0.5 rounded-md bg-surface-overlay text-text-muted">Sin valor</span>
          </button>
        )}

        {filtered.map(opt => {
          const isSelected = opt === value
          const color = hashColor(opt)
          return (
            <button
              key={opt}
              onClick={(e) => { e.stopPropagation(); handleSelect(opt) }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                isSelected ? 'bg-surface-overlay-hover' : 'hover:bg-surface-overlay'
              }`}
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs md:text-[11px] font-medium ${COLOR_CLASS[color]}`}>
                {opt}
              </span>
              {isSelected && <Check size={12} className="ml-auto text-text-secondary shrink-0" />}
            </button>
          )
        })}

        {showCreate && (
          <button
            onClick={(e) => { e.stopPropagation(); handleCreate() }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs md:text-[11px] text-text-muted hover:bg-surface-overlay cursor-pointer"
          >
            <Plus size={12} className="shrink-0" />
            <span>Crear &ldquo;{query.trim()}&rdquo;</span>
          </button>
        )}
      </PortalDropdown>
    </>
  )
}
