'use client'

import { useState } from 'react'
import { isValidEmail } from '@/lib/firmas/autorizacion'
import SignersPanel, { emptyPropietario, type PropietarioForm } from './SignersPanel'

const inputCls =
  'w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-violet-500 transition-colors'

const todayStr = new Date().toISOString().split('T')[0]

export default function AutorizacionForm({ onSent }: { onSent: () => void }) {
  const [propietarios, setPropietarios] = useState<PropietarioForm[]>([emptyPropietario()])
  const [propiedad, setPropiedad] = useState({
    domicilio: '', localidad: '', partido: 'Buenos Aires', partidaInmobiliaria: '', afectacion: '', aptoCredito: 'NO',
  })
  const [precioUsd, setPrecioUsd] = useState('')
  const [exclusividadDias, setExclusividadDias] = useState('90')
  const [startDate, setStartDate] = useState(todayStr)
  const [ejemplares, setEjemplares] = useState('2')
  const [ciudadFirma, setCiudadFirma] = useState('Pilar')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const validate = (): string | null => {
    for (const [idx, p] of propietarios.entries()) {
      const n = idx + 1
      if (!p.nombre.trim()) return `Falta el nombre del propietario ${n}`
      if (!isValidEmail(p.email)) return `Email inválido del propietario ${n}`
      if (!p.dni.trim()) return `Falta el DNI del propietario ${n}`
      if (!p.domicilio.trim()) return `Falta el domicilio del propietario ${n}`
      if (p.conyuge) {
        if (!p.conyuge.nombre.trim()) return `Falta el nombre del cónyuge del propietario ${n}`
        if (!isValidEmail(p.conyuge.email)) return `Email inválido del cónyuge del propietario ${n}`
      }
    }
    if (!propiedad.domicilio.trim()) return 'Falta el domicilio del inmueble'
    if (!(Number(precioUsd) > 0)) return 'El valor de la propiedad debe ser mayor a 0'
    return null
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setLoading(true)
    try {
      const payload = {
        slug: 'autorizacion-comercializacion',
        propietarios: propietarios.map((p) => ({
          nombre: p.nombre, dni: p.dni, domicilio: p.domicilio, localidad: p.localidad,
          partido: p.partido, estadoCivil: p.estadoCivil, telefono: p.telefono, email: p.email,
          conyuge: p.conyuge,
        })),
        propiedad: {
          domicilio: propiedad.domicilio, localidad: propiedad.localidad, partido: propiedad.partido,
          partidaInmobiliaria: propiedad.partidaInmobiliaria || undefined,
          afectacion: propiedad.afectacion || undefined,
          aptoCredito: propiedad.aptoCredito,
        },
        precioUsd: Number(precioUsd),
        exclusividadDias: Number(exclusividadDias),
        startDate,
        ejemplares: Number(ejemplares),
        ciudadFirma,
      }

      const res = await fetch('/api/signatures/create-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al enviar')

      setSuccess('¡Autorización generada y enviada a los firmantes!')
      setTimeout(() => onSent(), 2200)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 overflow-y-auto h-full animate-in fade-in duration-300">
      <div className="max-w-4xl mx-auto space-y-6">
        <SignersPanel value={propietarios} onChange={setPropietarios} />

        {/* Inmueble y condiciones */}
        <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <h4 className="font-medium text-[var(--text-primary)] mb-4 pb-3 border-b border-[var(--border-subtle)]">Inmueble y condiciones</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ubicación del inmueble *</label>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" placeholder="Calle y número" value={propiedad.domicilio} onChange={(e) => setPropiedad({ ...propiedad, domicilio: e.target.value })} className={inputCls} />
                <input type="text" placeholder="Localidad" value={propiedad.localidad} onChange={(e) => setPropiedad({ ...propiedad, localidad: e.target.value })} className={inputCls} />
                <input type="text" placeholder="Partido / Provincia" value={propiedad.partido} onChange={(e) => setPropiedad({ ...propiedad, partido: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Afectación (dejar vacío si no aplica)</label>
              <input type="text" placeholder="Ej: Donación, Usufructo, Sucesión" value={propiedad.afectacion} onChange={(e) => setPropiedad({ ...propiedad, afectacion: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Partida inmobiliaria N°</label>
              <input type="text" value={propiedad.partidaInmobiliaria} onChange={(e) => setPropiedad({ ...propiedad, partidaInmobiliaria: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Apto crédito</label>
              <select value={propiedad.aptoCredito} onChange={(e) => setPropiedad({ ...propiedad, aptoCredito: e.target.value })} className={inputCls}>
                <option value="NO">NO</option>
                <option value="SI">SÍ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Valor de la propiedad (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-[var(--text-muted)]">$</span>
                <input type="number" inputMode="decimal" placeholder="145000" value={precioUsd} onChange={(e) => setPrecioUsd(e.target.value)} className={`${inputCls} pl-7`} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Plazo de exclusiva (días)</label>
              <input type="number" inputMode="decimal" value={exclusividadDias} onChange={(e) => setExclusividadDias(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Fecha de inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">N° de ejemplares</label>
              <input type="number" inputMode="decimal" value={ejemplares} onChange={(e) => setEjemplares(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ciudad de firma</label>
              <input type="text" value={ciudadFirma} onChange={(e) => setCiudadFirma(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end pb-6">
          {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
          {success && <div className="text-green-400 text-sm mb-3">{success}</div>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? 'Enviando...' : 'Enviar autorización a los firmantes →'}
          </button>
        </div>
      </div>
    </div>
  )
}
