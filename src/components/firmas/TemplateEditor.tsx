'use client'

import { useEffect, useState } from 'react'
import { renderTemplate } from '@/lib/firmas/template-engine'
import { buildAutorizacion, type AutorizacionInput } from '@/lib/firmas/autorizacion'

const SLUG = 'autorizacion-comercializacion'

// Datos de muestra para previsualizar (2 propietarios, 1 con cónyuge).
const SAMPLE: AutorizacionInput = {
  propietarios: [
    { nombre: 'Ana Gómez', dni: '20.111.222', domicilio: 'Calle 1 N° 100', localidad: 'Pilar', partido: 'Pilar', estadoCivil: 'Casada', telefono: '11-5555-1111', email: 'ana@mail.com', conyuge: { nombre: 'Pedro Gómez', caracter: 'Cónyuge', email: 'pedro@mail.com' } },
    { nombre: 'Luis Paz', dni: '25.333.444', domicilio: 'Calle 2 N° 200', localidad: 'Pilar', partido: 'Pilar', estadoCivil: 'Soltero', telefono: '11-5555-2222', email: 'luis@mail.com', conyuge: null },
  ],
  propiedad: { domicilio: 'Av. Real 1234', localidad: 'Pilar', partido: 'Pilar', partidaInmobiliaria: '123-456', afectacion: '', aptoCredito: 'SI' },
  precioUsd: 145000,
  exclusividadDias: 90,
  startDate: new Date().toISOString().split('T')[0],
  ejemplares: 2,
  ciudadFirma: 'Pilar',
  corredor: { nombre: 'Stella Maris Freire', email: 'freire@mail.com' },
}

const VARS = [
  'logo_url', 'precio_numeros', 'precio_palabras', 'dias_exclusiva_numeros', 'dias_exclusiva_palabras',
  'fecha_inicio', 'fecha_fin', 'ejemplares_numero', 'ejemplares_palabra', 'ciudad_firma', 'dia', 'mes', 'anio',
  'domicilio_propiedad', 'localidad_propiedad', 'partido_propiedad', 'partida_inmobiliaria', 'afectacion', 'apto_credito',
]

export default function TemplateEditor() {
  const [id, setId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [version, setVersion] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/signatures/templates-managed?slug=${SLUG}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'No se pudo cargar la plantilla')
        setId(json.template.id)
        setName(json.template.name)
        setBodyHtml(json.template.body_html)
        setVersion(json.template.version)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/signatures/templates-managed/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_html: bodyHtml }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo guardar')
      setVersion(json.template.version)
      setSuccess(`Guardado (v${json.template.version})`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  let previewHtml = ''
  let previewError = ''
  try {
    const { data } = buildAutorizacion(SAMPLE)
    previewHtml = renderTemplate(bodyHtml, data)
  } catch (e) {
    previewError = e instanceof Error ? e.message : 'Error al previsualizar'
  }

  if (loading) {
    return <div className="p-6 text-[var(--text-muted)]">Cargando plantilla…</div>
  }

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">{name}</h3>
            <p className="text-xs text-[var(--text-muted)]">Versión {version} · editás el texto legal; las firmas se ubican solas.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview((s) => !s)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              {showPreview ? 'Ocultar preview' : 'Ver preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}
        {success && <div className="text-green-400 text-sm">{success}</div>}

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
          <p className="text-xs text-[var(--text-muted)] mb-2">
            Variables: <code className="text-violet-300">[[nombre]]</code> dentro de bloques, o globales.
            Bloques: <code className="text-violet-300">[[#propietarios]]…[[/propietarios]]</code>,
            <code className="text-violet-300"> [[#conyuges]]</code>, <code className="text-violet-300">[[#firmantes]]</code>,
            <code className="text-violet-300"> [[#corredor]]</code>. Firma: <code className="text-violet-300">[[firma]]</code>.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VARS.map((v) => (
              <span key={v} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">[[{v}]]</span>
            ))}
          </div>
        </div>

        <div className={`grid gap-4 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            spellCheck={false}
            className="w-full h-[60vh] bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs font-mono text-[var(--text-primary)] focus:border-violet-500 transition-colors resize-none"
          />
          {showPreview && (
            <div className="h-[60vh] border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-white">
              {previewError ? (
                <div className="p-4 text-red-500 text-sm">{previewError}</div>
              ) : (
                <iframe title="Vista previa" srcDoc={previewHtml} className="w-full h-full" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
