'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

  return (
    <>
      <button
        ref={buttonRef}
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

      {open && pos && typeof window !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-[#1e1e2c] border border-white/[0.08] rounded-lg shadow-2xl py-1 min-w-[160px] max-h-72 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>,
        document.body
      )}
    </>
  )
}
