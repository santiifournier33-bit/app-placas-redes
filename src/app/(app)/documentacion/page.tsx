"use client"

import { useState, useEffect, useCallback } from "react"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { FolderOpen, RefreshCw, Clock } from "lucide-react"
import { DocKPICards } from "@/components/documentacion/DocKPICards"
import { AgentSummaryCards } from "@/components/documentacion/AgentSummaryCards"
import { DocFilters } from "@/components/documentacion/DocFilters"
import { PropertyTable } from "@/components/documentacion/PropertyTable"
import { PropertyDocDetail } from "@/components/documentacion/PropertyDocDetail"
import { SyncPanel } from "@/components/documentacion/SyncPanel"
import type { PropertyStatus } from "@/lib/docs/doc-requirements"
import type { FullDocStatus, PropertyDocStatus } from "@/lib/docs/doc-analyzer"

export default function DocumentacionPage() {
  const mounted = useHydrated()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FullDocStatus | null>(null)

  // Filters
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<PropertyStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Modals
  const [selectedProperty, setSelectedProperty] = useState<PropertyDocStatus | null>(null)
  const [showSync, setShowSync] = useState(false)

  const fetchData = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = force ? "/api/docs/status?force=true" : "/api/docs/status"
      const res = await fetch(url)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al cargar datos")
      }
      const result = await res.json()
      setData(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mounted) fetchData()
  }, [mounted, fetchData])

  if (!mounted) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 skeleton rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-[104px] skeleton rounded-2xl" />)}
        </div>
      </div>
    )
  }

  // Filter properties
  const filteredProperties = data?.properties.filter(p => {
    if (selectedAgent && p.agent !== selectedAgent) return false
    if (selectedStatus && p.status !== selectedStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        String(p.id).includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.agent.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.folderName.toLowerCase().includes(q)
      )
    }
    return true
  }) || []

  const agents = data?.byAgent.map(a => a.name) || []

  // Time since last update
  const lastUpdatedText = data?.lastUpdated
    ? getRelativeTime(data.lastUpdated)
    : null

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <FolderOpen size={20} strokeWidth={1.8} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Documentación</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Control de documentación legal de propiedades
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastUpdatedText && (
            <span className="hidden sm:flex items-center gap-1 text-xs md:text-[10px] text-text-muted">
              <Clock size={10} />
              {lastUpdatedText}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-surface-overlay border border-border-subtle hover:bg-surface-overlay-hover text-text-secondary hover:text-text-primary transition-all cursor-pointer disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw size={16} strokeWidth={1.8} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowSync(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="mt-2 text-xs text-red-400 underline hover:no-underline cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <DocKPICards
        total={data?.summary.total || 0}
        complete={data?.summary.complete || 0}
        partial={data?.summary.partial || 0}
        incomplete={data?.summary.incomplete || 0}
        missing={data?.summary.missing || 0}
        unsynced={data?.summary.unsynced || 0}
        percentage={data?.summary.percentage || 0}
        loading={loading}
      />

      {/* Agent Summary */}
      <AgentSummaryCards
        agents={data?.byAgent || []}
        loading={loading}
        onAgentClick={name => setSelectedAgent(prev => prev === name ? null : name)}
      />

      {/* Filters */}
      <DocFilters
        agents={agents}
        selectedAgent={selectedAgent}
        selectedStatus={selectedStatus}
        searchQuery={searchQuery}
        onAgentChange={setSelectedAgent}
        onStatusChange={setSelectedStatus}
        onSearchChange={setSearchQuery}
      />

      {/* Results count */}
      {!loading && data && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            {filteredProperties.length} de {data.properties.length} propiedades
          </p>
        </div>
      )}

      {/* Property Table */}
      <PropertyTable
        properties={filteredProperties}
        loading={loading}
        onPropertyClick={setSelectedProperty}
      />

      {/* Property Detail Modal */}
      {selectedProperty && (
        <PropertyDocDetail
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {/* Sync Panel */}
      {showSync && (
        <SyncPanel
          unsyncedCount={data?.summary.unsynced || 0}
          agents={agents}
          onClose={() => setShowSync(false)}
          onSyncComplete={() => {
            // Refresh data after sync
            setTimeout(() => fetchData(true), 1000)
          }}
        />
      )}
    </div>
  )
}

function getRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Justo ahora"
  if (mins < 60) return `Hace ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  return `Hace ${Math.floor(hours / 24)}d`
}
