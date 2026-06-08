'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, ChevronDown } from 'lucide-react'
import { useContactStore, type Contact } from '@/lib/stores/contactStore'
import { usePipelinesStore } from '@/lib/stores/pipelinesStore'
import { validateContactInput, normalizePhone } from '@/lib/contacts/validation'
import { notify } from '@/lib/stores/toastStore'
import { InlineSelectChip } from './InlineSelectChip'
import {
  CIRCLE_OPTIONS,
  CATEGORY_OPTIONS,
  TIPO_OPTIONS,
  CERCANIA_OPTIONS,
  FIELD_HINTS,
} from './options'

interface AddContactPanelProps {
  onClose: () => void
  onCreated?: (contact: Contact) => void
}

export function AddContactPanel({ onClose, onCreated }: AddContactPanelProps) {
  const { addContact, addNote, findDuplicate } = useContactStore()
  const { pipelines } = usePipelinesStore()

  // Basic data
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('')
  const [ubicacion, setUbicacion] = useState('')

  // Classification
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Portal a document.body: el modal se renderiza dentro del wrapper z-10 de AppShell,
  // que queda por debajo del nav móvil (contexto de apilamiento). Portalear lo saca afuera
  // para que el z-[70] gane sobre BottomTabs/FAB. Ver AppShell.tsx.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // N5: en móvil el alta se completa en 3 pasos (≤ campos por vista) en vez de un
  // scroll largo de ~19 campos. Desktop muestra todo (2 columnas). step solo aplica en móvil.
  const TOTAL_STEPS = 3
  const STEP_LABELS = ['Datos', 'Clasificación', 'Más']
  const [step, setStep] = useState(1)
  // Clase de visibilidad por paso: oculto en móvil si no es el paso activo; siempre visible en desktop.
  const sv = (n: number) => (step === n ? '' : 'hidden') + ' lg:block'

  const goNext = () => {
    // Validar lo esencial antes de avanzar del paso 1.
    if (step === 1) {
      const v = validateContactInput({
        first_name: firstName,
        primary_email: email.trim() || null,
        primary_phone: phone.trim() || null,
      })
      if (!v.ok) { setFieldErrors(v.errors); return }
      setFieldErrors({})
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS))
  }
  const goBack = () => setStep(s => Math.max(s - 1, 1))

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
    // F2: validación en el borde (Zod) — nombre obligatorio, email con formato,
    // teléfono con mínimo de dígitos. Errores por campo, inline.
    const validation = validateContactInput({
      first_name: firstName,
      last_name: lastName,
      primary_email: email.trim() || null,
      primary_phone: phone.trim() || null,
    })
    if (!validation.ok) {
      setFieldErrors(validation.errors)
      setError(null)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        // Normaliza a E.164 AR cuando se puede; guarda null si es basura.
        primary_phone: normalizePhone(phone) ?? (phone.trim() || null),
        primary_email: email.trim().toLowerCase() || null,
        circulo,
        category,
        tipo,
        cercania: cercania != null ? Number(cercania) : null,
        rol: rol.trim() || null,
        contexto: contexto.trim() || null,
        ubicacion: ubicacion.trim() || null,
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
      // La nota inicial va al timeline (contact_notes), la fuente que muestran
      // los detalles de Contactos y Negocios — no al escalar contacts.notes.
      if (notes.trim()) {
        await addNote(result.id, notes)
      }
      notify('Contacto creado')
      onCreated?.(result)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setSubmitting(false)
    }
  }

  const modal = (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 lg:p-4 animate-fade-in" onClick={onClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full h-full lg:w-[90vw] lg:max-w-5xl lg:h-[85vh] bg-surface-1 border-0 lg:border border-border-subtle rounded-none lg:rounded-[24px] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-border-subtle bg-shell-bg/20 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary">Nuevo contacto</h2>
            <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-xl cursor-pointer transition-colors">
              <X size={20} className="text-text-muted" />
            </button>
          </div>

          {/* Duplicate warning */}
          {duplicate && (
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-3.5 mt-3">
              <AlertTriangle size={16} className="text-brand-accent shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-brand-accent uppercase tracking-wider">Ya existe un contacto similar:</p>
                <p className="text-text-primary/90 mt-1 font-semibold">
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
          <div className={`${[1, 3].includes(step) ? '' : 'hidden'} lg:block w-full lg:w-1/2 border-r-0 lg:border-r border-border-subtle p-6 space-y-6 lg:overflow-y-auto shrink-0 lg:shrink`}>
            <div className={sv(1)}>
              <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-4">Datos básicos</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Nombre *" error={fieldErrors.first_name}>
                    <input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      autoFocus
                      placeholder="Nombre"
                      className="w-full h-11 bg-shell-bg/40 border border-border-subtle rounded-xl px-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                  <Field label="Apellido">
                    <input
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Apellido"
                      className="w-full h-11 bg-shell-bg/40 border border-border-subtle rounded-xl px-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                </div>

                <Field label="Teléfono" error={fieldErrors.primary_phone}>
                  <input
                    type="tel" inputMode="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+54 11 1234-5678"
                    className="w-full h-11 bg-shell-bg/40 border border-border-subtle rounded-xl px-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                  />
                </Field>

                <Field label="Email" error={fieldErrors.primary_email}>
                  <input
                    type="email" inputMode="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="contacto@email.com"
                    className="w-full h-11 bg-shell-bg/40 border border-border-subtle rounded-xl px-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Rol" hint={FIELD_HINTS.rol}>
                    <input
                      value={rol}
                      onChange={e => setRol(e.target.value)}
                      placeholder="Ej: hermano, excompañero, colega"
                      className="w-full h-11 bg-shell-bg/40 border border-border-subtle rounded-xl px-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                  <Field label="Ubicación" hint={FIELD_HINTS.ubicacion}>
                    <input
                      value={ubicacion}
                      onChange={e => setUbicacion(e.target.value)}
                      placeholder="Ej: Pilar, CABA..."
                      className="w-full h-11 bg-shell-bg/40 border border-border-subtle rounded-xl px-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all"
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Contexto */}
            <div className={sv(3)}>
              <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1.5">Contexto</h3>
              <p className="text-[11px] text-text-muted/80 leading-snug mb-2">{FIELD_HINTS.contexto}</p>
              <textarea
                value={contexto}
                onChange={e => setContexto(e.target.value)}
                placeholder="Ej: colegio San José, gimnasio, trabajo anterior"
                rows={3}
                className="w-full bg-shell-bg/40 border border-border-subtle rounded-xl p-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all resize-none"
              />
            </div>

            {/* Notas iniciales */}
            <div className={sv(3)}>
              <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-3">Notas iniciales</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Información relevante, observaciones, detalles de la primera interacción..."
                rows={3}
                className="w-full bg-shell-bg/40 border border-border-subtle rounded-xl p-3 text-base lg:text-sm font-semibold text-text-primary placeholder:text-text-muted/40 outline-none focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/10 transition-all resize-none"
              />
            </div>
          </div>

          {/* Right column: CLASIFICACIÓN + FLAGS + PIPELINE */}
          <div className={`${[2, 3].includes(step) ? '' : 'hidden'} lg:block w-full lg:w-1/2 p-6 space-y-6 lg:overflow-y-auto shrink-0 lg:shrink border-t border-border-subtle lg:border-t-0`}>
            {/* Clasificación */}
            <div className={sv(2)}>
              <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-4">Clasificación</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Categoría" hint={FIELD_HINTS.category}>
                    <InlineSelectChip value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
                  </Field>
                  <Field label="Tipo" hint={FIELD_HINTS.tipo}>
                    <InlineSelectChip value={tipo} options={TIPO_OPTIONS} onChange={setTipo} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <Field label="Cercanía" hint={FIELD_HINTS.cercania}>
                    <InlineSelectChip value={cercania} options={CERCANIA_OPTIONS} onChange={setCercania} />
                  </Field>
                  <Field label="Círculo" hint={FIELD_HINTS.circulo}>
                    <InlineSelectChip value={circulo} options={CIRCLE_OPTIONS} onChange={setCirculo} />
                  </Field>
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className={`${sv(2)} space-y-3.5`}>
              <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em]">Flags</h3>
              <div className="flex flex-col gap-1 py-2 px-3 bg-shell-bg/40 border border-border-subtle rounded-xl">
                <CheckboxField label="¿Estratégico?" checked={esEstrategico} onChange={setEsEstrategico} hint={FIELD_HINTS.es_estrategico} />
                <CheckboxField label="¿Influyente?" checked={esInfluyente} onChange={setEsInfluyente} hint={FIELD_HINTS.es_influyente} />
                <CheckboxField label="¿Mentor?" checked={esMentor} onChange={setEsMentor} hint={FIELD_HINTS.es_mentor} />
              </div>
            </div>

            {/* Pipeline (optional) */}
            <div className={`${sv(3)} pt-5 border-t border-border-subtle space-y-4`}>
              <h3 className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em]">Agregar a proceso comercial (opcional)</h3>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Proceso comercial">
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

        {/* ── Footer DESKTOP ─────────────────────────── */}
        <div className="hidden lg:flex px-6 py-4 border-t border-border-subtle bg-shell-bg/20 shrink-0 items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-text-muted hover:bg-surface-2 cursor-pointer disabled:opacity-50 transition-colors h-11"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !firstName.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-accent hover:brightness-105 text-brand-primary cursor-pointer disabled:bg-surface-2 disabled:text-text-muted/50 disabled:cursor-not-allowed transition-all shadow-[0_4px_16px_rgba(200,164,90,0.15)] h-11 flex items-center justify-center"
          >
            {submitting ? 'Guardando...' : 'Crear contacto'}
          </button>
        </div>

        {/* ── Footer MÓVIL (stepper) ─────────────────── */}
        <div className="lg:hidden px-4 py-3 border-t border-border-subtle bg-shell-bg/20 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Paso {step} de {TOTAL_STEPS} · {STEP_LABELS[step - 1]}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? 'w-5 bg-brand-accent' : 'w-1.5 bg-border-default'}`} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={step === 1 ? onClose : goBack}
              disabled={submitting}
              className="px-4 min-h-11 rounded-xl text-sm font-bold text-text-muted hover:bg-surface-2 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            {step < TOTAL_STEPS ? (
              <button
                onClick={goNext}
                className="flex-1 min-h-11 rounded-xl text-sm font-bold bg-brand-accent hover:brightness-105 text-brand-primary cursor-pointer transition-all"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !firstName.trim()}
                className="flex-1 min-h-11 rounded-xl text-sm font-bold bg-brand-accent hover:brightness-105 text-brand-primary cursor-pointer disabled:bg-surface-2 disabled:text-text-muted/50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'Guardando...' : 'Crear contacto'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return mounted ? createPortal(modal, document.body) : null
}

/* ── Helpers ───────────────────────────────────────────── */

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs md:text-[11px] text-text-muted font-bold block uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-text-muted/80 leading-snug">{hint}</p>}
      {error && <p role="alert" className="text-xs text-red-400 font-medium">{error}</p>}
    </div>
  )
}

function CheckboxField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group py-1.5">
      <div
        className={`w-5 h-5 mt-0.5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
          checked
            ? 'bg-brand-accent border-brand-accent text-brand-primary'
            : 'border-border-subtle bg-shell-bg/40 group-hover:border-shell-text-muted'
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="currentColor">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <span className="text-xs font-bold text-text-muted group-hover:text-text-primary transition-colors block">{label}</span>
        {hint && <span className="text-[11px] text-text-muted/80 leading-snug block mt-0.5">{hint}</span>}
      </div>
    </label>
  )
}
