'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export type ChipColor =
  | 'zinc' | 'violet' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'red' | 'pink'

const COLOR_CLASS: Record<ChipColor, string> = {
  zinc:    'bg-zinc-500/15 text-zinc-300',
  violet:  'bg-violet-500/15 text-violet-300',
  blue:    'bg-blue-500/15 text-blue-300',
  cyan:    'bg-cyan-500/15 text-cyan-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  amber:   'bg-amber-500/15 text-amber-300',
  red:     'bg-red-500/15 text-red-300',
  pink:    'bg-pink-500/15 text-pink-300',
}

const COLOR_HOVER: Record<ChipColor, string> = {
  zinc:    'hover:bg-zinc-500/25',
  violet:  'hover:bg-violet-500/25',
  blue:    'hover:bg-blue-500/25',
  cyan:    'hover:bg-cyan-500/25',
  emerald: 'hover:bg-emerald-500/25',
  amber:   'hover:bg-amber-500/25',
  red:     'hover:bg-red-500/25',
  pink:    'hover:bg-pink-500/25',
}

interface ChipOption {
  value: string
  label: string
  color?: ChipColor
}

interface InlineSelectChipProps {
  value: string | null | undefined
  options: ChipOption[]
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    const scroll = () => setOpen(false)
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', scroll)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', scroll)
    }
  }, [open])

  const selected = options.find(o => o.value === value)
  const selectedColor: ChipColor = selected?.color ?? 'zinc'
  const triggerClass = selected
    ? `${COLOR_CLASS[selectedColor]} ${COLOR_HOVER[selectedColor]}`
    : 'bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]'

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${triggerClass}`}
      >
        <span className="truncate max-w-[140px]">{selected?.label ?? placeholder}</span>
        <ChevronDown size={10} className="shrink-0 opacity-70" />
      </button>

      {open && pos && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-[#1e1e2c] border border-white/[0.08] rounded-xl shadow-2xl p-1.5 min-w-[180px] max-h-72 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {value && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-zinc-500 hover:bg-white/[0.04] cursor-pointer"
            >
              <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-500">Sin valor</span>
            </button>
          )}
          {options.map(opt => {
            const isSelected = opt.value === value
            const color: ChipColor = opt.color ?? 'zinc'
            return (
              <button
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); onChange(opt.value); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${COLOR_CLASS[color]}`}>
                  {opt.label}
                </span>
                {isSelected && <Check size={12} className="ml-auto text-zinc-400 shrink-0" />}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
