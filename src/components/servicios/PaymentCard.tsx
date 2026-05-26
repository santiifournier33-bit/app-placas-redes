"use client"

import { Check, Calendar, Paperclip, Tag, RotateCcw, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { getPaymentStatus, daysUntilDue } from "@/lib/servicios/status"
import { CategoryBadge } from "./CategoryBadge"
import { StatusBadge } from "./StatusBadge"
import { CurrencyAmount } from "./CurrencyAmount"
import type { Payment } from "@/lib/stores/serviciosStore"

interface PaymentCardProps {
  payment: Payment
  onEdit?: (payment: Payment) => void
  compact?: boolean
}

export function PaymentCard({ payment, onEdit, compact = false }: PaymentCardProps) {
  const { categories, providers, markAsPaid, deletePayment } = useServiciosStore()
  const today = new Date()
  const status = getPaymentStatus(payment, today)
  const category = categories.find((c) => c.id === payment.categoryId)
  const provider = providers.find((p) => p.id === payment.providerId)
  const days = daysUntilDue(payment, today)

  const handleMarkPaid = (e: React.MouseEvent) => {
    e.stopPropagation()
    markAsPaid(payment.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) {
      deletePayment(payment.id)
    }
  }

  const dueDateLabel = (() => {
    if (status === "pagado") {
      return `Pagado ${format(new Date(payment.paidDate!), "d MMM", { locale: es })}`
    }
    if (status === "vencido") {
      return `Venció ${format(new Date(payment.dueDate), "d MMM", { locale: es })} (${Math.abs(days)}d)`
    }
    if (status === "vence_hoy") return "Vence hoy"
    if (days <= 7) return `Vence en ${days}d`
    return format(new Date(payment.dueDate), "d MMM yyyy", { locale: es })
  })()

  if (compact) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-overlay transition-colors cursor-pointer group"
        onClick={() => onEdit?.(payment)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {category && <CategoryBadge category={category} size="sm" />}
            {provider && <span className="text-xs text-text-muted truncate">{provider.name}</span>}
          </div>
          <div className="text-xs text-text-muted mt-0.5">{dueDateLabel}</div>
        </div>
        <CurrencyAmount amount={payment.amount} currency={payment.currency} amountUSD={payment.amountUSD} className="text-text-primary font-medium" />
        {status !== "pagado" && (
          <button
            onClick={handleMarkPaid}
            className="w-6 h-6 rounded-full border border-border-default flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-colors opacity-0 group-hover:opacity-100"
            title="Marcar pagado"
          >
            <Check size={10} className="text-text-secondary" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-2xl border border-border-subtle hover:border-border-default bg-surface-overlay hover:bg-surface-overlay transition-all cursor-pointer group"
      onClick={() => onEdit?.(payment)}
    >
      {/* Check button */}
      <button
        onClick={status === "pagado" ? (e) => e.stopPropagation() : handleMarkPaid}
        disabled={status === "pagado"}
        className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
          status === "pagado"
            ? "bg-emerald-500/20 border-emerald-500/40 cursor-default"
            : "border-border-default hover:bg-emerald-500/20 hover:border-emerald-500/40 cursor-pointer"
        }`}
        title={status === "pagado" ? "Pagado" : "Marcar pagado"}
      >
        <Check size={14} className={status === "pagado" ? "text-emerald-400" : "text-text-muted group-hover:text-text-secondary"} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {category && <CategoryBadge category={category} />}
              <StatusBadge status={status} size="sm" />
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
              {provider && <span className="font-medium text-text-secondary">{provider.name}</span>}
              {payment.notes && <span className="truncate text-text-muted">{payment.notes}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <CurrencyAmount amount={payment.amount} currency={payment.currency} amountUSD={payment.amountUSD} showBoth size="md" className="text-text-primary font-semibold" />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Calendar size={11} />
            {dueDateLabel}
          </span>
          {payment.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip size={11} />
              {payment.attachments.length}
            </span>
          )}
          {payment.tags.length > 0 && (
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {payment.tags.join(", ")}
            </span>
          )}
          {provider?.recurrence && provider.recurrence.freq !== "once" && (
            <span className="flex items-center gap-1 text-blue-400/70">
              <RotateCcw size={11} />
              Recurrente
            </span>
          )}
          <button
            onClick={handleDelete}
            className="ml-auto p-1 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Eliminar gasto"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
