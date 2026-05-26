"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, ChevronLeft, ChevronRight, X } from "lucide-react"
import {
  useCalendarStore, EVENT_COLORS,
  type EventType,
} from "@/lib/stores/calendarStore"
import { useTaskStore } from "@/lib/stores/taskStore"
import { GoogleConnectButton } from "@/components/productividad/calendario/GoogleConnectButton"
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths,
} from "date-fns"
import { es } from "date-fns/locale"

type CalendarItem = {
  id: string
  title: string
  date: Date
  type: "event" | "task"
  eventType?: EventType
  completed?: boolean
}

export default function CalendarioPage() {
  const [mounted, setMounted] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const { events, init: initCalendar, addEvent } = useCalendarStore()
  const { tasks, init: initTasks } = useTaskStore()

  useEffect(() => {
    setMounted(true)
    initCalendar()
    initTasks()
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setIsAdmin(d?.user?.role === 'admin'))
      .catch(() => {})
  }, [])

  const calendarItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = []

    for (const event of events) {
      items.push({
        id: event.id,
        title: event.title,
        date: new Date(event.event_date),
        type: "event",
        eventType: (event.event_type as EventType) ?? undefined,
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
        })
      }
    }

    return items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [events, tasks])

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-64 bg-white/[0.04] rounded-2xl" /></div>
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between px-4 h-12 border-b border-white/[0.04]">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Sync</span>
        <GoogleConnectButton />
      </div>

      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-white/[0.06] rounded-lg cursor-pointer"
        >
          <ChevronLeft size={18} className="text-zinc-400" />
        </button>
        <h2 className="text-sm font-bold text-shell-text capitalize">
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
            className="p-2 hover:bg-white/[0.06] rounded-lg cursor-pointer"
          >
            <ChevronRight size={18} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-4 pt-3">
        {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map(day => (
          <div key={day} className="text-center text-xs md:text-[10px] font-bold text-zinc-600 uppercase tracking-wider py-1">
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
                today ? "bg-white/[0.04] border border-white/[0.06]" :
                "border border-transparent hover:bg-white/[0.03]"
              } ${inMonth ? "" : "opacity-30"}`}
            >
              <span className={`text-xs tabular-nums ${
                today ? "font-bold text-blue-400" :
                selected ? "font-bold text-shell-text" :
                "text-zinc-400"
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
                    <span className="text-[8px] text-zinc-600">+{dayItems.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="border-t border-white/[0.04]">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-bold text-shell-text capitalize">
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
            </h3>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
            >
              <Plus size={14} />
              Evento
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className="px-4 pb-4">
              <p className="text-sm text-zinc-600">Sin eventos ni tareas</p>
            </div>
          ) : (
            <div className="pb-2">
              {selectedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    item.type === "task"
                      ? (item.completed ? "bg-emerald-400" : "bg-blue-400")
                      : item.eventType
                        ? EVENT_COLORS[item.eventType].text.replace("text-", "bg-")
                        : "bg-zinc-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.completed ? "text-zinc-600 line-through" : "text-shell-text"}`}>
                      {item.title}
                    </p>
                    <p className="text-xs md:text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">
                      {item.type === "task" ? "Tarea" : item.eventType ? EVENT_COLORS[item.eventType].label : "Evento"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add button */}
      {!selectedDate && (
        <div className="px-4 pb-4">
          <button
            onClick={() => { setSelectedDate(new Date()); setShowForm(true) }}
            className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-dashed border-white/[0.1] text-sm text-zinc-500 hover:text-zinc-300 hover:border-white/[0.2] transition-all cursor-pointer"
          >
            <Plus size={16} />
            Nuevo evento
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-3 text-xs md:text-[10px] text-zinc-500">
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
          isAdmin={isAdmin}
          onSave={async (data) => {
            await addEvent(data)
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}

function EventFormModal({
  date, isAdmin, onSave, onClose,
}: {
  date: Date
  isAdmin: boolean
  onSave: (data: { title: string; description: string | null; event_date: string; event_end: string | null; event_type: EventType; scope: 'organization' | 'personal' }) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: format(date, "yyyy-MM-dd'T'HH:mm"),
    event_end: "",
    event_type: "reunion" as EventType,
    scope: 'personal' as 'organization' | 'personal',
  })

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = () => {
    if (!form.title.trim()) return
    onSave({
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      event_end: form.event_end || null,
      event_type: form.event_type,
      scope: form.scope,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a24] rounded-t-2xl lg:rounded-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-shell-text">Nuevo evento</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg cursor-pointer">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {isAdmin && (
            <div>
              <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Alcance</label>
              <div className="flex gap-2">
                <button
                  onClick={() => set("scope", "personal")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.scope === "personal"
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.06] border border-transparent"
                  }`}
                >
                  Personal
                </button>
                <button
                  onClick={() => set("scope", "organization")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.scope === "organization"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.06] border border-transparent"
                  }`}
                >
                  De oficina (todos)
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Titulo *</label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none border border-white/[0.06] focus:border-blue-500/30"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => set("event_type", key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    form.event_type === key
                      ? `${val.bg} ${val.text}`
                      : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.06]"
                  }`}
                >
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Fecha y hora</label>
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => set("event_date", e.target.value)}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none border border-white/[0.06] [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs md:text-[11px] text-zinc-500 font-medium block mb-1">Descripcion</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full bg-white/[0.04] rounded-xl px-3 py-2 text-sm text-shell-text outline-none resize-none border border-white/[0.06] focus:border-blue-500/30"
            />
          </div>
        </div>

        <div className="p-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-white/[0.06] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 cursor-pointer"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  )
}
