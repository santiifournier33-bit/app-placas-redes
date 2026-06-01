'use client'

import { useEffect, useState } from 'react'
import { X, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toISODate } from '@/lib/embudo/funnel'
import { MonthCalendar } from '@/components/embudo/MonthCalendar'
import { useContactStore } from '@/lib/stores/contactStore'

interface MarkContactedModalProps {
  contactId: string
  contactName?: string
  onClose: () => void
  onConfirmed?: () => void
}

/**
 * Confirmation step for "Contactado": instead of writing today's date on a
 * single (accidental) click, the user picks/confirms the real contact date.
 * Mirrors the embudo activity wizard's "date" step (same MonthCalendar + modal
 * shell) for cross-app consistency.
 */
export function MarkContactedModal({ contactId, contactName, onClose, onConfirmed }: MarkContactedModalProps) {
  const { markContacted } = useContactStore()
  const today = toISODate(new Date())
  const [date, setDate] = useState<string>(today)
  const [calMonth, setCalMonth] = useState<Date>(new Date(`${today}T12:00:00`))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleConfirm = async () => {
    setSaving(true)
    await markContacted(contactId, date)
    setSaving(false)
    onConfirmed?.()
    onClose()
  }

  const dateLabel = format(new Date(`${date}T12:00:00`), "EEEE d 'de' MMMM yyyy", { locale: es })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-surface-1 border border-border-subtle rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-[var(--shadow-modal)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary truncate">Registrar contacto</h3>
            {contactName && <p className="text-[11px] text-text-muted truncate">{contactName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer shrink-0" aria-label="Cerrar">
            <X size={18} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm font-medium text-text-secondary mb-3">¿Cuándo fue el último contacto?</p>
          <MonthCalendar
            month={calMonth}
            selected={date}
            onSelectDate={setDate}
            onMonthChange={setCalMonth}
          />
          <p className="text-xs text-text-muted mt-3 capitalize">{dateLabel}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-subtle flex flex-col gap-2 shrink-0">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:opacity-90 disabled:opacity-50 cursor-pointer transition-opacity"
          >
            {saving ? 'Guardando…' : <>Confirmar contacto <Check size={16} /></>}
          </button>
          <button onClick={onClose} className="w-full px-5 py-2 rounded-xl text-sm text-text-muted hover:text-text-primary cursor-pointer">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
