"use client"

import { RotateCcw, Calendar, DollarSign, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { getPaymentStatus } from "@/lib/servicios/status"
import { RECURRENCE_LABELS } from "@/lib/servicios/recurrence"
import { CategoryBadge } from "./CategoryBadge"
import { formatARS, formatUSD } from "./CurrencyAmount"
import type { Provider } from "@/lib/stores/serviciosStore"

interface ProviderCardProps {
  provider: Provider
  onClick?: () => void
}

export function ProviderCard({ provider, onClick }: ProviderCardProps) {
  const { categories, payments } = useServiciosStore()
  const category = categories.find((c) => c.id === provider.categoryId)
  const today = new Date()

  const provPayments = payments.filter((p) => p.providerId === provider.id)
  const pending = provPayments.filter((p) => !p.paidDate)
  const nextDue = [...pending].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]

  const totalARS = provPayments.filter((p) => p.currency === "ARS").reduce((s, p) => s + p.amount, 0)
  const totalUSD = provPayments.filter((p) => p.currency === "USD").reduce((s, p) => s + p.amount, 0)

  const nextStatus = nextDue ? getPaymentStatus(nextDue, today) : null

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-2xl border border-border-subtle hover:border-border-default bg-surface-overlay hover:bg-surface-overlay transition-all cursor-pointer group"
    >
      {/* Category color dot */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: (category?.color ?? "#64748b") + "22" }}
      >
        <span className="text-base font-bold" style={{ color: category?.color ?? "#64748b" }}>
          {provider.name[0]?.toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">{provider.name}</span>
          {category && <CategoryBadge category={category} size="sm" />}
        </div>

        <div className="mt-1 flex items-center gap-3 text-xs text-text-muted flex-wrap">
          {provider.recurrence && provider.recurrence.freq !== "once" && (
            <span className="flex items-center gap-1 text-blue-400/70">
              <RotateCcw size={10} />
              {RECURRENCE_LABELS[provider.recurrence.freq]}
            </span>
          )}
          {nextDue && (
            <span className={`flex items-center gap-1 ${nextStatus === "vencido" ? "text-red-400" : nextStatus === "vence_hoy" ? "text-amber-400" : ""}`}>
              <Calendar size={10} />
              Próximo: {format(new Date(nextDue.dueDate), "d MMM", { locale: es })}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          {totalARS > 0 && <span className="text-xs text-text-secondary font-medium">{formatARS(totalARS)}</span>}
          {totalUSD > 0 && <span className="text-xs text-text-secondary font-medium">{formatUSD(totalUSD)}</span>}
          {totalARS === 0 && totalUSD === 0 && (
            <span className="text-xs text-text-muted flex items-center gap-1"><DollarSign size={10} />Sin gastos</span>
          )}
        </div>
        <div className="text-xs text-text-muted mt-0.5">{provPayments.length} pago{provPayments.length !== 1 ? "s" : ""}</div>
      </div>

      <ChevronRight size={14} className="text-text-muted group-hover:text-text-secondary transition-colors shrink-0" />
    </div>
  )
}
