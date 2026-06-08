"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, ChevronLeft, ChevronRight, X, Trash2, CalendarDays, CalendarRange, List } from "lucide-react"
import { useHydrated } from "@/lib/hooks/useHydrated"
import {
  useCalendarStore, EVENT_COLORS,
  type EventType, type CalendarEvent,
} from "@/lib/stores/calendarStore"
import { useTaskStore, type Task } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { TaskDetail } from "@/components/productividad/TaskDetail"
import { GoogleConnectButton } from "@/components/productividad/calendario/GoogleConnectButton"
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, addWeeks, subWeeks,
} from "date-fns"
import { es } from "date-fns/locale"

type CalendarItem = {
  id: string
  title: string
  date: Date
  type: "event" | "task"
  eventType?: EventType
  completed?: boolean
  time?: string
}

export default function CalendarioPage() {
  const mounted = useHydrated()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const [view, setView] = useState<"mes" | "semana" | "agenda">("mes")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formEvent, setFormEvent] = useState<CalendarEvent | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const { events, init: initCalendar, addEvent, updateEvent, deleteEvent } = useCalendarStore()
  const { tasks, init: initTasks } = useTaskStore()
  const initContacts = useContactStore(s => s.init)

  useEffect(() => {
    initCalendar()
    initTasks()
    initContacts()
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setIsAdmin(d?.user?.role === 'admin'))
      .catch(() => {})
  }, [])

  const calendarItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = []

    for (const event of events) {
      const d = new Date(event.event_date)
      const t = format(d, "HH:mm")
      items.push({
        id: event.id,
        title: event.title,
        date: d,
        type: "event",
        eventType: (event.event_type as EventType) ?? undefined,
        time: t !== "00:00" ? t : undefined,
      })
    }

    for (const task of tasks) {
      if (task.due_date && !task.parent_id) {
        items.push({
          id: task.id,
          title: task.title,
          date: new Date(task.due_date),
          type: "task",
          completed: task.completed ?? false,
          time: task.due_time ? task.due_time.slice(0, 5) : undefined,
        })
      }
    }

    return items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [events, tasks])

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-surface-overlay rounded-2xl" /></div>
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getItemsForDay(day: Date) {
    return calendarItems.filter(item => isSameDay(item.date, day))
  }

  const selectedItems = selectedDate ? getItemsForDay(selectedDate) : []

  function dotClass(item: CalendarItem) {
    return item.type === "task"
      ? (item.completed ? "bg-emerald-400" : "bg-blue-400")
      : item.eventType
        ? EVENT_COLORS[item.eventType].text.replace("text-", "bg-")
        : "bg-zinc-500"
  }

  function openItem(item: CalendarItem) {
    if (item.type === "event") {
      const ev = events.find(e => e.id === item.id)
      if (ev) { setFormEvent(ev); setShowForm(true) }
    } else {
      const tk = tasks.find(t => t.id === item.id)
      if (tk) setSelectedTask(tk)
    }
  }

  function renderItemRow(item: CalendarItem) {
    return (
      <button
        key={item.id}
        onClick={() => openItem(item)}
        className="flex items-center gap-3 w-full min-h-[44px] px-4 py-2.5 hover:bg-surface-overlay transition-colors cursor-pointer"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass(item)}`} />
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-sm ${item.completed ? "text-text-muted line-through" : "text-text-primary"}`}>
            {item.title}
          </p>
          <p className="text-xs md:text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
            {item.type === "task" ? "Tarea" : item.eventType ? EVENT_COLORS[item.eventType].label : "Evento"}
          </p>
        </div>
        {item.time && <span className="text-xs text-text-muted tabular-nums shrink-0">{item.time}</span>}
      </button>
    )
  }

  // Agenda: ítems de hoy en adelante, agrupados por día (Q5)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const agendaGroups: { day: Date; items: CalendarItem[] }[] = []
  if (view === "agenda") {
    for (const item of calendarItems) {
      if (item.date < todayStart) continue
      const last = agendaGroups[agendaGroups.length - 1]
      if (last && isSameDay(last.day, item.date)) last.items.push(item)
      else agendaGroups.push({ day: item.date, items: [item] })
    }
  }

  // Semana: 7 días de la semana del weekAnchor (M1)
  const weekStart = startOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekAnchor, { weekStartsOn: 1 })
  const weekDays = view === "semana" ? eachDayOfInterval({ start: weekStart, end: weekEnd }) : []

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-4 h-12 border-b border-border-subtle">
        <span className="text-xs text-text-muted uppercase tracking-wider">Sync</span>
        <GoogleConnectButton />
      </div>

      {/* View toggle: Mes / Agenda (Q5) */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border-subtle">
        {([["mes", "Mes", CalendarDays], ["semana", "Semana", CalendarRange], ["agenda", "Agenda", List]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg text-xs font-medium cursor-pointer transition-all ${
              view === key
                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                : "text-text-muted hover:bg-surface-overlay border border-transparent"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {view === "mes" && (
      <>
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-surface-overlay-hover rounded-lg cursor-pointer"
        >
          <ChevronLeft size={18} className="text-text-secondary" />
        </button>
        <h2 className="text-sm font-bold text-text-primary capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs md:text-[11px] text-blue-400 font-medium px-2 py-1 hover:bg-blue-500/10 rounded-lg cursor-pointer"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-surface-overlay-hover rounded-lg cursor-pointer"
          >
            <ChevronRight size={18} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-4 pt-3">
        {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map(day => (
          <div key={day} className="text-center text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-wider py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-4 pb-3">
        {days.map(day => {
          const dayItems = getItemsForDay(day)
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const selected = selectedDate && isSameDay(day, selectedDate)

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(selected ? null : day)}
              className={`aspect-square flex flex-col items-center justify-start pt-1.5 gap-0.5 rounded-xl transition-all cursor-pointer ${
                selected ? "bg-blue-500/15 border border-blue-500/30" :
                today ? "bg-surface-overlay border border-border-subtle" :
                "border border-transparent hover:bg-surface-overlay"
              } ${inMonth ? "" : "opacity-30"}`}
            >
              <span className={`text-xs tabular-nums ${
                today ? "font-bold text-blue-400" :
                selected ? "font-bold text-text-primary" :
                "text-text-secondary"
              }`}>
                {format(day, "d")}
              </span>
              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayItems.slice(0, 3).map(item => (
                    <span
                      key={item.id}
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.type === "task"
                          ? (item.completed ? "bg-emerald-400" : "bg-blue-400")
                          : item.eventType
                            ? EVENT_COLORS[item.eventType].text.replace("text-", "bg-")
                            : "bg-zinc-500"
                      }`}
                    />
                  ))}
                  {dayItems.length > 3 && (
                    <span className="text-[8px] text-text-muted">+{dayItems.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="border-t border-border-subtle">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-bold text-text-primary capitalize">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <button
              onClick={() => { setFormEvent(null); setShowForm(true) }}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              <Plus size={14} />
              Evento
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="px-4 pb-4">
              <p className="text-sm text-text-muted">Sin eventos ni tareas</p>
            </div>
          ) : (
            <div className="pb-2">
              {selectedItems.map(renderItemRow)}
            </div>
          )}
        </div>
      )}

      {/* Add button */}
      {!selectedDate && (
        <div className="px-4 pb-4">
          <button
            onClick={() => { setSelectedDate(new Date()); setFormEvent(null); setShowForm(true) }}
            className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-dashed border-border-default text-sm text-text-muted hover:text-text-secondary hover:border-white/[0.2] transition-all cursor-pointer"
          >
            <Plus size={16} />
            Nuevo evento
          </button>
        </div>
      )}
      </>
      )}

      {view === "semana" && (
      <>
        {/* Week nav header (M1) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <button
            onClick={() => setWeekAnchor(subWeeks(weekAnchor, 1))}
            className="p-2 hover:bg-surface-overlay-hover rounded-lg cursor-pointer"
          >
            <ChevronLeft size={18} className="text-text-secondary" />
          </button>
          <h2 className="text-sm font-bold text-text-primary capitalize">
            {format(weekStart, "d MMM", { locale: es })} – {format(weekEnd, "d MMM", { locale: es })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekAnchor(new Date())}
              className="text-xs md:text-[11px] text-blue-400 font-medium px-2 py-1 hover:bg-blue-500/10 rounded-lg cursor-pointer"
            >
              Esta semana
            </button>
            <button
              onClick={() => setWeekAnchor(addWeeks(weekAnchor, 1))}
              className="p-2 hover:bg-surface-overlay-hover rounded-lg cursor-pointer"
            >
              <ChevronRight size={18} className="text-text-secondary" />
            </button>
          </div>
        </div>
        <div className="pb-2">
          {weekDays.map(day => {
            const dayItems = getItemsForDay(day)
            return (
              <div key={day.toISOString()}>
                <div className="sticky top-0 z-10 bg-shell-bg/95 backdrop-blur-sm px-4 py-2 border-b border-border-subtle flex items-center justify-between">
                  <h3 className={`text-xs font-bold uppercase tracking-wider capitalize ${
                    isToday(day) ? "text-blue-400" : "text-text-secondary"
                  }`}>
                    {format(day, "EEEE d", { locale: es })}
                  </h3>
                  <button
                    onClick={() => { setSelectedDate(day); setFormEvent(null); setShowForm(true) }}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer min-h-[32px]"
                  >
                    <Plus size={13} /> Evento
                  </button>
                </div>
                {dayItems.length === 0 ? (
                  <p className="px-4 py-2 text-xs text-text-muted">—</p>
                ) : (
                  dayItems.map(renderItemRow)
                )}
              </div>
            )
          })}
        </div>
      </>
      )}

      {view === "agenda" && (
      /* Agenda view (Q5): lista cronológica de hoy en adelante */
      <div className="pb-2">
        {agendaGroups.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-text-muted">Nada agendado próximamente</p>
          </div>
        ) : (
          agendaGroups.map(group => (
            <div key={group.day.toISOString()}>
              <div className="sticky top-0 z-10 bg-shell-bg/95 backdrop-blur-sm px-4 py-2 border-b border-border-subtle">
                <h3 className={`text-xs font-bold uppercase tracking-wider capitalize ${
                  isToday(group.day) ? "text-blue-400" : "text-text-secondary"
                }`}>
                  {isToday(group.day) ? "Hoy · " : ""}{format(group.day, "EEEE d 'de' MMMM", { locale: es })}
                </h3>
              </div>
              {group.items.map(renderItemRow)}
            </div>
          ))
        )}
      </div>
      )}

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-3 text-xs md:text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Tarea</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Completada</span>
          {Object.entries(EVENT_COLORS).map(([key, val]) => (
            <span key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${val.text.replace("text-", "bg-")}`} />
              {val.label}
            </span>
          ))}
        </div>
      </div>

      {/* Event form modal */}
      {showForm && (
        <EventFormModal
          date={selectedDate ?? new Date()}
          event={formEvent}
          isAdmin={isAdmin}
          onSave={async (data) => {
            if (formEvent) await updateEvent(formEvent.id, data)
            else await addEvent(data)
            setShowForm(false)
            setFormEvent(null)
          }}
          onDelete={formEvent ? async () => {
            await deleteEvent(formEvent.id)
            setShowForm(false)
            setFormEvent(null)
          } : undefined}
          onClose={() => { setShowForm(false); setFormEvent(null) }}
        />
      )}

      {/* Task detail — editar la tarea desde el calendario (Q2) */}
      {selectedTask && (
        <TaskDetail
          key={selectedTask.id}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

function EventFormModal({
  date, event, isAdmin, onSave, onDelete, onClose,
}: {
  date: Date
  event?: CalendarEvent | null
  isAdmin: boolean
  onSave: (data: { title: string; description: string | null; event_date: string; event_end: string | null; event_type: EventType; scope: 'organization' | 'personal'; reminder_at: string | null; reminder_sent_at: null }) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const isEdit = !!event
  const [confirmDelete, setConfirmDelete] = useState(false)
  const initialOffset = event?.reminder_at
    ? Math.round((new Date(event.event_date).getTime() - new Date(event.reminder_at).getTime()) / 60000)
    : null
  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_date: format(event ? new Date(event.event_date) : date, "yyyy-MM-dd'T'HH:mm"),
    event_end: event?.event_end ? format(new Date(event.event_end), "yyyy-MM-dd'T'HH:mm") : "",
    event_type: (event?.event_type as EventType) ?? "reunion",
    scope: (event?.scope as 'organization' | 'personal') ?? "personal",
    reminderOffset: initialOffset as number | null,
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = () => {
    if (!form.title.trim()) return
    const baseMs = new Date(form.event_date).getTime()
    const reminder_at = form.reminderOffset === null || Number.isNaN(baseMs)
      ? null
      : new Date(baseMs - form.reminderOffset * 60000).toISOString()
    onSave({
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      event_end: form.event_end || null,
      event_type: form.event_type,
      scope: form.scope,
      reminder_at,
      // Re-arm dispatch whenever the event is saved (new or rescheduled reminder).
      reminder_sent_at: null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a24] rounded-t-2xl lg:rounded-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-text-primary">{isEdit ? "Editar evento" : "Nuevo evento"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer">
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {isAdmin && (
            <div>
              <label className="text-xs md:text-[11px] text-text-muted font-medium block mb-1">Alcance</label>
              <div className="flex gap-2">
                <button
                  onClick={() => set("scope", "personal")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.scope === "personal"
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : "bg-surface-overlay text-text-muted hover:bg-surface-overlay-hover border border-transparent"
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => set("scope", "organization")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.scope === "organization"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-surface-overlay text-text-muted hover:bg-surface-overlay-hover border border-transparent"
                  }`}
                >
                  De oficina (todos)
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs md:text-[11px] text-text-muted font-medium block mb-1">Titulo *</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full bg-surface-overlay rounded-xl px-3 py-2 text-sm text-text-primary outline-none border border-border-subtle focus:border-blue-500/30"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs md:text-[11px] text-text-muted font-medium block mb-1">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => set("event_type", key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.event_type === key
                      ? `${val.bg} ${val.text}`
                      : "bg-surface-overlay text-text-muted hover:bg-surface-overlay-hover"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs md:text-[11px] text-text-muted font-medium block mb-1">Fecha y hora</label>
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
              className="w-full bg-surface-overlay rounded-xl px-3 py-2 text-sm text-text-primary outline-none border border-border-subtle [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs md:text-[11px] text-text-muted font-medium block mb-1">Recordatorio</label>
            <div className="flex flex-wrap gap-2">
              {([[null, "Sin"], [0, "A la hora"], [10, "10 min"], [60, "1 h"], [1440, "1 día"]] as const).map(([val, label]) => (
                <button
                  key={label}
                  onClick={() => set("reminderOffset", val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.reminderOffset === val
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-surface-overlay text-text-muted hover:bg-surface-overlay-hover"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs md:text-[11px] text-text-muted font-medium block mb-1">Descripcion</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full bg-surface-overlay rounded-xl px-3 py-2 text-sm text-text-primary outline-none resize-none border border-border-subtle focus:border-blue-500/30"
            />
          </div>
        </div>

        <div className="p-4 border-t border-border-subtle flex items-center gap-2">
          {isEdit && onDelete && (
            <button
              onClick={() => { if (confirmDelete) onDelete(); else setConfirmDelete(true) }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                confirmDelete
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "text-red-400 hover:bg-red-500/10"
              }`}
            >
              <Trash2 size={16} />
              {confirmDelete ? "Confirmar" : "Borrar"}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-surface-overlay-hover cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 cursor-pointer"
          >
            {isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  )
}
