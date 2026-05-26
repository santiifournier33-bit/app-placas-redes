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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 lg:p-4 animate-fade-in" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full h-full lg:w-[90vw] lg:max-w-5xl lg:h-[85vh] bg-shell-surface border-0 lg:border border-shell-border rounded-none lg:rounded-[24px] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-shell-border bg-shell-bg/20 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-shell-text">Nuevo contacto</h2>
            <button onClick={onClose} className="p-2 hover:bg-shell-surface-hover rounded-xl cursor-pointer transition-colors">
              <X size={20} className="text-shell-text-muted" />
            </button>
          </div>

          {/* Duplicate warning */}
          {duplicate && (
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-3.5 mt-3">
              <AlertTriangle size={16} className="text-brand-accent shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-brand-accent uppercase tracking-wider">Ya existe un contacto similar:</p>
                <p className="text-shell-text/90 mt-1 font-semibold">
                  {duplicate.first_name} {duplicate.last_name}
                  {duplicate.primary_phone && ` — ${duplicate.primary_phone}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Body: 2-column layout ──────────────────── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-shell-bg/10">
          {/* Left column: DATOS BÁSICOS + CONTEXTO + NOTAS */}
          <div className="w-full lg:w-1/2 border-r-0 lg:border-r border-shell-border p-6 space-y-6 lg:overflow-y-auto shrink-0 lg:shrink">
            <div>
              <h3 className="text-xs md:text-[10px] font-bold text-shell-text-muted uppercase tracking-[0.15em] mb-4">Datos básicos</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Nombre *">
                    <input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      autoFocus
                      placeholder="Nombre"
                      className="w-full h-11 bg-shell-bg/40 border border-shell-border rounded-xl px-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                  <Field label="Apellido">
                    <input
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Apellido"
                      className="w-full h-11 bg-shell-bg/40 border border-shell-border rounded-xl px-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                </div>

                <Field label="Teléfono">
                  <input
                    type="tel" inputMode="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+54 11 1234-5678"
                    className="w-full h-11 bg-shell-bg/40 border border-shell-border rounded-xl px-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email" inputMode="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contacto@email.com"
                    className="w-full h-11 bg-shell-bg/40 border border-shell-border rounded-xl px-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Rol">
                    <input
                      value={rol}
                      onChange={e => setRol(e.target.value)}
                      placeholder="Ej: Arquitecto, Inversor..."
                      className="w-full h-11 bg-shell-bg/40 border border-shell-border rounded-xl px-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                  <Field label="Ubicación">
                    <input
                      value={ubicacion}
                      onChange={e => setUbicacion(e.target.value)}
                      placeholder="Ej: Pilar, CABA..."
                      className="w-full h-11 bg-shell-bg/40 border border-shell-border rounded-xl px-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Contexto */}
            <div>
              <h3 className="text-xs md:text-[10px] font-bold text-shell-text-muted uppercase tracking-[0.15em] mb-3">Contexto</h3>
              <textarea
                value={contexto}
                onChange={e => setContexto(e.target.value)}
                placeholder="¿Cómo conocés a esta persona? ¿En qué contexto se conocieron?"
                rows={3}
                className="w-full bg-shell-bg/40 border border-shell-border rounded-xl p-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all resize-none"
              />
            </div>

            {/* Notas iniciales */}
            <div>
              <h3 className="text-xs md:text-[10px] font-bold text-shell-text-muted uppercase tracking-[0.15em] mb-3">Notas iniciales</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Información relevante, observaciones, detalles de la primera interacción..."
                rows={3}
                className="w-full bg-shell-bg/40 border border-shell-border rounded-xl p-3 text-sm font-semibold text-shell-text placeholder:text-shell-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all resize-none"
              />
            </div>
          </div>

          {/* Right column: CLASIFICACIÓN + FLAGS + PIPELINE */}
          <div className="w-full lg:w-1/2 p-6 space-y-6 lg:overflow-y-auto shrink-0 lg:shrink border-t border-shell-border lg:border-t-0">
            {/* Clasificación */}
            <div>
              <h3 className="text-xs md:text-[10px] font-bold text-shell-text-muted uppercase tracking-[0.15em] mb-4">Clasificación</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Origen">
                    <InlineSelectChip value={source} options={SOURCE_OPTIONS} onChange={setSource} />
                  </Field>
                  <Field label="Categoría">
                    <InlineSelectChip value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
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
            <div className="space-y-3.5">
              <h3 className="text-xs md:text-[10px] font-bold text-shell-text-muted uppercase tracking-[0.15em]">Flags</h3>
              <div className="flex flex-wrap gap-4 py-1.5 px-3 bg-shell-bg/40 border border-shell-border rounded-xl">
                <CheckboxField label="¿Estratégico?" checked={esEstrategico} onChange={setEsEstrategico} />
                <CheckboxField label="¿Influyente?" checked={esInfluyente} onChange={setEsInfluyente} />
                <CheckboxField label="¿Mentor?" checked={esMentor} onChange={setEsMentor} />
              </div>
            </div>

            {/* Pipeline (optional) */}
            <div className="pt-5 border-t border-shell-border space-y-4">
              <h3 className="text-xs md:text-[10px] font-bold text-shell-text-muted uppercase tracking-[0.15em]">Agregar a pipeline (opcional)</h3>
              <div className="grid grid-cols-2 gap-3.5">
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
                <p className="text-xs md:text-[10px] text-brand-accent/90 flex items-center gap-1.5 mt-2 bg-brand-accent/5 p-2 rounded-lg border border-brand-accent/10">
                  <ChevronDown size={12} />
                  Elegí una etapa para que el contacto aparezca en el kanban
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Error ──────────────────────────────────── */}
        {error && (
          <div className="px-6 py-2 shrink-0">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 font-semibold">
              {error}
            </p>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-shell-border bg-shell-bg/20 shrink-0 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-shell-text-muted hover:bg-shell-surface-hover cursor-pointer disabled:opacity-50 transition-colors h-11"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !firstName.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-accent hover:brightness-105 text-brand-primary cursor-pointer disabled:bg-shell-surface-hover disabled:text-shell-text-muted/50 disabled:cursor-not-allowed transition-all shadow-[0_4px_16px_rgba(200,164,90,0.15)] h-11 flex items-center justify-center"
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
      <label className="text-xs md:text-[11px] text-shell-text-muted font-bold block uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group py-1.5">
      <div
        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
          checked
            ? 'bg-brand-accent border-brand-accent text-brand-primary'
            : 'border-shell-border bg-shell-bg/40 group-hover:border-shell-text-muted'
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="currentColor">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-xs font-bold text-shell-text-muted group-hover:text-shell-text transition-colors">{label}</span>
    </label>
  )
}
