"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { PeriodSelector, type Period } from "@/components/servicios/charts/PeriodSelector"

// Charts pull in recharts (~heavy). Load them only when rendered, never on
// First Load. ssr:false because recharts needs a DOM to measure.
const chartLoading = () => (
  <div className="h-72 w-full animate-pulse rounded-xl bg-surface-overlay-hover" />
)
const GeneralChart = dynamic(
  () => import("@/components/servicios/charts/GeneralChart").then((m) => m.GeneralChart),
  { ssr: false, loading: chartLoading },
)
const GastosChart = dynamic(
  () => import("@/components/servicios/charts/GastosChart").then((m) => m.GastosChart),
  { ssr: false, loading: chartLoading },
)
const IngresosChart = dynamic(
  () => import("@/components/servicios/charts/IngresosChart").then((m) => m.IngresosChart),
  { ssr: false, loading: chartLoading },
)

type ChartTab = "general" | "gastos" | "ingresos"

export default function GraficosPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [tab, setTab] = useState<ChartTab>("general")
  const [period, setPeriod] = useState<Period>("month")

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-surface-overlay rounded-xl" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-5">Gráficos</h1>

      {/* Chart tabs */}
      <div className="flex gap-1 mb-4">
        {(["general", "gastos", "ingresos"] as ChartTab[]).map((t) => {
          const labels = { general: "General", gastos: "Gastos", ingresos: "Ingresos" }
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-surface-overlay-hover text-text-primary border border-border-default"
                  : "text-text-muted hover:text-text-secondary border border-transparent"
              }`}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* Period selector */}
      <div className="mb-5">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border-subtle bg-surface-overlay p-4">
        {tab === "general" && <GeneralChart period={period} />}
        {tab === "gastos" && <GastosChart period={period} />}
        {tab === "ingresos" && <IngresosChart period={period} />}
      </div>

      {/* Legend note */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-text-muted">
        {tab === "general" && (
          <>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10b981]" />Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" />Gastos</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" />Beneficio</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ef4444]" />Pérdida</span>
          </>
        )}
        {tab === "gastos" && (
          <span>Gastos agrupados por categoría (stacked)</span>
        )}
      </div>
    </div>
  )
}
