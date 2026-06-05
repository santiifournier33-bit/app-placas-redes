"use client"

import { useState, useMemo } from "react"
import * as LucideIcons from "lucide-react"
import { useHydrated } from "@/lib/hooks/useHydrated"
import {
  Plus, ChevronDown, ChevronRight, Edit2, Trash2, X, Check, GripVertical,
} from "lucide-react"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { ICON_SET, COLOR_PRESETS } from "@/lib/servicios/categories-seed"
import type { MacroCategory, Category } from "@/lib/stores/serviciosStore"

// ── Icon + color pickers ──────────────────────────────────────────────────────

function IconPicker({ value, onChange, color }: { value: string; onChange: (v: string) => void; color: string }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {ICON_SET.map(({ name }) => {
        const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[name]
        if (!Icon) return null
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            title={name}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              value === name ? "ring-1 bg-surface-overlay-hover" : "hover:bg-surface-overlay"
            }`}
            style={value === name ? { outline: `1.5px solid ${color}` } : {}}
          >
            <Icon size={14} color={value === name ? color : "#71717a"} />
          </button>
        )
      })}
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PRESETS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-6 h-6 rounded-full transition-all ${value === c ? "ring-2 ring-offset-1 ring-offset-[#16161e]" : "hover:scale-110"}`}
          style={{ backgroundColor: c, ...(value === c ? { ringColor: c } : {}) }}
        />
      ))}
      <label className="w-6 h-6 rounded-full border border-white/[0.15] flex items-center justify-center cursor-pointer hover:bg-surface-overlay transition-colors overflow-hidden" title="Color personalizado">
        <span className="text-xs md:text-[9px] text-text-secondary">+</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="opacity-0 absolute w-0 h-0"
        />
      </label>
    </div>
  )
}

// ── Macro form ────────────────────────────────────────────────────────────────

interface MacroFormProps {
  initial?: MacroCategory
  onSave: (data: { name: string; iconName: string; color: string }) => void
  onCancel: () => void
}

function MacroForm({ initial, onSave, onCancel }: MacroFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [iconName, setIconName] = useState(initial?.iconName ?? "Tag")
  const [color, setColor] = useState(initial?.color ?? "#3b82f6")
  const [error, setError] = useState("")

  const handleSave = () => {
    if (!name.trim()) { setError("Nombre requerido"); return }
    onSave({ name: name.trim(), iconName, color })
  }

  return (
    <div className="p-4 rounded-2xl border border-border-default bg-surface-overlay space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-text-muted font-medium">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError("") }}
          placeholder="Ej: Oficina, Operaciones..."
          autoFocus
          className="w-full px-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-blue-500/40"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-text-muted font-medium">Color</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-text-muted font-medium">Ícono</label>
        <IconPicker value={iconName} onChange={setIconName} color={color} />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {initial ? "Guardar" : "Crear categoría"}
        </button>
      </div>
    </div>
  )
}

// ── Subcategory form ──────────────────────────────────────────────────────────

interface SubFormProps {
  initial?: Category
  macroCategoryId: string
  macroCategories: MacroCategory[]
  onSave: (data: { name: string; iconName: string; color: string; macroCategoryId: string }) => void
  onCancel: () => void
}

