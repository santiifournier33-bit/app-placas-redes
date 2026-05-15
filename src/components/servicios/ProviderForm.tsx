"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { CategoryPicker } from "./CategoryPicker"
import { RecurrencePicker } from "./RecurrencePicker"
import type { Provider, Recurrence, Currency } from "@/lib/stores/serviciosStore"

interface ProviderFormProps {
  provider?: Provider
  onClose: () => void
  onSaved?: (id: string) => void
}

const REMINDER_OPTIONS = [0, 1, 3, 7, 14, 30]

export function ProviderForm({ provider, onClose, onSaved }: ProviderFormProps) {
  const { addProvider, updateProvider } = useServiciosStore()
  const [name, setName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [notes, setNotes] = useState("")
  const [currency, setCurrency] = useState<Currency>("ARS")
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null)
  const [reminderDays, setReminderDays] = useState<number[]>([7, 3, 1, 0])
  const [tags, setTags] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (provider) {
      setName(provider.name)
      setCategoryId(provider.categoryId)
      setNotes(provider.notes)
      setCurrency(provider.defaultCurrency)
      setRecurrence(provider.recurrence)
      setReminderDays(provider.reminderDaysBefore)
      setTags(provider.tags.join(", "))
    }
  }, [provider])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = "Ingresá un nombre"
    if (!categoryId) e.categoryId = "Seleccioná una categoría"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = {
      name: name.trim(),
      categoryId,
      notes,
      defaultCurrency: currency,
      recurrence,
      reminderDaysBefore: reminderDays,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    }
    let id: string
    if (provider) {
      updateProvider(provider.id, payload)
      id = provider.id
    } else {
      id = addProvider(payload)
    }
    onSaved?.(id)
    onClose()
  }

  const toggleReminder = (d: number) =>
    setReminderDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#16161e] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-semibold text-zinc-100">
            {provider ? "Editar proveedor" : "Nuevo proveedor"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Argenprop, Fibertel..."
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/40"
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">Categoría *</label>
            <CategoryPicker value={categoryId} onChange={setCategoryId} />
            {errors.categoryId && <p className="text-xs text-red-400">{errors.categoryId}</p>}
          </div>

          {/* Moneda default */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">Moneda default</label>
            <div className="flex rounded-xl border border-white/[0.08] overflow-hidden w-fit">
              {(["ARS", "USD"] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                    currency === c ? "bg-blue-500/20 text-blue-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Recurrencia */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">Recurrencia</label>
            <RecurrencePicker value={recurrence} onChange={setRecurrence} />
          </div>

          {/* Recordatorios */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 font-medium">Recordar antes del vencimiento</label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((d) => {
                const label = d === 0 ? "El mismo día" : `${d} días antes`
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleReminder(d)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                      reminderDays.includes(d)
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                        : "border-white/[0.08] text-zinc-500 hover:border-white/[0.15] hover:text-zinc-400"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas opcionales..."
              rows={2}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 font-medium">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ej: recurrente, trimestral"
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06] shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {provider ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  )
}
