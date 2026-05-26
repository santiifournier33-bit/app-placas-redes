"use client"

import { useState } from "react"
import { X, Edit, Trash2, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { getPaymentStatus } from "@/lib/servicios/status"
import { RECURRENCE_LABELS } from "@/lib/servicios/recurrence"
import { CategoryBadge } from "./CategoryBadge"
import { StatusBadge } from "./StatusBadge"
import { CurrencyAmount, formatARS, formatUSD } from "./CurrencyAmount"
import { PaymentForm } from "./PaymentForm"
import type { Provider } from "@/lib/stores/serviciosStore"

type Tab = "historial" | "proximos" | "stats"

interface ProviderDetailProps {
  provider: Provider
  onClose: () => void
  onEdit: (provider: Provider) => void
  onDelete: (id: string) => void
}

export function ProviderDetail({ provider, onClose, onEdit, onDelete }: ProviderDetailProps) {
  const [tab, setTab] = useState<Tab>("proximos")
  const [addPaymentOpen, setAddPaymentOpen] = useState(false)
  const { categories, payments, deleteProvider } = useServiciosStore()
  const category = categories.find((c) => c.id === provider.categoryId)
  const today = new Date()

  const provPayments = payments.filter((p) => p.providerId === provider.id)
  const pending = provPayments.filter((p) => !p.paidDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const history = provPayments.filter((p) => p.paidDate).sort((a, b) => b.paidDate!.localeCompare(a.paidDate!))

  // Stats
  const totalARS = provPayments.filter((p) => p.currency === "ARS").reduce((s, p) => s + p.amount, 0)
  const totalUSD = provPayments.filter((p) => p.currency === "USD").reduce((s, p) => s + p.amount, 0)
  const totalUSDEquiv = provPayments.reduce((s, p) => s + (p.amountUSD || 0), 0)

  const monthlyMap = new Map<string, number>()
  provPayments.forEach((p) => {
    const key = p.paidDate ? p.paidDate.slice(0, 7) : p.dueDate.slice(0, 7)
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (p.amountUSD || 0))
  })
  const monthlyAvg = monthlyMap.size > 0
    ? Array.from(monthlyMap.values()).reduce((s, v) => s + v, 0) / monthlyMap.size
    : 0

  const handleDelete = () => {
    if (confirm(`¿Eliminar proveedor "${provider.name}"? Los gastos asociados se conservarán.`)) {
      deleteProvider(provider.id)
      onDelete(provider.id)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full sm:w-[420px] h-full sm:h-full bg-[#16161e] border-l border-border-default shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border-subtle shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: (category?.color ?? "#64748b") + "22" }}
            >
              <span className="text-base font-bold" style={{ color: category?.color ?? "#64748b" }}>
                {provider.name[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-text-primary leading-tight">{provider.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {category && <CategoryBadge category={category} size="sm" />}
                {provider.recurrence && provider.recurrence.freq !== "once" && (
                  <span className="text-xs text-blue-400/70">{RECURRENCE_LABELS[provider.recurrence.freq]}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onEdit(provider)} className="p-1.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
                <Edit size={14} />
              </button>
              <button onClick={handleDelete} className="p-1.5 text-text-muted hover:text-red-400 transition-colors cursor-pointer">
                <Trash2 size={14} />
              </button>
              <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notes */}
          {provider.notes && (
            <div className="px-5 py-3 text-sm text-text-secondary border-b border-border-subtle shrink-0">
              {provider.notes}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-border-subtle shrink-0">
            {(["proximos", "historial", "stats"] as Tab[]).map((t) => {
              const labels = { proximos: "Próximos", historial: "Historial", stats: "Stats" }
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t ? "text-text-primary border-b-2 border-blue-500" : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {labels[t]}
                  {t === "proximos" && pending.length > 0 && (
                    <span className="ml-1 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{pending.length}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {tab === "proximos" && (
              <div className="space-y-2">
                {pending.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">No hay pagos pendientes</p>
                ) : (
                  pending.map((p) => {
                    const status = getPaymentStatus(p, today)
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-overlay border border-border-subtle">
                        <div>
                          <div className="text-xs text-text-secondary">
                            {format(new Date(p.dueDate), "d MMM yyyy", { locale: es })}
                          </div>
                          <StatusBadge status={status} size="sm" />
                        </div>
                        <CurrencyAmount amount={p.amount} currency={p.currency} className="text-sm font-medium text-text-primary" />
                      </div>
                    )
                  })
                )}
                <button
                  onClick={() => setAddPaymentOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors py-1"
                >
                  <Plus size={12} /> Agregar pago
                </button>
              </div>
            )}

            {tab === "historial" && (
              <div className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">Sin pagos registrados</p>
                ) : (
                  history.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-overlay border border-border-subtle">
                      <div>
                        <div className="text-xs text-text-secondary">
                          Pagado {format(new Date(p.paidDate!), "d MMM yyyy", { locale: es })}
                        </div>
                        <div className="text-xs text-text-muted">
                          Venció {format(new Date(p.dueDate), "d MMM", { locale: es })}
                        </div>
                      </div>
                      <CurrencyAmount amount={p.amount} currency={p.currency} amountUSD={p.amountUSD} showBoth className="text-sm font-medium text-text-primary" />
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "stats" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Total ARS" value={totalARS > 0 ? formatARS(totalARS) : "—"} />
                  <StatCard label="Total USD" value={totalUSD > 0 ? formatUSD(totalUSD) : "—"} />
                  <StatCard label="Total equiv USD" value={totalUSDEquiv > 0 ? formatUSD(totalUSDEquiv) : "—"} />
                  <StatCard label="Promedio mensual" value={monthlyAvg > 0 ? formatUSD(monthlyAvg) : "—"} />
                </div>
                <div className="p-3 rounded-xl bg-surface-overlay border border-border-subtle">
                  <p className="text-xs text-text-muted mb-1">Total de pagos</p>
                  <p className="text-2xl font-bold text-text-primary">{provPayments.length}</p>
                  <p className="text-xs text-text-muted mt-0.5">{pending.length} pendientes · {history.length} pagados</p>
                </div>
                {provider.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted mb-1.5">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-surface-overlay text-xs text-text-secondary border border-border-subtle">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {addPaymentOpen && (
        <PaymentForm
          onClose={() => setAddPaymentOpen(false)}
        />
      )}
    </>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface-overlay border border-border-subtle">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  )
}
