"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Building2, ChevronDown, Trash2, X, Calendar, DollarSign, Users, RefreshCw, Eye } from "lucide-react"
import OperationForm from "./OperationForm"

interface Operation {
  id: string
  type: string
  status: string
  property_address: string
  property_detail?: string
  close_value: number
  currency: string
  reservation_date?: string
  close_date?: string
  total_fees_amount: number
  fee_currency: string
  office_total_share: number
  agents_total_share: number
  observations?: string
  created_at: string
  operation_agents: OperationAgent[]
}

interface OperationAgent {
  id: string
  agent_email: string
  side: string
  role_breakdown: Record<string, boolean>
  applied_band: string
  agent_share_amount: number
  share_currency: string
}

interface Agent {
  email: string
  name: string
  is_active_in_tokko: boolean
}

const TYPE_LABELS: Record<string, string> = {
  boleto: "Boleto",
  escritura: "Escritura",
  alquiler_permanente: "Alquiler Permanente",
  alquiler_temporario: "Alquiler Temporario"
}

const STATUS_LABELS: Record<string, string> = {
  reserva: "Reserva",
  en_proceso: "En Proceso",
  cerrada: "Cerrada",
  caida: "Caída"
}

const STATUS_COLORS: Record<string, string> = {
  reserva: "bg-amber-500/10 text-amber-400",
  en_proceso: "bg-blue-500/10 text-blue-400",
  cerrada: "bg-emerald-500/10 text-emerald-400",
  caida: "bg-red-500/10 text-red-400"
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export default function ProductionTab() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [filterType, setFilterType] = useState("all")
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString())
  
  const [error, setError] = useState<string | null>(null)
  
  // Slide panel state
  const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null)

  const fetchOperations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      let url = `/api/ventas/operations?year=${filterYear}`
      if (filterMonth !== "all") url += `&month=${filterMonth}`

      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOperations(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [filterYear, filterMonth])

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/ventas/sync-agents', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        const agentsRes = await fetch('/api/ventas/balance?year=' + new Date().getFullYear())
        const agentsData = await agentsRes.json()
        if (agentsData.data) {
          setAgents(agentsData.data.map((a: any) => ({ email: a.email, name: a.name, is_active_in_tokko: a.isActive })))
        }
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchOperations() }, [fetchOperations])
  useEffect(() => { fetchAgents() }, [fetchAgents])

  // Filter logic handled natively via API year/month, but text search and operation type:
  const filtered = operations.filter(op => {
    if (filterType !== "all") {
      if (filterType === "ventas" && !["boleto", "escritura"].includes(op.type)) return false
      if (filterType === "alquileres" && !["alquiler_permanente", "alquiler_temporario"].includes(op.type)) return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return op.property_address.toLowerCase().includes(q) ||
        op.operation_agents.some(oa => oa.agent_email.toLowerCase().includes(q))
    }
    return true
  })

  // KPIs
  const closedOps = filtered.filter(op => op.status === 'cerrada')
  const totalFees = closedOps.reduce((sum, op) => sum + (op.fee_currency === 'USD' ? op.total_fees_amount : 0), 0)
  const totalSides = closedOps.reduce((sum, op) => sum + op.operation_agents.length, 0)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta operación? Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch(`/api/ventas/operations?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      fetchOperations()
      if (selectedOperation?.id === id) setSelectedOperation(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
          <p className="text-xs md:text-[11px] font-medium text-text-muted mb-1">Cierres</p>
          <p className="text-2xl font-bold text-text-primary">{closedOps.length}</p>
        </div>
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
          <p className="text-xs md:text-[11px] font-medium text-text-muted mb-1">Lados</p>
          <p className="text-2xl font-bold text-text-primary">{totalSides}</p>
        </div>
        <div className="bg-surface-1 border border-border-subtle rounded-2xl p-4">
          <p className="text-xs md:text-[11px] font-medium text-text-muted mb-1">Facturación</p>
          <p className="text-2xl font-bold text-emerald-400">USD {totalFees.toLocaleString()}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-surface-1 border border-border-subtle rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:border-shell-accent/50 transition-colors group"
        >
          <div className="text-center flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-shell-accent/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Plus size={16} className="text-shell-accent" />
            </div>
            <span className="text-xs font-semibold text-shell-accent">Nueva Operación</span>
          </div>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar propiedad o asesor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface-1 border border-border-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-shell-accent"
          />
        </div>
        
        {/* Filtros Temporales */}
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="bg-surface-1 border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none cursor-pointer"
        >
          {[0, 1, 2].map(i => {
            const y = new Date().getFullYear() - i
            return <option key={y} value={y.toString()}>{y}</option>
          })}
        </select>

        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="bg-surface-1 border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none cursor-pointer"
        >
          <option value="all">Todo el año</option>
          {MONTHS.map((m, i) => (
            <option key={i+1} value={(i+1).toString()}>{m}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-surface-1 border border-border-subtle rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none cursor-pointer"
        >
          <option value="all">Todas</option>
          <option value="ventas">Ventas</option>
          <option value="alquileres">Alquileres</option>
        </select>

        <button onClick={fetchOperations} className="p-2 rounded-xl bg-surface-1 border border-border-subtle text-text-muted hover:text-text-primary transition-colors cursor-pointer">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-surface-1 border border-border-subtle rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center text-text-muted">
            <div className="w-6 h-6 border-2 border-shell-accent border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm">Cargando producción...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Building2 size={24} className="text-text-muted" />
            </div>
            <h3 className="text-text-primary font-medium mb-1">No hay operaciones registradas</h3>
            <p className="text-sm text-text-muted mb-4 max-w-sm">
              {searchQuery ? "No se encontraron resultados para tu búsqueda." : "Empezá registrando tu primera operación de venta o alquiler."}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-shell-accent text-black px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-shell-accent/90 transition-colors cursor-pointer"
            >
              <Plus size={16} /> Registrar Cierre
            </button>
          </div>
        ) : (
          <div className="divide-y divide-shell-border">
            {filtered.map(op => (
              <div 
                key={op.id} 
                className="p-4 hover:bg-surface-overlay transition-colors cursor-pointer group"
                onClick={() => setSelectedOperation(op)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[op.status] || ''}`}>
                        {STATUS_LABELS[op.status] || op.status}
                      </span>
                      <span className="text-xs md:text-[10px] font-medium text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[op.type] || op.type}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary truncate">{op.property_address}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} /> {op.currency} {op.close_value.toLocaleString()}
                      </span>
                      {op.close_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {new Date(op.close_date).toLocaleDateString('es-AR')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {op.operation_agents.length} {op.operation_agents.length === 1 ? 'lado' : 'lados'}
                      </span>
                    </div>
                    {op.operation_agents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {op.operation_agents.map(oa => (
                          <span key={oa.id} className="text-xs md:text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                            {oa.agent_email.split('@')[0]} · {oa.side === 'doble_punta' ? '2P' : oa.side === 'vendedor' ? 'V' : 'C'} · {oa.applied_band}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <p className="text-xs text-text-muted">Honorarios</p>
                    <p className="text-sm font-bold text-emerald-400">{op.fee_currency} {op.total_fees_amount.toLocaleString()}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedOperation(op) }} 
                        className="p-1.5 rounded-lg bg-shell-accent/10 text-shell-accent hover:bg-shell-accent/20 transition-colors flex items-center gap-1.5"
                      >
                        <Eye size={12} /> <span className="text-xs md:text-[10px] font-bold uppercase">Detalles</span>
                      </button>
                      <button onClick={(e) => handleDelete(op.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide Panel for Details */}
      {selectedOperation && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedOperation(null)} />
          <div className="relative w-full max-w-md bg-[#0c0c14] border-l border-border-subtle h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-300">
            
            <div className="flex items-center justify-between p-5 border-b border-border-subtle bg-surface-overlay">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                <Building2 size={16} className="text-shell-accent" />
                Detalles Operación
              </h3>
              <button onClick={() => setSelectedOperation(null)} className="p-2 rounded-xl hover:bg-surface-overlay-hover text-text-muted cursor-pointer"><X size={16} /></button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              
              <div>
                <div className="flex gap-2 mb-2">
                  <span className={`text-xs md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[selectedOperation.status] || ''}`}>
                    {STATUS_LABELS[selectedOperation.status] || selectedOperation.status}
                  </span>
                  <span className="text-xs md:text-[10px] font-medium text-text-muted bg-white/5 px-2 py-0.5 rounded-full">
                    {TYPE_LABELS[selectedOperation.type] || selectedOperation.type}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-text-primary leading-tight">{selectedOperation.property_address}</h2>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-surface-overlay border border-border-subtle p-3 rounded-xl">
                    <p className="text-xs md:text-[10px] text-text-muted font-medium mb-1 uppercase tracking-wider">Cierre</p>
                    <p className="text-sm font-bold text-text-primary">{selectedOperation.currency} {selectedOperation.close_value.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                    <p className="text-xs md:text-[10px] text-emerald-500/70 font-medium mb-1 uppercase tracking-wider">Honorarios</p>
                    <p className="text-sm font-bold text-emerald-400">{selectedOperation.fee_currency} {selectedOperation.total_fees_amount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs md:text-[11px] text-text-muted mt-3">
                  {selectedOperation.reservation_date && <span>Reserva: {new Date(selectedOperation.reservation_date).toLocaleDateString('es-AR')}</span>}
                  {selectedOperation.close_date && <span>Cierre: {new Date(selectedOperation.close_date).toLocaleDateString('es-AR')}</span>}
                </div>
              </div>

              {/* Repartos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-white/10 pb-2">Repartos Generales</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Oficina:</span>
                    <span className="font-bold text-text-primary">{selectedOperation.fee_currency} {selectedOperation.office_total_share.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-muted">Asesores:</span>
                    <span className="font-bold text-text-primary">{selectedOperation.fee_currency} {selectedOperation.agents_total_share.toLocaleString()}</span>
                  </div>
                  {/* Otra Inmobiliaria / Referido (if external) - infer from observations visually */}
                  {(selectedOperation.observations?.toLowerCase().includes("ext.") || selectedOperation.observations?.toLowerCase().includes("inmobiliaria") || selectedOperation.observations?.toLowerCase().includes("referido")) && (
                    <div className="flex justify-between items-center text-sm text-amber-500/70 pt-1">
                      <span>* Contempla Inmobiliaria Externa / Referido</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Desglose Asesores */}
              {selectedOperation.operation_agents.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-white/10 pb-2">Desglose Asesores</h4>
                  <div className="space-y-3">
                    {selectedOperation.operation_agents.map(oa => (
                      <div key={oa.id} className="bg-surface-overlay border border-border-subtle p-3 rounded-xl">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-blue-400 truncate pr-2">{oa.agent_email}</p>
                          <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">{selectedOperation.fee_currency} {oa.agent_share_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <span className="text-xs md:text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full capitalize">{oa.side.replace('_', ' ')}</span>
                          <span className="text-xs md:text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full capitalize">Banda {oa.applied_band}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(oa.role_breakdown).filter(([_, v]) => v).map(([k]) => (
                            <span key={k} className="text-xs md:text-[9px] border border-white/10 text-text-muted px-1.5 py-0.5 rounded uppercase">{k}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOperation.observations && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-white/10 pb-2">Observaciones</h4>
                  <p className="text-xs text-text-muted whitespace-pre-wrap">{selectedOperation.observations}</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <OperationForm
          agents={agents}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchOperations() }}
        />
      )}
    </div>
  )
}
