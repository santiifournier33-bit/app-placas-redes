'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, AlertTriangle, ChevronDown } from 'lucide-react'
import { useContactStore, type Contact } from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { InlineSelectChip } from './InlineSelectChip'
import {
  SOURCE_OPTIONS,
  CIRCLE_OPTIONS,
  CATEGORY_OPTIONS,
  TIPO_OPTIONS,
  CERCANIA_OPTIONS,
} from './options'

interface AddContactPanelProps {
  onClose: () => void
  onCreated?: (contact: Contact) => void
}

export function AddContactPanel({ onClose, onCreated }: AddContactPanelProps) {
  const { addContact, findDuplicate } = useContactStore()
  const { pipelines } = usePipelinesStore()

  // Basic data
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  // Classification
  const [source, setSource] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [tipo, setTipo] = useState<string | null>(null)
  const [cercania, setCercania] = useState<string | null>(null)
  const [circulo, setCirculo] = useState<string | null>(null)

  // Context & notes
  const [contexto, setContexto] = useState('')
  const [notes, setNotes] = useState('')

  // Flags
  const [esEstrategico, setEsEstrategico] = useState(false)
  const [esInfluyente, setEsInfluyente] = useState(false)
  const [esMentor, setEsMentor] = useState(false)

  // Pipeline
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [stageId, setStageId] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Duplicate detection
  const duplicate = useMemo(() => {
    if (!phone && !email) return undefined
    return findDuplicate(phone, email)
  }, [phone, email, findDuplicate])

  // Pipeline stages
  const selectedPipeline = pipelines.find(p => p.id === pipelineId)
  const stageOptions = useMemo(() => {
    if (!selectedPipeline) return []
    return [...selectedPipeline.stages]
      .sort((a, b) => a.position - b.position)
      .map(s => ({ value: s.id, label: s.name, color: 'violet' as const }))
  }, [selectedPipeline])

  const pipelineOptions = pipelines.map(p => ({
    value: p.id,
    label: `${p.emoji ?? ''} ${p.name}`.trim(),
    color: 'blue' as const,
  }))

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        primary_phone: phone.trim() || null,
        primary_email: email.trim() || null,
        source,
        circulo,
        category,
        tipo,
        cercania: cercania != null ? Number(cercania) : null,
        rol: rol.trim() || null,
        contexto: contexto.trim() || null,
        ubicacion: ubicacion.trim() || null,
        notes: notes.trim() || null,
        es_estrategico: esEstrategico || null,
        es_influyente: esInfluyente || null,
        es_mentor: esMentor || null,
      }
      const result = await addContact(
        payload,
        pipelineId ?? undefined,
        stageId ?? undefined,
      )
      if (!result) {
        setError('No se pudo crear el contacto. Verificá tu sesión.')
        setSubmitting(false)
        return
      }
      onCreated?.(result)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full h-full lg:w-[90vw] lg:max-w-5xl lg:h-[85vh] bg-[#14141e] border-0 lg:border border-white/[0.08] rounded-none lg:rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-shell-text">Nuevo contacto</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/[0.06] rounded-lg cursor-pointer">
              <X size={20} className="text-zinc-400" />
            </button>
          </div>

          {/* Duplicate warning */}
          {duplicate && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-400">Ya existe un contacto similar:</p>
                <p className="text-amber-300/80">
                  {duplicate.first_name} {duplicate.last_name}
                  {duplicate.primary_phone && ` — ${duplicate.primary_phone}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Body: 2-column layout ──────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Left column: DATOS BÁSICOS + CONTEXTO + NOTAS */}
          <div className="w-full lg:w-1/2 border-r-0 lg:border-r border-white/[0.06] p-6 space-y-5 lg:overflow-y-auto shrink-0 lg:shrink">
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">Datos básicos</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre *">
                    <input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      autoFocus
                      placeholder="Nombre"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700"
                    />
                  </Field>
                  <Field label="Apellido">
                    <input
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Apellido"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700"
                    />
                  </Field>
                </div>

                <Field label="Teléfono">
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+54 11 1234-5678"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contacto@email.com"
                    className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Rol">
                    <input
                      value={rol}
                      onChange={e => setRol(e.target.value)}
                      placeholder="Ej: Arquitecto, Inversor..."
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700"
                    />
                  </Field>
                  <Field label="Ubicación">
                    <input
                      value={ubicacion}
                      onChange={e => setUbicacion(e.target.value)}
                      placeholder="Ej: Pilar, CABA..."
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Contexto */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">Contexto</h3>
              <textarea
                value={contexto}
                onChange={e => setContexto(e.target.value)}
                placeholder="¿Cómo conocés a esta persona? ¿En qué contexto se conocieron?"
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700 resize-none"
              />
            </div>

            {/* Notas iniciales */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">Notas iniciales</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Información relevante, observaciones, detalles de la primera interacción..."
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-shell-text outline-none focus:border-blue-500/30 placeholder:text-zinc-700 resize-none"
              />
            </div>
          </div>

          {/* Right column: CLASIFICACIÓN + FLAGS + PIPELINE */}
          <div className="w-full lg:w-1/2 p-6 space-y-5 lg:overflow-y-auto shrink-0 lg:shrink border-t border-white/[0.06] lg:border-t-0">
            {/* Clasificación */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">Clasificación</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Origen">
                    <InlineSelectChip value={source} options={SOURCE_OPTIONS} onChange={setSource} />
                  </Field>
                  <Field label="Categoría">
                    <InlineSelectChip value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo">
                    <InlineSelectChip value={tipo} options={TIPO_OPTIONS} onChange={setTipo} />
                  </Field>
                  <Field label="Cercanía">
                    <InlineSelectChip value={cercania} options={CERCANIA_OPTIONS} onChange={setCercania} />
                  </Field>
                </div>
                <Field label="Círculo">
                  <InlineSelectChip value={circulo} options={CIRCLE_OPTIONS} onChange={setCirculo} />
                </Field>
              </div>
            </div>

            {/* Flags */}
            <div>
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">Flags</h3>
              <div className="space-y-2">
                <CheckboxField label="¿Estratégico?" checked={esEstrategico} onChange={setEsEstrategico} />
                <CheckboxField label="¿Influyente?" checked={esInfluyente} onChange={setEsInfluyente} />
                <CheckboxField label="¿Mentor?" checked={esMentor} onChange={setEsMentor} />
              </div>
            </div>

            {/* Pipeline (optional) */}
            <div className="pt-2 border-t border-white/[0.06]">
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-3">Agregar a pipeline (opcional)</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pipeline">
                  <InlineSelectChip
                    value={pipelineId}
                    options={pipelineOptions}
                    onChange={(v) => { setPipelineId(v); setStageId(null) }}
                    placeholder="Elegir..."
                  />
                </Field>
                <Field label="Etapa inicial">
                  <InlineSelectChip
                    value={stageId}
                    options={stageOptions}
                    onChange={setStageId}
                    placeholder={pipelineId ? "Elegir..." : "—"}
                  />
                </Field>
              </div>
              {pipelineId && !stageId && (
                <p className="text-[10px] text-amber-400/80 flex items-center gap-1 mt-2">
                  <ChevronDown size={10} />
                  Elegí una etapa para que el contacto aparezca en el kanban
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────── */}
        {error && (
          <div className="px-6">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-white/[0.06] shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:bg-white/[0.06] cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !firstName.trim()}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white cursor-pointer disabled:bg-zinc-700 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando...' : 'Crear contacto'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-zinc-500 font-medium block">{label}</label>
      {children}
    </div>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked
            ? 'bg-blue-500 border-blue-500'
            : 'border-white/[0.12] bg-white/[0.04] group-hover:border-white/[0.2]'
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-xs text-zinc-400 group-hover:text-zinc-300">{label}</span>
    </label>
  )
}
