"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, CalendarClock, Trash2, X, RefreshCw, FileCheck, FileText, Eye, Building2 } from "lucide-react"

interface Activity {
  id: string
  type: string
  property_address: string
  operation_type: string
  value: number
  currency: string
  activity_date: string
  agent_email: string
  estimated_fees?: number
  status: string
  observations?: string
  agent_history?: { name: string }
}

interface Agent {
  email: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  activa: "bg-blue-500/10 text-blue-400",
  convertida: "bg-emerald-500/10 text-emerald-400",
  caida: "bg-red-500/10 text-red-400"
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export default function ActivityTab() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString())

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const fetchActivities = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      let url = `/api/ventas/activities?year=${filterYear}`
      if (filterMonth !== "all") url += `&month=${filterMonth}`

      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setActivities(data.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [filterYear, filterMonth])

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/ventas/balance?year=' + new Date().getFullYear())
      const data = await res.json()
      if (data.data) {
        setAgents(data.data.map((a: any) => ({ email: a.email, name: a.name })))
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { fetchActivities() }, [fetchActivities])
  useEffect(() => { fetchAgents() }, [fetchAgents])

  // Filters
  const filtered = activities.filter(act => {
    if (filterType !== "all" && act.type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return act.property_address.toLowerCase().includes(q) || 
             (act.agent_history?.name || act.agent_email).toLowerCase().includes(q)
    }
    return true
  })

  // KPIs
  const reservas = filtered.filter(a => a.type === 'reserva')
  const autorizaciones = filtered.filter(a => a.type === 'autorizacion')
  const potencial = filtered.reduce((sum, a) => sum + (a.currency === 'USD' ? (a.estimated_fees || 0) : 0), 0)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta actividad?')) return
    try {
      const res = await fetch(`/api/ventas/activities?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      fetchActivities()
      if (selectedActivity?.id === id) setSelectedActivity(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-shell-surface border border-shell-border rounded-2xl p-4">
          <p className="text-xs md:text-[11px] font-medium text-shell-text-muted mb-1">Reservas</p>
          <p className="text-2xl font-bold text-shell-text">{reservas.length}</p>
        </div>
        <div className="bg-shell-surface border border-shell-border rounded-2xl p-4">
          <p className="text-xs md:text-[11px] font-medium text-shell-text-muted mb-1">Autorizaciones</p>
          <p className="text-2xl font-bold text-shell-text">{autorizaciones.length}</p>
        </div>
        <div className="bg-shell-surface border border-shell-border rounded-2xl p-4">
          <p className="text-xs md:text-[11px] font-medium text-shell-text-muted mb-1">Potencial (USD)</p>
          <p className="text-2xl font-bold text-amber-400">USD {potencial.toLocaleString()}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-shell-surface border border-shell-border rounded-2xl p-4 flex items-center justify-center cursor-pointer hover:border-shell-accent/50 transition-colors group"
        >
          <div className="text-center flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-shell-accent/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Plus size={16} className="text-shell-accent" />
            </div>
            <span className="text-xs font-semibold text-shell-accent">Nueva Actividad</span>
          </div>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-shell-text-muted" />
          <input
            type="text"
            placeholder="Buscar propiedad o asesor..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-shell-surface border border-shell-border rounded-xl pl-9 pr-4 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent"
          />
        </div>
        
        {/* Filtros Temporales */}
        <select
          value={filterYear}
          onChange={e => setFilterYear(e.target.value)}
          className="bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none cursor-pointer"
        >
          {[0, 1, 2].map(i => {
            const y = new Date().getFullYear() - i
            return <option key={y} value={y.toString()}>{y}</option>
          })}
        </select>

        <select
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none cursor-pointer"
        >
          <option value="all">Todo el año</option>
          {MONTHS.map((m, i) => (
            <option key={i+1} value={(i+1).toString()}>{m}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none cursor-pointer"
        >
          <option value="all">Todas</option>
          <option value="reserva">Reservas</option>
          <option value="autorizacion">Autorizaciones</option>
        </select>

        <button onClick={fetchActivities} className="p-2 rounded-xl bg-shell-surface border border-shell-border text-shell-text-muted hover:text-shell-text transition-colors cursor-pointer">
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* List */}
      <div className="bg-shell-surface border border-shell-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center text-shell-text-muted">
            <div className="w-6 h-6 border-2 border-shell-accent border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm">Cargando actividad...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <CalendarClock size={24} className="text-shell-text-muted" />
            </div>
            <h3 className="text-shell-text font-medium mb-1">Sin movimiento comercial</h3>
            <p className="text-sm text-shell-text-muted mb-4 max-w-sm">
              No hay reservas ni autorizaciones registradas para este filtro. Las autorizaciones cuentan como captaciones para subir de banda.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-shell-accent text-black px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-shell-accent/90 transition-colors cursor-pointer"
            >
              <Plus size={16} /> Agregar Actividad
            </button>
          </div>
        ) : (
          <div className="divide-y divide-shell-border">
            {filtered.map(act => (
              <div 
                key={act.id} 
                className="p-4 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                onClick={() => setSelectedActivity(act)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${act.type === 'autorizacion' ? 'bg-violet-500/10' : 'bg-blue-500/10'}`}>
                      {act.type === 'autorizacion' ? <FileCheck size={16} className="text-violet-400" /> : <FileText size={16} className="text-blue-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-xs md:text-[10px] font-bold uppercase tracking-wider text-shell-text-muted">
                          {act.type === 'reserva' ? 'Reserva' : 'Autorización'}
                        </span>
                        <span className={`text-xs md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[act.status] || ''}`}>
                          {act.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-shell-text truncate">{act.property_address}</p>
                      <p className="text-xs text-shell-text-muted mt-0.5">
                        {act.agent_history?.name || act.agent_email.split('@')[0]} · {act.operation_type} · {new Date(act.activity_date).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <p className="text-xs text-shell-text-muted">{act.currency}</p>
                    <p className="text-sm font-bold text-shell-text">{act.value.toLocaleString()}</p>
                    {act.estimated_fees && <p className="text-xs md:text-[10px] text-emerald-400">Hon: {act.estimated_fees.toLocaleString()}</p>}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedActivity(act) }} 
                        className="p-1.5 rounded-lg bg-shell-accent/10 text-shell-accent hover:bg-shell-accent/20 transition-colors flex items-center gap-1.5"
                      >
                        <Eye size={12} /> <span className="text-xs md:text-[10px] font-bold uppercase">Detalles</span>
                      </button>
                      <button onClick={(e) => handleDelete(act.id, e)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-colors cursor-pointer">
                        <Trash2 size={13} />
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
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedActivity(null)} />
          <div className="relative w-full max-w-md bg-[#0c0c14] border-l border-shell-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right-full duration-300">
            
            <div className="flex items-center justify-between p-5 border-b border-shell-border bg-white/[0.02]">
              <h3 className="text-sm font-bold text-shell-text uppercase tracking-widest flex items-center gap-2">
                {selectedActivity.type === 'autorizacion' ? <FileCheck size={16} className="text-violet-400" /> : <FileText size={16} className="text-blue-400" />}
                Detalles {selectedActivity.type === 'autorizacion' ? 'Autorización' : 'Reserva'}
              </h3>
              <button onClick={() => setSelectedActivity(null)} className="p-2 rounded-xl hover:bg-white/[0.06] text-shell-text-muted cursor-pointer"><X size={16} /></button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              
              <div>
                <div className="flex gap-2 mb-2">
                  <span className={`text-xs md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[selectedActivity.status] || ''}`}>
                    {selectedActivity.status}
                  </span>
                  <span className="text-xs md:text-[10px] font-medium text-shell-text-muted bg-white/5 px-2 py-0.5 rounded-full capitalize">
                    {selectedActivity.operation_type}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-shell-text leading-tight">{selectedActivity.property_address}</h2>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl">
                    <p className="text-xs md:text-[10px] text-shell-text-muted font-medium mb-1 uppercase tracking-wider">Valor Operación</p>
                    <p className="text-sm font-bold text-shell-text">{selectedActivity.currency} {selectedActivity.value.toLocaleString()}</p>
                  </div>
                  {selectedActivity.estimated_fees && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                      <p className="text-xs md:text-[10px] text-amber-500/70 font-medium mb-1 uppercase tracking-wider">Honorarios Est.</p>
                      <p className="text-sm font-bold text-amber-400">{selectedActivity.currency} {selectedActivity.estimated_fees.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs md:text-[11px] text-shell-text-muted mt-3">
                  <span>Fecha de registro: {new Date(selectedActivity.activity_date).toLocaleDateString('es-AR')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-shell-text uppercase tracking-wider border-b border-white/10 pb-2">Asesor Asignado</h4>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-blue-400">{selectedActivity.agent_history?.name || selectedActivity.agent_email}</span>
                </div>
              </div>

              {selectedActivity.observations && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-shell-text uppercase tracking-wider border-b border-white/10 pb-2">Observaciones</h4>
                  <p className="text-xs text-shell-text-muted whitespace-pre-wrap">{selectedActivity.observations}</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <ActivityForm
          agents={agents}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchActivities() }}
        />
      )}
    </div>
  )
}

