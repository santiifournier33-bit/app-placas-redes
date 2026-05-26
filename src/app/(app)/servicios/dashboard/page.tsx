"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, DollarSign, AlertTriangle, Clock, TrendingUp } from "lucide-react"
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { useServiciosStore } from "@/lib/stores/serviciosStore"
import { getPaymentStatus } from "@/lib/servicios/status"
import { computeInsights } from "@/lib/servicios/insights"
import { InsightCard } from "@/components/servicios/InsightCard"
import { PaymentCard } from "@/components/servicios/PaymentCard"
import { PaymentForm } from "@/components/servicios/PaymentForm"
import { MiniCalendar } from "@/components/servicios/MiniCalendar"
import { formatARS, formatUSD } from "@/components/servicios/CurrencyAmount"
import type { Payment } from "@/lib/stores/serviciosStore"

export default function ServiciosDashboardPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const store = useServiciosStore()
  const { payments, providers, categories } = store
  const [formOpen, setFormOpen] = useState(false)
  const [editPayment, setEditPayment] = useState<Payment | undefined>()

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const insights = useMemo(() => computeInsights(store), [payments, providers, categories]) // eslint-disable-line react-hooks/exhaustive-deps

  const thisMonthPaid = useMemo(() =>
    payments.filter((p) =>
      p.paidDate && isWithinInterval(new Date(p.paidDate), { start: monthStart, end: monthEnd })
    ), [payments, monthStart, monthEnd])

  const gastoMesARS = thisMonthPaid
    .filter((p) => p.currency === "ARS")
    .reduce((s, p) => s + p.amount, 0)
  const gastoMesUSD = thisMonthPaid
    .filter((p) => p.currency === "USD")
    .reduce((s, p) => s + p.amount, 0)

  const vencidos = useMemo(() =>
    payments.filter((p) => getPaymentStatus(p, today) === "vencido"), [payments, today])
  const vencidoMonto = vencidos.reduce((s, p) => s + (p.amountUSD || p.amount), 0)

  const pendientes = useMemo(() =>
    payments.filter((p) => {
      const st = getPaymentStatus(p, today)
      return st === "pendiente" || st === "vence_hoy"
    }), [payments, today])
  const pendienteMonto = pendientes.reduce((s, p) => s + (p.amountUSD || p.amount), 0)

  const upcoming = useMemo(() =>
    payments
      .filter((p) => !p.paidDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 10),
    [payments])

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-surface-overlay rounded-xl" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-text-primary">Servicios</h1>
        <button
          onClick={() => { setEditPayment(undefined); setFormOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo gasto</span>
        </button>
      </div>
      <p className="text-sm text-text-muted mb-5">Dashboard de gastos y vencimientos</p>

      {insights.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1 scrollbar-none">
          {insights.map((i) => <InsightCard key={i.id} insight={i} />)}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KPICard
          label="Gastado este mes"
          icon={<DollarSign size={16} className="text-amber-400" />}
          iconBg="bg-amber-500/10"
        >
          <div className="space-y-0.5">
            {gastoMesARS > 0 && <p className="text-sm font-semibold text-text-primary">{formatARS(gastoMesARS)}</p>}
            {gastoMesUSD > 0 && <p className="text-sm font-semibold text-text-primary">{formatUSD(gastoMesUSD)}</p>}
            {gastoMesARS === 0 && gastoMesUSD === 0 && <p className="text-sm text-text-muted">—</p>}
          </div>
        </KPICard>

        <KPICard
          label="Ingresos (ventas)"
          icon={<TrendingUp size={16} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        >
          <p className="text-sm text-text-muted">Pendiente integración</p>
        </KPICard>

        <KPICard
          label="Vencidos"
          icon={<AlertTriangle size={16} className="text-red-400" />}
          iconBg="bg-red-500/10"
        >
          <p className="text-sm font-semibold text-text-primary">
            {vencidos.length}
            {vencidoMonto > 0 && <span className="text-xs text-text-muted font-normal ml-1">≈ {formatUSD(vencidoMonto)}</span>}
          </p>
        </KPICard>

        <KPICard
          label="Pendientes"
          icon={<Clock size={16} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
        >
          <p className="text-sm font-semibold text-text-primary">
            {pendientes.length}
            {pendienteMonto > 0 && <span className="text-xs text-text-muted font-normal ml-1">≈ {formatUSD(pendienteMonto)}</span>}
          </p>
        </KPICard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Próximos vencimientos</h2>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-border-subtle p-8 text-center text-text-muted text-sm">
              No hay vencimientos pendientes
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((p) => (
                <PaymentCard
                  key={p.id}
                  payment={p}
                  onEdit={(pay) => { setEditPayment(pay); setFormOpen(true) }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">Calendario</h2>
          <MiniCalendar />
        </div>
      </div>

      <button
        onClick={() => { setEditPayment(undefined); setFormOpen(true) }}
        className="fixed bottom-24 right-5 lg:hidden w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-30"
      >
        <Plus size={22} />
      </button>

      {formOpen && (
        <PaymentForm
          payment={editPayment}
          onClose={() => { setFormOpen(false); setEditPayment(undefined) }}
        />
      )}
    </div>
  )
}

function KPICard({ label, icon, iconBg, children }: { label: string; icon: React.ReactNode; iconBg: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-overlay p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
        <span className="text-xs text-text-muted font-medium">{label}</span>
      </div>
      {children}
    </div>
  )
}