function SubForm({ initial, macroCategoryId, macroCategories, onSave, onCancel }: SubFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [iconName, setIconName] = useState(initial?.iconName ?? "Tag")
  const [color, setColor] = useState(initial?.color ?? "#64748b")
  const [macroId, setMacroId] = useState(initial?.macroCategoryId ?? macroCategoryId)
  const [error, setError] = useState("")

  const handleSave = () => {
    if (!name.trim()) { setError("Nombre requerido"); return }
    onSave({ name: name.trim(), iconName, color, macroCategoryId: macroId })
  }

  return (
    <div className="ml-8 p-3 rounded-xl border border-border-subtle bg-white/[0.01] space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-text-muted font-medium">Nombre *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError("") }}
          placeholder="Ej: Publicidad paga, CRM..."
          autoFocus
          className="w-full px-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-blue-500/40"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {initial && (
        <div className="space-y-1">
          <label className="text-xs text-text-muted font-medium">Categoría macro</label>
          <select
            value={macroId}
            onChange={(e) => setMacroId(e.target.value)}
            className="w-full px-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm text-text-secondary focus:outline-none [color-scheme:dark]"
          >
            {macroCategories.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-text-muted font-medium">Color</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-text-muted font-medium">Ícono</label>
          <div className="grid grid-cols-5 gap-1">
            {ICON_SET.slice(0, 20).map(({ name: n }) => {
              const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[n]
              if (!Icon) return null
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setIconName(n)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                    iconName === n ? "bg-surface-overlay-hover" : "hover:bg-surface-overlay"
                  }`}
                  style={iconName === n ? { outline: `1.5px solid ${color}`, borderRadius: 6 } : {}}
                >
                  <Icon size={12} color={iconName === n ? color : "#71717a"} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {initial ? "Guardar" : "Crear subcategoría"}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CategoriasPage() {
  const mounted = useHydrated()

  const {
    macroCategories, categories, payments,
    addMacroCategory, updateMacroCategory, deleteMacroCategory,
    addCategory, updateCategory, deleteCategory,
  } = useServiciosStore()

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["macro-oficina", "macro-marketing"]))
  const [addingMacro, setAddingMacro] = useState(false)
  const [editingMacro, setEditingMacro] = useState<string | null>(null)
  const [addingSub, setAddingSub] = useState<string | null>(null) // macroCategoryId
  const [editingSub, setEditingSub] = useState<string | null>(null) // category id
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const paymentCounts = useMemo(() => {
    const map = new Map<string, number>()
    payments.forEach((p) => {
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1)
    })
    return map
  }, [payments])

  const subcatsByMacro = useMemo(() => {
    const map = new Map<string, Category[]>()
    macroCategories.forEach((m) => map.set(m.id, []))
    categories.forEach((c) => {
      const arr = map.get(c.macroCategoryId)
      if (arr) arr.push(c)
    })
    return map
  }, [macroCategories, categories])

  const orphans = useMemo(
    () => categories.filter((c) => !macroCategories.some((m) => m.id === c.macroCategoryId)),
    [categories, macroCategories]
  )

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleDeleteMacro = (macro: MacroCategory) => {
    const subs = subcatsByMacro.get(macro.id) ?? []
    if (subs.length > 0) {
      setDeleteError(`No se puede eliminar "${macro.name}": tiene ${subs.length} subcategoría${subs.length > 1 ? "s" : ""}. Eliminá o movés las subcategorías primero.`)
      setTimeout(() => setDeleteError(null), 4000)
      return
    }
    if (!confirm(`¿Eliminar categoría "${macro.name}"?`)) return
    deleteMacroCategory(macro.id)
  }

  const handleDeleteSub = (cat: Category) => {
    const count = paymentCounts.get(cat.id) ?? 0
    const msg = count > 0
      ? `¿Eliminar "${cat.name}"? Tiene ${count} gasto${count > 1 ? "s" : ""} asociado${count > 1 ? "s" : ""} que quedarán sin categoría.`
      : `¿Eliminar "${cat.name}"?`
    if (!confirm(msg)) return
    deleteCategory(cat.id)
  }

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-surface-overlay rounded-xl" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Categorías</h1>
          <p className="text-xs text-text-muted mt-0.5">{macroCategories.length} categorías · {categories.length} subcategorías</p>
        </div>
        <button
          onClick={() => { setAddingMacro(true); setEditingMacro(null) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nueva categoría</span>
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
          <X size={12} className="mt-0.5 shrink-0 text-red-400" />
          {deleteError}
        </div>
      )}

      {/* Add macro form */}
      {addingMacro && (
        <div className="mb-4">
          <MacroForm
            onSave={(data) => { addMacroCategory(data); setAddingMacro(false) }}
            onCancel={() => setAddingMacro(false)}
          />
        </div>
      )}

      {/* Macro list */}
      <div className="space-y-2">
        {macroCategories.map((macro) => {
          const subs = subcatsByMacro.get(macro.id) ?? []
          const isExpanded = expanded.has(macro.id)
          const isEditingThis = editingMacro === macro.id
          const MacroIcon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[macro.iconName]

          return (
            <div key={macro.id} className="rounded-2xl border border-border-subtle overflow-hidden">
              {/* Macro row */}
              {isEditingThis ? (
                <div className="p-3">
                  <MacroForm
                    initial={macro}
                    onSave={(data) => { updateMacroCategory(macro.id, data); setEditingMacro(null) }}
                    onCancel={() => setEditingMacro(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-overlay hover:bg-surface-overlay transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleExpand(macro.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: macro.color + "22" }}
                    >
                      {MacroIcon && <MacroIcon size={16} color={macro.color} />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-semibold text-text-primary">{macro.name}</span>
                      <span className="ml-2 text-xs text-text-muted">{subs.length} subcategoría{subs.length !== 1 ? "s" : ""}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-text-muted transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                    />
                  </button>
                  <div className="flex items-center gap-0.5 ml-2">
                    <button
                      onClick={() => { setEditingMacro(macro.id); setAddingMacro(false) }}
                      className="p-1.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer rounded-lg hover:bg-surface-overlay"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>
                    {macro.isCustom && (
                      <button
                        onClick={() => handleDeleteMacro(macro)}
                        className="p-1.5 text-text-muted hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-500/10"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Subcategories */}
              {isExpanded && !isEditingThis && (
                <div className="border-t border-border-subtle">
                  {subs.map((cat) => {
                    const SubIcon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[cat.iconName]
                    const count = paymentCounts.get(cat.id) ?? 0
                    const isEditingThisSub = editingSub === cat.id

                    if (isEditingThisSub) {
                      return (
                        <div key={cat.id} className="px-4 py-3">
                          <SubForm
                            initial={cat}
                            macroCategoryId={macro.id}
                            macroCategories={macroCategories}
                            onSave={(data) => { updateCategory(cat.id, data); setEditingSub(null) }}
                            onCancel={() => setEditingSub(null)}
                          />
                        </div>
                      )
                    }

                    return (
                      <div
                        key={cat.id}
                        className="flex items-center gap-3 pl-14 pr-4 py-2.5 hover:bg-surface-overlay transition-colors group border-b border-white/[0.03] last:border-0"
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: cat.color + "22" }}
                        >
                          {SubIcon && <SubIcon size={12} color={cat.color} />}
                        </div>
                        <span className="text-sm text-text-secondary flex-1">{cat.name}</span>
                        {count > 0 && (
                          <span className="text-xs text-text-muted">{count} gasto{count !== 1 ? "s" : ""}</span>
                        )}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingSub(cat.id); setAddingSub(null) }}
                            className="p-1 text-text-muted hover:text-text-secondary transition-colors cursor-pointer rounded-md hover:bg-surface-overlay"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteSub(cat)}
                            className="p-1 text-text-muted hover:text-red-400 transition-colors cursor-pointer rounded-md hover:bg-red-500/10"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add sub form */}
                  {addingSub === macro.id ? (
                    <div className="px-4 py-3">
                      <SubForm
                        macroCategoryId={macro.id}
                        macroCategories={macroCategories}
                        onSave={(data) => { addCategory(data); setAddingSub(null) }}
                        onCancel={() => setAddingSub(null)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAddingSub(macro.id); setEditingSub(null) }}
                      className="flex items-center gap-2 pl-14 pr-4 py-2.5 text-xs text-text-muted hover:text-text-secondary transition-colors w-full text-left"
                    >
                      <Plus size={11} />
                      Agregar subcategoría
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Orphaned subcategories */}
        {orphans.length > 0 && (
          <div className="rounded-2xl border border-border-subtle overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-overlay">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-zinc-500/10">
                <GripVertical size={16} className="text-text-muted" />
              </div>
              <span className="text-sm font-semibold text-text-secondary">Sin categoría macro</span>
              <span className="text-xs text-text-muted">{orphans.length} subcategoría{orphans.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="border-t border-border-subtle">
              {orphans.map((cat) => {
                const SubIcon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[cat.iconName]
                const count = paymentCounts.get(cat.id) ?? 0
                return (
                  <div key={cat.id} className="flex items-center gap-3 pl-14 pr-4 py-2.5 hover:bg-surface-overlay transition-colors group">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "22" }}>
                      {SubIcon && <SubIcon size={12} color={cat.color} />}
                    </div>
                    <span className="text-sm text-text-secondary flex-1">{cat.name}</span>
                    {count > 0 && <span className="text-xs text-text-muted">{count} gastos</span>}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingSub(cat.id); setAddingSub(null) }} className="p-1 text-text-muted hover:text-text-secondary rounded-md hover:bg-surface-overlay">
                        <Edit2 size={11} />
                      </button>
                      <button onClick={() => handleDeleteSub(cat)} className="p-1 text-text-muted hover:text-red-400 rounded-md hover:bg-red-500/10">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
