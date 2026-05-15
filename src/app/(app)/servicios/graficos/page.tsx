"use client"

import { useState, useEffect } from "react"
import { PeriodSelector, type Period } from "@/components/servicios/charts/PeriodSelector"
import { GeneralChart } from "@/components/servicios/charts/GeneralChart"
import { GastosChart } from "@/components/servicios/charts/GastosChart"
import { IngresosChart } from "@/components/servicios/charts/IngresosChart"

type ChartTab = "general" | "gastos" | "ingresos"

export default function GraficosPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [tab, setTab] = useState<ChartTab>("general")
  const [period, setPeriod] = useState<Period>("month")

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-white/[0.04] rounded-xl" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-6">
      <h1 className="text-2xl font-bold text-shell-text mb-5">Gráficos</h1>

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
                  ? "bg-white/[0.08] text-zinc-100 border border-white/[0.1]"
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
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
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        {tab === "general" && <GeneralChart period={period} />}
        {tab === "gastos" && <GastosChart period={period} />}
        {tab === "ingresos" && <IngresosChart period={period} />}
      </div>

      {/* Legend note */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-600">
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
