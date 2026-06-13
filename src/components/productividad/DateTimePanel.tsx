"use client"

import { useRef, useState } from "react"
import { format, addDays, nextMonday } from "date-fns"
import { Calendar, Sun, ArrowRight, CalendarOff, Clock, Bell, Check } from "lucide-react"
import { MonthCalendar } from "@/components/embudo/MonthCalendar"

export interface DateTimeValue {
  /** yyyy-MM-dd */
  date: string | null
  /** HH:mm */
  time: string | null
  /** minutos antes del vencimiento: null | 0 | 10 | 60 | 1440 */
  reminderOffsetMin: number | null
}

interface DateTimePanelProps extends DateTimeValue {
  onChange: (next: DateTimeValue) => void
  /** Botón "Listo" que cierra el host. Si se omite, no se muestra. */
  onDone?: () => void
  /** Oculta la sección de recordatorio (hosts que no lo soportan). */
  showReminder?: boolean
}

const REMINDER_OPTIONS = [
  { value: null, label: "Sin" },
  { value: 0, label: "Mismo horario" },
  { value: 10, label: "10 min antes" },
  { value: 60, label: "1 h antes" },
  { value: 1440, label: "1 día antes" },
] as const

/**
 * Panel único de fecha + hora + recordatorio. Presentacional: recibe value
 * (date/time/reminderOffsetMin) y emite onChange — sin tocar stores. Lo usan
 * QuickAddTask, MobileAddTaskSheet y TaskScheduler para un flujo consistente.
 *
 * Clave UX: el panel NO se cierra al elegir fecha. Chips rápidos + calendario
 * visual inline (mismo render en iOS/Android/desktop; semana inicia lunes) +
 * hora nativa con affordance clara + recordatorio, todo junto y compacto.
 */
export function DateTimePanel({
  date,
  time,
  reminderOffsetMin,
  onChange,
  onDone,
  showReminder = true,
}: DateTimePanelProps) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState<Date>(
    date ? new Date(`${date}T12:00:00`) : today
  )
  const timeRef = useRef<HTMLInputElement>(null)

  const quick = [
    { key: "hoy",     label: "Hoy",             Icon: Calendar,    color: "text-emerald-400", value: format(today, "yyyy-MM-dd") },
    { key: "manana",  label: "Mañana",          Icon: Sun,         color: "text-orange-400",  value: format(addDays(today, 1), "yyyy-MM-dd") },
    { key: "proxima", label: "Próxima semana",  Icon: ArrowRight,  color: "text-violet-400",  value: format(nextMonday(today), "yyyy-MM-dd") },
    { key: "sin",     label: "Sin fecha",       Icon: CalendarOff, color: "text-text-muted",  value: null },
  ] as const

  const emit = (patch: Partial<DateTimeValue>) =>
    onChange({ date, time, reminderOffsetMin, ...patch })

  const pickDate = (iso: string | null) => {
    // Al limpiar la fecha también se limpia el recordatorio (necesita ancla temporal).
    emit({ date: iso, reminderOffsetMin: iso ? reminderOffsetMin : null })
    if (iso) setViewMonth(new Date(`${iso}T12:00:00`))
  }

  const openTimePicker = () => {
    const el = timeRef.current
    if (!el) return
    // Default 10:00 cuando aún no hay hora. Se pre-carga en el DOM ANTES de abrir
    // el selector para que el menú nativo arranque en 10:00 (no en la hora actual).
    if (!time) {
      el.value = "10:00"
      emit({ time: "10:00" })
    }
    if (typeof el.showPicker === "function") {
      try { el.showPicker() } catch { el.focus() }
    } else {
      el.focus()
    }
  }

  return (
    <div className="flex flex-col">
      {/* Chips rápidos */}
      <div className="flex flex-wrap gap-2 px-3 pt-2.5 pb-1">
        {quick.map((o) => {
          const active = date === o.value
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => pickDate(o.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 touch-manipulation cursor-pointer ${
                active
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                  : "text-text-muted border border-border-subtle hover:bg-surface-overlay hover:text-text-secondary"
              }`}
            >
              <o.Icon size={13} className={active ? "text-blue-400" : o.color} />
              {o.label}
            </button>
          )
        })}
      </div>

      {/* Calendario visual inline (semana inicia lunes, sin card externa) */}
      <div className="px-3 pt-1">
        <MonthCalendar
          month={viewMonth}
          selected={date}
          onSelectDate={pickDate}
          onMonthChange={setViewMonth}
          weekStartsOn={1}
          bare
        />
      </div>

      {/* Hora — reloj a la izquierda, claramente clickeable (abre selector nativo) */}
      <div className="px-3 py-1.5 mt-0.5 border-t border-border-subtle flex items-center gap-2">
        <button
          type="button"
          onClick={openTimePicker}
          aria-label="Elegir hora"
          className="group flex items-center gap-2 cursor-pointer active:scale-[0.98] transition-transform touch-manipulation"
        >
          <span className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
            <Clock size={15} />
          </span>
          <span className="text-[13px] font-semibold text-text-primary">Hora</span>
        </button>
        {/* Pill de dígitos = <button> accesible (teclado/lector). El <input type=time>
            va como hermano superpuesto (opacity-0, pointer-events-none) solo para
            disparar el selector nativo vía showPicker() y portar el valor; los dígitos
            se muestran centrados en un <span> (WebKit no centra el input nativo). */}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={openTimePicker}
              aria-label={time ? `Hora: ${time}. Tocá para cambiar` : "Agregar hora"}
              className="flex items-center justify-center min-w-[72px] px-4 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/20 hover:bg-blue-500/25 active:scale-95 transition-all cursor-pointer touch-manipulation"
            >
              <span className="text-base font-bold text-blue-400 tabular-nums select-none">
                {time ?? "--:--"}
              </span>
            </button>
            <input
              ref={timeRef}
              type="time"
              value={time ?? ""}
              onChange={(e) => emit({ time: e.target.value || null })}
              tabIndex={-1}
              aria-hidden="true"
              className="absolute inset-0 w-full h-full opacity-0 pointer-events-none [color-scheme:dark]"
            />
          </div>
          {time && (
            <button
              type="button"
              onClick={() => emit({ time: null })}
              className="text-xs text-text-muted hover:text-text-secondary active:scale-95 transition-all touch-manipulation cursor-pointer"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {/* Recordatorio */}
      {showReminder && (
        <div className="px-3 py-1.5 border-t border-border-subtle">
          <div className="flex items-center gap-2 mb-1.5">
            <Bell size={14} className="text-text-muted shrink-0" />
            <span className="text-[13px] font-semibold text-text-primary">Recordatorio</span>
          </div>
          {date ? (
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((o) => {
                const active = reminderOffsetMin === o.value
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => emit({ reminderOffsetMin: o.value })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 touch-manipulation cursor-pointer ${
                      active
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : "text-text-muted border border-border-subtle hover:bg-surface-overlay hover:text-text-secondary"
                    }`}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Asigná una fecha primero</p>
          )}
        </div>
      )}

      {/* Footer "Listo" */}
      {onDone && (
        <div className="px-3 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onDone}
            className="flex items-center justify-center gap-1.5 w-full min-h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-all active:scale-[0.98] touch-manipulation cursor-pointer"
          >
            <Check size={16} />
            Listo
          </button>
        </div>
      )}
    </div>
  )
}
