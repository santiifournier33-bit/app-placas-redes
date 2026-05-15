"use client"

import { useState } from "react"
import * as LucideIcons from "lucide-react"
import { ChevronDown, Check, ChevronRight } from "lucide-react"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import type { Category, MacroCategory } from "@/lib/stores/serviciosStore"

interface CategoryPickerProps {
  value: string
  onChange: (categoryId: string) => void
  placeholder?: string
}

export function CategoryPicker({ value, onChange, placeholder = "Seleccionar categoría" }: CategoryPickerProps) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const { categories, macroCategories } = useServiciosStore()
  const selected = categories.find((c) => c.id === value)

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleOpen = () => {
    if (!open && selected) {
      setExpanded(new Set([selected.macroCategoryId]))
    }
    setOpen((o) => !o)
  }

  const orderedMacros = macroCategories.filter((m) =>
    categories.some((c) => c.macroCategoryId === m.id)
  )
  const orphans = categories.filter(
    (c) => !macroCategories.some((m) => m.id === c.macroCategoryId)
  )

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm hover:bg-white/[0.06] transition-colors"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <CategoryIconChip category={selected} />
            <span className="text-zinc-200">{selected.name}</span>
          </span>
        ) : (
          <span className="text-zinc-500">{placeholder}</span>
        )}
        <ChevronDown size={14} className="text-zinc-500 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-full z-50 bg-[#1e1e2c] border border-white/[0.08] rounded-xl shadow-2xl max-h-72 overflow-y-auto">
            {orderedMacros.map((macro) => {
              const subs = categories.filter((c) => c.macroCategoryId === macro.id)
              const isExpanded = expanded.has(macro.id)
              const MacroIcon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[macro.iconName]
              return (
                <div key={macro.id}>
                  <button
                    type="button"
                    onClick={() => toggleExpand(macro.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <span
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: macro.color + "22" }}
                    >
                      {MacroIcon && <MacroIcon size={11} color={macro.color} />}
                    </span>
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex-1">
                      {macro.name}
                    </span>
                    <span className="text-xs text-zinc-600 mr-1">{subs.length}</span>
                    <ChevronRight
                      size={12}
                      className={`text-zinc-600 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {isExpanded && subs.map((cat) => (
                    <CategoryOption
                      key={cat.id}
                      cat={cat}
                      selected={value === cat.id}
                      onSelect={() => { onChange(cat.id); setOpen(false) }}
                    />
                  ))}
                </div>
              )
            })}

            {orphans.map((cat) => (
              <CategoryOption
                key={cat.id}
                cat={cat}
                selected={value === cat.id}
                onSelect={() => { onChange(cat.id); setOpen(false) }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function CategoryIconChip({ category }: { category: Category }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[category.iconName]
  return (
    <span
      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
      style={{ backgroundColor: category.color + "22" }}
    >
      {Icon && <Icon size={12} color={category.color} />}
    </span>
  )
}

export function MacroIconChip({ macro }: { macro: MacroCategory }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[macro.iconName]
  return (
    <span
      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: macro.color + "22" }}
    >
      {Icon && <Icon size={13} color={macro.color} />}
    </span>
  )
}

function CategoryOption({ cat, selected, onSelect }: { cat: Category; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-2 pl-10 pr-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
    >
      <CategoryIconChip category={cat} />
      <span className={`text-sm flex-1 ${selected ? "text-zinc-100" : "text-zinc-300"}`}>{cat.name}</span>
      {selected && <Check size={12} className="text-blue-400" />}
    </button>
  )
}
