"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, Medal, Trophy, Target, RefreshCw } from "lucide-react"

interface AgentBalance {
  email: string
  name: string
  isActive: boolean
  monthly: { facturacion: number, lados: number, captaciones: number }[]
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function BalanceTab() {
  const [balance, setBalance] = useState<AgentBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [metric, setMetric] = useState<'facturacion' | 'lados' | 'captaciones'>('facturacion')
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ventas/balance?year=${selectedYear}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBalance(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [selectedYear])

  useEffect(() => { fetchBalance() }, [fetchBalance])

  // Rankings
  const totals = balance.map(agent => ({
    ...agent,
    totalFact: agent.monthly.reduce((s, m) => s + m.facturacion, 0),
    totalLados: agent.monthly.reduce((s, m) => s + m.lados, 0),
    totalCapt: agent.monthly.reduce((s, m) => s + m.captaciones, 0),
  }))

  const topFact = [...totals].sort((a, b) => b.totalFact - a.totalFact).slice(0, 3)
  const topCapt = [...totals].sort((a, b) => b.totalCapt - a.totalCapt).slice(0, 3)
  const topLados = [...totals].sort((a, b) => b.totalLados - a.totalLados).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Balance Anual {selectedYear}</h3>
          <p className="text-sm text-text-muted">Desempeño mensual por asesor</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={metric}
            onChange={e => setMetric(e.target.value as any)}
            className="bg-surface-1 border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none cursor-pointer"
          >
            <option value="facturacion">Facturación (USD)</option>
            <option value="lados">Lados</option>
            <option value="captaciones">Captaciones</option>
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="bg-surface-1 border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none cursor-pointer"
          >
            {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={fetchBalance} className="p-2 rounded-xl bg-surface-1 border border-border-subtle text-text-muted hover:text-text-primary transition-colors cursor-pointer">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div>}

      {/* Table */}
      <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border-subtle bg-black/20">
                <th className="p-3 text-xs md:text-[11px] font-semibold text-text-muted sticky left-0 bg-[#0a0a10] z-10 min-w-[140px]">Asesor</th>
                {MONTHS.map(m => (
                  <th key={m} className="p-3 text-xs md:text-[11px] font-semibold text-text-muted text-right w-[60px]">{m}</th>
                ))}
                <th className="p-3 text-xs md:text-[11px] font-semibold text-shell-accent text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-sm text-text-muted">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-6 h-6 border-2 border-shell-accent border-t-transparent rounded-full animate-spin mb-2" />
                      Calculando balance...
                    </div>
                  </td>
                </tr>
              ) : balance.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-sm text-text-muted">
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3 mx-auto">
                      <TrendingUp size={22} className="text-text-muted" />
                    </div>
                    <p className="font-medium text-text-primary mb-1">Sin datos para {selectedYear}</p>
                    <p className="text-xs">Los datos aparecerán a medida que cargues operaciones y actividades.</p>
                  </td>
                </tr>
              ) : (
                totals.map(agent => {
                  const total = metric === 'facturacion' ? agent.totalFact
                    : metric === 'lados' ? agent.totalLados
                    : agent.totalCapt

                  return (
                    <tr key={agent.email} className={`border-b border-border-subtle/50 hover:bg-surface-overlay transition-colors ${!agent.isActive ? 'opacity-50' : ''}`}>
                      <td className="p-3 sticky left-0 bg-[#0d0d15] z-10">
                        <p className="text-sm font-medium text-text-primary truncate">{agent.name}</p>
                        {!agent.isActive && <span className="text-xs md:text-[9px] text-red-400">Inactivo</span>}
                      </td>
                      {agent.monthly.map((m, i) => {
                        const val = metric === 'facturacion' ? m.facturacion
                          : metric === 'lados' ? m.lados
                          : m.captaciones

                        return (
                          <td key={i} className="p-3 text-right">
                            <span className={`text-xs font-medium ${val > 0 ? 'text-text-primary' : 'text-text-muted/30'}`}>
                              {metric === 'facturacion'
                                ? (val > 0 ? `$${(val / 1000).toFixed(1)}k` : '-')
                                : (val > 0 ? val : '-')
                              }
                            </span>
                          </td>
                        )
                      })}
                      <td className="p-3 text-right">
                        <span className={`text-sm font-bold ${total > 0 ? 'text-shell-accent' : 'text-text-muted/30'}`}>
                          {metric === 'facturacion'
                            ? (total > 0 ? `$${total.toLocaleString()}` : '-')
                            : (total > 0 ? total : '-')
                          }
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rankings */}
      {!isLoading && balance.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RankingCard icon={<Trophy size={16} className="text-amber-500" />} iconBg="bg-amber-500/10" title="Top Facturación" items={topFact.map(a => ({ name: a.name, value: `USD ${a.totalFact.toLocaleString()}` }))} />
          <RankingCard icon={<Target size={16} className="text-violet-400" />} iconBg="bg-violet-500/10" title="Top Captaciones" items={topCapt.map(a => ({ name: a.name, value: `${a.totalCapt} capt.` }))} />
          <RankingCard icon={<Medal size={16} className="text-blue-400" />} iconBg="bg-blue-500/10" title="Top Lados" items={topLados.map(a => ({ name: a.name, value: `${a.totalLados} lados` }))} />
        </div>
      )}
    </div>
  )
}

function RankingCard({ icon, iconBg, title, items }: { icon: React.ReactNode, iconBg: string, title: string, items: { name: string, value: string }[] }) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center`}>{icon}</div>
        <h4 className="font-semibold text-sm text-text-primary">{title}</h4>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-text-muted">
              <span className="mr-1.5">{medals[i]}</span>
              {item.name}
            </span>
            <span className="font-medium text-text-primary">{item.value}</span>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-text-muted">Sin datos</p>}
      </div>
    </div>
  )
}
