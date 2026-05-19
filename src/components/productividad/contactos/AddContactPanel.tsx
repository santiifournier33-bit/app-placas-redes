'use client'

import { useState, useMemo } from 'react'
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

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState<string | null>(null)
  const [pipelineId, setPipelineId] = useState<string | null>(null)
  const [stageId, setStageId] = useState<string | null>(null)
  const [circulo, setCirculo] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [tipo, setTipo] = useState<string | null>(null)
  const [cercania, setCercania] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const duplicate = useMemo(() => {
    if (!phone && !email) return undefined
    return findDuplicate(phone, email)
  }, [phone, email, findDuplicate])

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
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full lg:w-[480px] h-full bg-[#14141e] border-l border-white/[0.06] flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-white/[0.06] shrink-0">
          <h2 className="text-sm font-bold text-shell-text">Nuevo contacto</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.06] text-zinc-400 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {duplicate && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-400">Ya existe un contacto similar:</p>
                <p className="text-amber-300/80">
                  {duplicate.first_name} {duplicate.last_name}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *">
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoFocus
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-shell-text outline-none focus:border-blue-500/30"
              />
            </Field>
            <Field label="Apellido">
              <input
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-shell-text outline-none focus:border-blue-500/30"
              />
            </Field>
          </div>

          <Field label="Teléfono">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-shell-text outline-none focus:border-blue-500/30"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-shell-text outline-none focus:border-blue-500/30"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Origen">
              <InlineSelectChip value={source} options={SOURCE_OPTIONS} onChange={setSource} />
            </Field>
            <Field label="Círculo">
              <InlineSelectChip value={circulo} options={CIRCLE_OPTIONS} onChange={setCirculo} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <InlineSelectChip value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
            </Field>
            <Field label="Tipo">
              <InlineSelectChip value={tipo} options={TIPO_OPTIONS} onChange={setTipo} />
            </Field>
          </div>

          <Field label="Cercanía">
            <InlineSelectChip value={cercania} options={CERCANIA_OPTIONS} onChange={setCercania} />
          </Field>

          {/* Pipeline + stage */}
          <div className="pt-2 border-t border-white/[0.04] space-y-3">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Agregar a pipeline (opcional)</p>
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
              <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
                <ChevronDown size={10} />
                Elegí una etapa para que el contacto aparezca en el kanban
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 flex items-center justify-end gap-2 px-5 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-1.5 rounded-lg text-sm text-zinc-400 hover:bg-white/[0.06] cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !firstName.trim()}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white cursor-pointer disabled:bg-zinc-700 disabled:cursor-not-allowed"
          >
            {submitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-zinc-500 font-medium block">{label}</label>
      {children}
    </div>
  )
}
