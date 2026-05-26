"use client"

import { useState, useEffect } from "react"
import { X, ExternalLink } from "lucide-react"

interface Agent {
  email: string
  name: string
  is_active_in_tokko: boolean
}

export default function OperationForm({ agents, onClose, onSuccess }: { agents: Agent[], onClose: () => void, onSuccess: () => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reservas
  const [reservas, setReservas] = useState<any[]>([])
  const [selectedReservaId, setSelectedReservaId] = useState<string>("")

  // Básicos
  const [type, setType] = useState("boleto")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [closeValue, setCloseValue] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [reservationDate, setReservationDate] = useState("")
  const [closeDate, setCloseDate] = useState("")
  const [observations, setObservations] = useState("")

  // Honorarios
  const [feeCurrency, setFeeCurrency] = useState("USD")
  const [alquilerMonths, setAlquilerMonths] = useState("12")
  const [feePctVendedor, setFeePctVendedor] = useState("3")
  const [feePctComprador, setFeePctComprador] = useState("4")
  const [feePctAlquiler, setFeePctAlquiler] = useState("5")
  const [feePctAlquilerTemp, setFeePctAlquilerTemp] = useState("10")

  // Puntas Activas
  const [sideVendedor, setSideVendedor] = useState(false)
  const [sideComprador, setSideComprador] = useState(false)

  // Agent Config Vendedor
  const [vendedorIsExternal, setVendedorIsExternal] = useState(false)
  const [vendedorExternalName, setVendedorExternalName] = useState("")
  const [vendedorExternalAgent, setVendedorExternalAgent] = useState("")

  const [vendedorAgent, setVendedorAgent] = useState("")
  const [vendedorBand, setVendedorBand] = useState("bronce")
  const [vendedorRoles, setVendedorRoles] = useState({ lead: "", captacion: "", comercializacion: "" })
  const [vendedorReferral, setVendedorReferral] = useState(false)
  const [vendedorReferralPct, setVendedorReferralPct] = useState("10")
  const [vendedorManualShare, setVendedorManualShare] = useState("")

  // Agent Config Comprador
  const [compradorIsExternal, setCompradorIsExternal] = useState(false)
  const [compradorExternalName, setCompradorExternalName] = useState("")
  const [compradorExternalAgent, setCompradorExternalAgent] = useState("")

  const [compradorAgent, setCompradorAgent] = useState("")
  const [compradorBand, setCompradorBand] = useState("bronce")
  const [compradorRoles, setCompradorRoles] = useState({ lead: "", visitas: "" })
  const [compradorReferral, setCompradorReferral] = useState(false)
  const [compradorReferralPct, setCompradorReferralPct] = useState("10")
  const [compradorManualShare, setCompradorManualShare] = useState("")

  useEffect(() => {
    fetch('/api/ventas/activities').then(r => r.json()).then(data => {
      if (data.data) {
        setReservas(data.data.filter((a: any) => a.type === 'reserva'))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedReservaId) {
      const res = reservas.find(r => r.id === selectedReservaId)
      if (res) {
        setPropertyAddress(res.property_address || "")
        setCloseValue(String(res.value || ""))
        setCurrency(res.currency || "USD")
        setReservationDate(res.activity_date?.split('T')[0] || "")
        if (res.operation_type === 'Venta') setType('boleto')
        if (res.operation_type === 'Alquiler') setType('alquiler_permanente')
        if (res.operation_type === 'Alquiler Temporal') setType('alquiler_temporario')
      }
    }
  }, [selectedReservaId, reservas])

  // Sync roles when main agent changes
  useEffect(() => {
    if (vendedorAgent) setVendedorRoles({ lead: vendedorAgent, captacion: vendedorAgent, comercializacion: vendedorAgent })
  }, [vendedorAgent])
  useEffect(() => {
    if (compradorAgent) setCompradorRoles({ lead: compradorAgent, visitas: compradorAgent })
  }, [compradorAgent])

  // Calculations
  const val = Number(closeValue) || 0
  let calcFeeVendedor = 0
  let calcFeeComprador = 0

  if (type === 'boleto' || type === 'escritura') {
    calcFeeVendedor = val * (Number(feePctVendedor) / 100)
    calcFeeComprador = val * (Number(feePctComprador) / 100)
  } else if (type === 'alquiler_permanente') {
    calcFeeVendedor = val * (Number(feePctAlquiler) / 100)
    calcFeeComprador = val * (Number(feePctAlquiler) / 100)
  } else if (type === 'alquiler_temporario') {
    const totalContract = val * (Number(alquilerMonths) || 1)
    calcFeeVendedor = totalContract * (Number(feePctAlquilerTemp) / 100)
    calcFeeComprador = totalContract * (Number(feePctAlquilerTemp) / 100)
  }

  const totalFeesCalculated = (sideVendedor ? calcFeeVendedor : 0) + (sideComprador ? calcFeeComprador : 0)

  const calculateAgentShares = (side: 'vendedor' | 'comprador') => {
    const shares: Record<string, number> = {}
    const rolesByAgent: Record<string, any> = {}
    
    if (side === 'vendedor') {
      if (vendedorIsExternal || !vendedorAgent) return []
      const fee = calcFeeVendedor
      const refPct = vendedorReferral ? Number(vendedorReferralPct) : 0
      const bandLead = vendedorBand === 'oro' ? 30 : vendedorBand === 'plata' ? 25 : 20
      const leadPct = Math.max(0, bandLead - refPct)
      
      const addShare = (email: string, pct: number, roleName: string) => {
        if (!email) return
        if (!shares[email]) { shares[email] = 0; rolesByAgent[email] = {} }
        shares[email] += fee * (pct / 100)
        rolesByAgent[email][roleName] = true
      }
      
      addShare(vendedorRoles.lead, leadPct, 'lead')
      addShare(vendedorRoles.captacion, 15, 'captacion')
      addShare(vendedorRoles.comercializacion, 15, 'comercializacion')
      
      if (vendedorManualShare && rolesByAgent[vendedorAgent]) {
        shares[vendedorAgent] = Number(vendedorManualShare)
      }
      
      return Object.keys(shares).map(email => ({
        agent_email: email, side: 'vendedor',
        applied_band: email === vendedorAgent ? vendedorBand : 'bronce',
        role_breakdown: rolesByAgent[email],
        agent_share_amount: shares[email]
      }))
    } else {
      if (compradorIsExternal || !compradorAgent) return []
      const fee = calcFeeComprador
      const refPct = compradorReferral ? Number(compradorReferralPct) : 0
      const bandLead = compradorBand === 'oro' ? 30 : compradorBand === 'plata' ? 25 : 20
      const leadPct = Math.max(0, bandLead - refPct)
      
      const addShare = (email: string, pct: number, roleName: string) => {
        if (!email) return
        if (!shares[email]) { shares[email] = 0; rolesByAgent[email] = {} }
        shares[email] += fee * (pct / 100)
        rolesByAgent[email][roleName] = true
      }
      
      addShare(compradorRoles.lead, leadPct, 'lead')
      addShare(compradorRoles.visitas, 30, 'visitasCierre')
      
      if (compradorManualShare && rolesByAgent[compradorAgent]) {
        shares[compradorAgent] = Number(compradorManualShare)
      }
      
      return Object.keys(shares).map(email => ({
        agent_email: email, side: 'comprador',
        applied_band: email === compradorAgent ? compradorBand : 'bronce',
        role_breakdown: rolesByAgent[email],
        agent_share_amount: shares[email]
      }))
    }
  }

  const handleSubmit = async () => {
    if (!propertyAddress || !closeValue || (!sideVendedor && !sideComprador)) {
      setError("Completá la dirección, valor de cierre y al menos una punta.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const agentsPayload = [
        ...(sideVendedor ? calculateAgentShares('vendedor') : []),
        ...(sideComprador ? calculateAgentShares('comprador') : [])
      ]

      let externalNotes = ""
      if (sideVendedor && vendedorIsExternal) {
        externalNotes += `Vendedor: Ext. ${vendedorExternalName} (${vendedorExternalAgent}). `
      }
      if (sideComprador && compradorIsExternal) {
        externalNotes += `Comprador: Ext. ${compradorExternalName} (${compradorExternalAgent}). `
      }
      const finalObservations = (externalNotes + "\n" + observations).trim()

      const res = await fetch('/api/ventas/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, status: 'cerrada', property_address: propertyAddress, close_value: Number(closeValue),
          currency, reservation_date: reservationDate || null, close_date: closeDate || null,
          total_fees_amount: totalFeesCalculated, fee_currency: feeCurrency,
          observations: finalObservations || null, agents: agentsPayload
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (selectedReservaId) {
        await fetch(`/api/ventas/activities?id=${selectedReservaId}`, { method: 'DELETE' }).catch(() => {})
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const AgentDropdown = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-shell-text focus:outline-none focus:border-shell-accent">
      <option value="">Seleccionar Asesor...</option>
      {agents.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
    </select>
  )

  const isVenta = type === 'boleto' || type === 'escritura'
  const isAlqTemp = type === 'alquiler_temporario'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0c0c14] border border-shell-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-shell-border shrink-0">
          <h2 className="text-lg font-bold text-shell-text">Registrar Cierre</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] text-shell-text-muted"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6">
          {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</div>}

          {/* 1. Reserva Link */}
          <div className="bg-shell-accent/5 border border-shell-accent/20 rounded-xl p-4">
            <Field label="Asociar a Reserva previa (Opcional)">
              <select value={selectedReservaId} onChange={e => setSelectedReservaId(e.target.value)} className="w-full bg-shell-surface border border-shell-accent/30 rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent">
                <option value="">No asociar, empezar de cero</option>
                {reservas.map(r => <option key={r.id} value={r.id}>{r.property_address} - {r.currency} {r.value?.toLocaleString()}</option>)}
              </select>
            </Field>
            <p className="text-xs md:text-[10px] text-shell-text-muted mt-1.5">Al seleccionar una reserva, se auto-completarán los datos de la propiedad y el valor de cierre.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 2. Operación Básica */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-shell-text border-b border-shell-border pb-2">Datos de la Operación</h3>
              <Field label="Tipo de operación">
                <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent">
                  <option value="boleto">Boleto (Venta)</option>
                  <option value="escritura">Escritura (Venta)</option>
                  <option value="alquiler_permanente">Alquiler Permanente</option>
                  <option value="alquiler_temporario">Alquiler Temporario</option>
                </select>
              </Field>
              <Field label="Dirección de la propiedad *">
                <input type="text" value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor de cierre *">
                  <input type="number" inputMode="decimal" value={closeValue} onChange={e => setCloseValue(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
                </Field>
                <Field label="Moneda">
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent">
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </Field>
              </div>
              {isAlqTemp && (
                <Field label="Cantidad de meses de contrato">
                  <input type="number" inputMode="decimal" value={alquilerMonths} onChange={e => setAlquilerMonths(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha reserva">
                  <input type="date" value={reservationDate} onChange={e => setReservationDate(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
                </Field>
                <Field label="Fecha cierre *">
                  <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} className="w-full bg-shell-surface border border-shell-border rounded-xl px-3 py-2 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
                </Field>
              </div>
            </div>

            {/* 3. Honorarios y Puntas */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-shell-text border-b border-shell-border pb-2">Honorarios y Puntas</h3>
              
              <div className="space-y-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sideVendedor} onChange={e => setSideVendedor(e.target.checked)} className="rounded border-white/20 bg-black/20" />
                  <span className="text-sm font-semibold text-shell-text">{isVenta ? 'Punta Vendedora' : 'Punta Locador'}</span>
                </label>
                {sideVendedor && (
                  <div className="pl-6 grid grid-cols-2 gap-3">
                    <Field label="% Honorarios">
                      <input type="number" inputMode="decimal" step="0.1" value={isVenta ? feePctVendedor : (isAlqTemp ? feePctAlquilerTemp : feePctAlquiler)} 
                        onChange={e => {
                          if (isVenta) setFeePctVendedor(e.target.value)
                          else if (isAlqTemp) setFeePctAlquilerTemp(e.target.value)
                          else setFeePctAlquiler(e.target.value)
                        }} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
                    </Field>
                    <div className="pt-5 text-sm font-bold text-emerald-400">= {feeCurrency} {calcFeeVendedor.toLocaleString()}</div>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={sideComprador} onChange={e => setSideComprador(e.target.checked)} className="rounded border-white/20 bg-black/20" />
                  <span className="text-sm font-semibold text-shell-text">{isVenta ? 'Punta Compradora' : 'Punta Inquilino'}</span>
                </label>
                {sideComprador && (
                  <div className="pl-6 grid grid-cols-2 gap-3">
                    <Field label="% Honorarios">
                      <input type="number" inputMode="decimal" step="0.1" value={isVenta ? feePctComprador : (isAlqTemp ? feePctAlquilerTemp : feePctAlquiler)} 
                        onChange={e => {
                          if (isVenta) setFeePctComprador(e.target.value)
                          else if (isAlqTemp) setFeePctAlquilerTemp(e.target.value)
                          else setFeePctAlquiler(e.target.value)
                        }} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm text-shell-text focus:outline-none focus:border-shell-accent" />
                    </Field>
                    <div className="pt-5 text-sm font-bold text-emerald-400">= {feeCurrency} {calcFeeComprador.toLocaleString()}</div>
                  </div>
                )}
              </div>

              <div className="bg-shell-surface border border-shell-border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-[11px] font-medium text-shell-text-muted">Total Honorarios</p>
                  <p className="text-xl font-bold text-emerald-400">{feeCurrency} {totalFeesCalculated.toLocaleString()}</p>
                </div>
                <div>
                  <Field label="Moneda Hon.">
                    <select value={feeCurrency} onChange={e => setFeeCurrency(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-sm text-shell-text">
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Configuración de Asesores */}
          {(sideVendedor || sideComprador) && (
            <div className="border-t border-shell-border pt-6 space-y-6">
              <h3 className="text-sm font-bold text-shell-text">Roles y Participación</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {sideVendedor && (
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="text-sm font-bold text-blue-400">{isVenta ? 'Punta Vendedora' : 'Punta Locador'}</h4>
                      <label className="flex items-center gap-1.5 text-xs text-shell-text-muted cursor-pointer">
                        <input type="checkbox" checked={vendedorIsExternal} onChange={e => setVendedorIsExternal(e.target.checked)} className="rounded border-white/20 bg-black/20" />
                        Externa
                      </label>
                    </div>
                    {vendedorIsExternal ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Inmobiliaria Ext."><input type="text" value={vendedorExternalName} onChange={e => setVendedorExternalName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-shell-text" /></Field>
                        <Field label="Agente Ext."><input type="text" value={vendedorExternalAgent} onChange={e => setVendedorExternalAgent(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-shell-text" /></Field>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Asesor Principal"><AgentDropdown value={vendedorAgent} onChange={setVendedorAgent}/></Field>
                          <Field label="Banda">
                            <select value={vendedorBand} onChange={e => setVendedorBand(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-shell-text">
                              <option value="bronce">Bronce</option><option value="plata">Plata</option><option value="oro">Oro</option>
                            </select>
                          </Field>
                        </div>
                        {vendedorAgent && (
                          <div className="bg-black/30 rounded-lg p-3 space-y-3">
                            <p className="text-xs md:text-[10px] uppercase font-bold text-shell-text-muted">Desglose de Roles</p>
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <span className="text-xs text-shell-text">Lead/Prospección ({vendedorBand === 'oro' ? '30' : vendedorBand === 'plata' ? '25' : '20'}%)</span>
                              <AgentDropdown value={vendedorRoles.lead} onChange={v => setVendedorRoles(p => ({...p, lead: v}))} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <span className="text-xs text-shell-text">Captación (15%)</span>
                              <AgentDropdown value={vendedorRoles.captacion} onChange={v => setVendedorRoles(p => ({...p, captacion: v}))} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <span className="text-xs text-shell-text">Comercialización (15%)</span>
                              <AgentDropdown value={vendedorRoles.comercializacion} onChange={v => setVendedorRoles(p => ({...p, comercializacion: v}))} />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-shell-text-muted cursor-pointer">
                            <input type="checkbox" checked={vendedorReferral} onChange={e => setVendedorReferral(e.target.checked)} className="rounded border-white/20 bg-black/20" />
                            Hubo referido
                          </label>
                          {vendedorReferral && (
                            <select value={vendedorReferralPct} onChange={e => setVendedorReferralPct(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-amber-400">
                              <option value="10">10%</option><option value="15">15%</option><option value="20">20%</option>
                            </select>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {sideComprador && (
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h4 className="text-sm font-bold text-amber-400">{isVenta ? 'Punta Compradora' : 'Punta Inquilino'}</h4>
                      <label className="flex items-center gap-1.5 text-xs text-shell-text-muted cursor-pointer">
                        <input type="checkbox" checked={compradorIsExternal} onChange={e => setCompradorIsExternal(e.target.checked)} className="rounded border-white/20 bg-black/20" />
                        Externa
                      </label>
                    </div>
                    {compradorIsExternal ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Inmobiliaria Ext."><input type="text" value={compradorExternalName} onChange={e => setCompradorExternalName(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-shell-text" /></Field>
                        <Field label="Agente Ext."><input type="text" value={compradorExternalAgent} onChange={e => setCompradorExternalAgent(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-shell-text" /></Field>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Asesor Principal"><AgentDropdown value={compradorAgent} onChange={setCompradorAgent}/></Field>
                          <Field label="Banda">
                            <select value={compradorBand} onChange={e => setCompradorBand(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-shell-text">
                              <option value="bronce">Bronce</option><option value="plata">Plata</option><option value="oro">Oro</option>
                            </select>
                          </Field>
                        </div>
                        {compradorAgent && (
                          <div className="bg-black/30 rounded-lg p-3 space-y-3">
                            <p className="text-xs md:text-[10px] uppercase font-bold text-shell-text-muted">Desglose de Roles</p>
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <span className="text-xs text-shell-text">Lead/Prospección ({compradorBand === 'oro' ? '30' : compradorBand === 'plata' ? '25' : '20'}%)</span>
                              <AgentDropdown value={compradorRoles.lead} onChange={v => setCompradorRoles(p => ({...p, lead: v}))} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 items-center">
                              <span className="text-xs text-shell-text">Visitas/Cierre (30%)</span>
                              <AgentDropdown value={compradorRoles.visitas} onChange={v => setCompradorRoles(p => ({...p, visitas: v}))} />
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-shell-text-muted cursor-pointer">
                            <input type="checkbox" checked={compradorReferral} onChange={e => setCompradorReferral(e.target.checked)} className="rounded border-white/20 bg-black/20" />
                            Hubo referido
                          </label>
                          {compradorReferral && (
                            <select value={compradorReferralPct} onChange={e => setCompradorReferralPct(e.target.value)} className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs text-amber-400">
                              <option value="10">10%</option><option value="15">15%</option><option value="20">20%</option>
                            </select>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-shell-border shrink-0 bg-[#0c0c14]">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-shell-text-muted hover:bg-white/5 cursor-pointer">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-bold bg-shell-accent text-black hover:bg-shell-accent/90 disabled:opacity-50 cursor-pointer">
            {saving ? "Guardando..." : "Confirmar Cierre"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs md:text-[11px] font-medium text-shell-text-muted mb-1.5 block">{label}</span>
      {children}
    </label>
  )
}