// ─── Activity Form Modal ───────────────────────────────

function ActivityForm({ agents, onClose, onSuccess }: { agents: Agent[], onClose: () => void, onSuccess: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState("reserva")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [operationType, setOperationType] = useState("Venta")
  const [value, setValue] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [activityDate, setActivityDate] = useState(new Date().toISOString().split('T')[0])
  const [agentEmail, setAgentEmail] = useState("")
  
  // Honorarios logic
  const [feePercentage, setFeePercentage] = useState("3")
  const [estimatedFees, setEstimatedFees] = useState("")
  const [contractMonths, setContractMonths] = useState("24")
  const [isManualFee, setIsManualFee] = useState(false)

  // Autorización logic
  const [authDays, setAuthDays] = useState("120")

  // Auto-set defaults based on Operation Type
  useEffect(() => {
    if (operationType === 'Venta') {
      setFeePercentage("3")
    } else if (operationType === 'Alquiler') {
      setFeePercentage("5")
      setContractMonths("24")
    } else if (operationType === 'Alquiler Temporal') {
      setFeePercentage("10")
      setContractMonths("6")
    }
    setIsManualFee(false)
  }, [operationType])

  // Auto-calculate fees
  useEffect(() => {
    if (isManualFee) return
    const val = Number(value)
    const pct = Number(feePercentage)
    const months = Number(contractMonths) || 1

    if (!isNaN(val) && !isNaN(pct)) {
      if (operationType === 'Venta') {
        setEstimatedFees((val * (pct / 100)).toString())
      } else {
        // Alquiler: val * meses * pct
        setEstimatedFees((val * months * (pct / 100)).toString())
      }
    }
  }, [value, feePercentage, contractMonths, operationType, isManualFee])

  // Calculate End Date
  const calculateEndDate = () => {
    if (!activityDate || !authDays) return ""
    const date = new Date(activityDate)
    date.setDate(date.getDate() + Number(authDays))
    return date.toISOString().split('T')[0]
  }

  const endDate = calculateEndDate()

  const handleSubmit = async () => {
    if (!propertyAddress || !value || !agentEmail || !activityDate) {
      setError("Completá dirección, valor, asesor y fecha.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      let finalObservations = observations
      if (type === 'autorizacion') {
        const autoText = `Vencimiento: ${new Date(endDate).toLocaleDateString('es-AR')} (${authDays} días).`
        finalObservations = finalObservations ? `${autoText}\n${finalObservations}` : autoText
      }

      const res = await fetch('/api/ventas/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, property_address: propertyAddress, operation_type: operationType,
          value: Number(value), currency, activity_date: activityDate,
          agent_email: agentEmail, estimated_fees: estimatedFees ? Number(estimatedFees) : null,
          observations: finalObservations || null
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const [observations, setObservations] = useState("")

  const isAlquiler = operationType === 'Alquiler' || operationType === 'Alquiler Temporal'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0c0c14] border border-shell-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-shell-border sticky top-0 bg-[#0c0c14] z-10">
          <h2 className="text-lg font-bold text-shell-text">Nueva Actividad</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] text-shell-text-muted cursor-pointer"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm text-red-400">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent">
                <option value="reserva">Reserva</option>
                <option value="autorizacion">Autorización (Captación)</option>
              </select>
            </Field>
            <Field label="Op. Tipo">
              <select value={operationType} onChange={e => setOperationType(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent">
                <option value="Venta">Venta</option>
                <option value="Alquiler">Alquiler Permanente</option>
                <option value="Alquiler Temporal">Alquiler Temporal</option>
              </select>
            </Field>
          </div>

          <Field label="Dirección de la propiedad *">
            <input type="text" value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} placeholder="Ej: Las Camelias 200, Pilar" className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label={isAlquiler ? "Valor Mensual *" : "Valor *"}>
                <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="250000" className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
              </Field>
            </div>
            <Field label="Moneda">
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent">
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
            </Field>
          </div>

          {/* Honorarios Block */}
          <div className="bg-white/[0.02] border border-white/[0.05] p-3 rounded-xl grid grid-cols-3 gap-3">
            {isAlquiler && (
              <Field label="Meses Contrato">
                <input type="number" value={contractMonths} onChange={e => { setContractMonths(e.target.value); setIsManualFee(false); }} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
              </Field>
            )}
            <Field label="% Honorarios">
              <input type="number" step="0.1" value={feePercentage} onChange={e => { setFeePercentage(e.target.value); setIsManualFee(false); }} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
            </Field>
            <div className={isAlquiler ? "col-span-1" : "col-span-2"}>
              <Field label="Honorarios est.">
                <input type="number" value={estimatedFees} onChange={e => { setEstimatedFees(e.target.value); setIsManualFee(true); }} placeholder="5000" className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-emerald-400 font-bold focus:outline-none focus:border-shell-accent" />
              </Field>
            </div>
          </div>

          {/* Fechas Block */}
          <div className={`grid gap-3 ${type === 'autorizacion' ? 'grid-cols-3' : 'grid-cols-1'}`}>
            <Field label={type === 'autorizacion' ? "Fecha de Inicio *" : "Fecha *"}>
              <input type="date" value={activityDate} onChange={e => setActivityDate(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
            </Field>
            {type === 'autorizacion' && (
              <>
                <Field label="Días Autorizados">
                  <input type="number" value={authDays} onChange={e => setAuthDays(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
                </Field>
                <Field label="Fecha Fin (Auto)">
                  <input type="date" value={endDate} disabled className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-shell-text-muted cursor-not-allowed" />
                </Field>
              </>
            )}
          </div>

          <Field label="Asesor *">
            <select value={agentEmail} onChange={e => setAgentEmail(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent">
              <option value="">Seleccionar asesor</option>
              {agents.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
            </select>
          </Field>

          <Field label="Observaciones">
            <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} placeholder="Notas..." className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent resize-none" />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-shell-border sticky bottom-0 bg-[#0c0c14]">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-shell-text-muted hover:bg-white/5 transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold bg-shell-accent text-black hover:bg-shell-accent/90 transition-colors disabled:opacity-50 cursor-pointer">
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs md:text-[11px] font-medium text-shell-text-muted mb-1 block">{label}</span>
      {children}
    </label>
  )
}
