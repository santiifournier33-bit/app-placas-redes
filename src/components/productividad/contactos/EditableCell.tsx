'use client'

import { useState, useRef, useEffect } from 'react'

type CellType = 'text' | 'select' | 'boolean' | 'number' | 'date'

interface EditableCellProps {
  value: string | number | boolean | null | undefined
  type?: CellType
  options?: { value: string; label: string }[]
  onSave: (value: string | number | boolean | null) => void
  className?: string
  placeholder?: string
}

export function EditableCell({
  value,
  type = 'text',
  options,
  onSave,
  className = '',
  placeholder = '—',
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const display = (() => {
    if (type === 'boolean') return null
    if (type === 'select' && options) {
      return options.find(o => o.value === String(value))?.label ?? String(value ?? '')
    }
    if (value === null || value === undefined || value === '') return placeholder
    return String(value)
  })()

  const commit = (val?: string) => {
    const raw = val ?? draft
    setEditing(false)
    if (type === 'number') {
      const n = parseFloat(raw)
      onSave(isNaN(n) ? null : n)
    } else {
      onSave(raw || null)
    }
  }

  if (type === 'boolean') {
    return (
      <button
        onClick={() => onSave(!value)}
        className={`flex justify-start items-center px-2 py-1 cursor-pointer ${className}`}
      >
        <div className={`w-4 h-4 rounded border transition-colors ${
          value
            ? 'bg-blue-500 border-blue-500'
            : 'border-zinc-600 bg-transparent'
        }`}>
          {value && (
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-white">
              <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
    )
  }

  if (!editing) {
    return (
      <div
        onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
        className={`cursor-pointer truncate px-2 py-1 rounded hover:bg-surface-overlay-hover transition-colors min-h-[28px] flex items-center ${
          display === placeholder ? 'text-zinc-700' : 'text-text-secondary'
        } ${className}`}
      >
        {display}
      </div>
    )
  }

  if (type === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(e) => { setDraft(e.target.value); commit(e.target.value) }}
        onBlur={() => setEditing(false)}
        className={`w-full bg-surface-overlay-hover rounded px-2 py-1 text-xs text-text-secondary outline-none border border-blue-500/40 [color-scheme:dark] ${className}`}
      >
        <option value="">—</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setEditing(false)
      }}
      className={`w-full bg-surface-overlay-hover rounded px-2 py-1 text-xs text-text-secondary outline-none border border-blue-500/40 [color-scheme:dark] ${className}`}
    />
  )
}
