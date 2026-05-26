"use client"

import { useState, useEffect } from "react"
import { X, Plus } from "lucide-react"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { CategoryPicker } from "./CategoryPicker"
import { RecurrencePicker } from "./RecurrencePicker"
import { AttachmentList } from "./AttachmentList"
import type { Payment, Recurrence, Attachment, Currency } from "@/lib/stores/serviciosStore"

interface PaymentFormProps {
  payment?: Payment
  onClose: () => void
  onSaved?: (id: string) => void
}

const EMPTY_FORM = {
  amount: "",
  currency: "ARS" as Currency,
  categoryId: "",
  dueDate: "",
  notes: "",
  tags: "",
  attachments: [] as Attachment[],
  recurrence: null as Recurrence | null,
}

export function PaymentForm({ payment, onClose, onSaved }: PaymentFormProps) {
  const { addPayment, updatePayment, getCurrentRate } = useServiciosStore()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (payment) {
      setForm({
        amount: String(payment.amount),
        currency: payment.currency,
        categoryId: payment.categoryId,
        dueDate: payment.dueDate.slice(0, 10),
        notes: payment.notes,
        tags: payment.tags.join(", "),
        attachments: payment.attachments,
        recurrence: null,
      })
    }
  }, [payment])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      e.amount = "Ingresá un monto válido"
    }
    if (!form.categoryId) e.categoryId = "Seleccioná una categoría"
    if (!form.dueDate) e.dueDate = "Ingresá la fecha de vencimiento"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const buildPayload = () => {
    const rate = getCurrentRate()
    const amount = parseFloat(form.amount)
    const exchangeRate = form.currency === "ARS" ? (rate?.blueBuy ?? null) : null
    return {
      amount,
      currency: form.currency,
      categoryId: form.categoryId,
      dueDate: form.dueDate + "T12:00:00",
      providerId: null,
      notes: form.notes,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      attachments: form.attachments,
      exchangeRate,
      exchangeRateDate: exchangeRate ? new Date().toISOString().slice(0, 10) : null,
      paidDate: null,
    }
  }

  const handleSave = () => {
    if (!validate()) return
    const payload = buildPayload()
    let id: string
    if (payment) {
      updatePayment(payment.id, payload)
      id = payment.id
    } else {
      id = addPayment(payload)
    }
    onSaved?.(id)
    onClose()
  }

  const handleSaveAndMore = () => {
    if (!validate()) return
    const id = addPayment(buildPayload())
    onSaved?.(id)
    setForm({ ...EMPTY_FORM })
    setErrors({})
  }

  const set = <K extends keyof typeof EMPTY_FORM>(key: K, val: typeof EMPTY_FORM[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#16161e] border border-border-default rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-semibold text-text-primary">
            {payment ? "Editar gasto" : "Nuevo gasto"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-4">

          {/* Monto + Moneda */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Monto *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                  {form.currency === "ARS" ? "$" : "US$"}
                </span>
                <input
                  type="number" inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-blue-500/40"
                />
              </div>
              <div className="flex rounded-xl border border-border-default overflow-hidden">
                {(["ARS", "USD"] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("currency", c)}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      form.currency === c ? "bg-blue-500/20 text-blue-400" : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Categoría *</label>
            <CategoryPicker value={form.categoryId} onChange={(id) => set("categoryId", id)} />
            {errors.categoryId && <p className="text-xs text-red-400">{errors.categoryId}</p>}
          </div>

          {/* Fecha vencimiento */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Fecha de vencimiento *</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              className="w-full px-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm text-text-primary focus:outline-none focus:border-blue-500/40 [color-scheme:dark]"
            />
            {errors.dueDate && <p className="text-xs text-red-400">{errors.dueDate}</p>}
          </div>

          {/* Recurrencia */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Recurrencia</label>
            <RecurrencePicker value={form.recurrence} onChange={(r) => set("recurrence", r)} />
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Notas opcionales..."
              rows={2}
              className="w-full px-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-blue-500/40 resize-none"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="Ej: urgente, mensual, fijo"
              className="w-full px-3 py-2 bg-surface-overlay border border-border-default rounded-xl text-sm text-text-primary placeholder-zinc-600 focus:outline-none focus:border-blue-500/40"
            />
            <p className="text-xs text-text-muted">Separados por coma</p>
          </div>

          {/* Adjuntos */}
          <div className="space-y-1">
            <label className="text-xs text-text-muted font-medium">Adjuntos</label>
            <AttachmentList attachments={form.attachments} onChange={(a) => set("attachments", a)} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border-subtle shrink-0">
          {!payment && (
            <button
              type="button"
              onClick={handleSaveAndMore}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary border border-border-default rounded-xl hover:bg-surface-overlay transition-colors"
            >
              <Plus size={12} />
              Crear y agregar otro
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {payment ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  )
}
