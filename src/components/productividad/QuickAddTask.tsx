"use client"

import { useState, useRef, useEffect } from "react"
import {
  Calendar, Flag, Bell, X, ChevronRight, Repeat,
  CheckSquare, MapPin, Phone, Users, PenLine, UserCircle,
  Coffee, Gift, Megaphone,
} from "lucide-react"
import { useTaskStore, TASK_TYPES, type TaskType } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { format, addDays, nextMonday } from "date-fns"
import { es } from "date-fns/locale"

const PRIORITY_OPTIONS = [
  { value: 1 as const, label: "Prioridad 1", color: "text-red-400",    flag: "bg-red-500"    },
  { value: 2 as const, label: "Prioridad 2", color: "text-orange-400", flag: "bg-orange-500" },
  { value: 3 as const, label: "Prioridad 3", color: "text-blue-400",   flag: "bg-blue-500"   },
  { value: 4 as const, label: "Sin prioridad", color: "text-zinc-500", flag: "bg-zinc-600"   },
]

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  tarea:             <CheckSquare size={14} />,
  visita:            <MapPin      size={14} />,
  llamada:           <Phone       size={14} />,
  reunion:           <Users       size={14} />,
  firma:             <PenLine     size={14} />,
  cafe:              <Coffee      size={14} />,
  item_valor:        <Gift        size={14} />,
  item_valor_masivo: <Megaphone   size={14} />,
}

interface QuickAddTaskProps {
  sectionId: string | null
  onClose: () => void
  preselectedContactId?: string | null
  hideContactPicker?: boolean
}

export function QuickAddTask({ sectionId, onClose, preselectedContactId = null, hideContactPicker = false }: QuickAddTaskProps) {
  const { addTask, updateTask, tasks } = useTaskStore()
  const { contacts } = useContactStore()

  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4)
  const [taskType, setTaskType] = useState<TaskType>("tarea")
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [reminder, setReminder] = useState<string | null>(null)
  const [contactId, setContactId] = useState<string | null>(preselectedContactId)
  const [contactSearch, setContactSearch] = useState("")
  const [recurrenceFreq, setRecurrenceFreq] = useState<string | null>(null)

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const [showType, setShowType] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd")
  const nextWeekStr = format(nextMonday(today), "yyyy-MM-dd")

  const dateLabel = dueDate
    ? dueDate === todayStr ? "Hoy"
    : dueDate === tomorrowStr ? "Mañana"
    : format(new Date(dueDate + "T12:00:00"), "d MMM", { locale: es })
    : null

  const handleCreate = async () => {
    if (!title.trim()) return
    await addTask(title.trim(), sectionId)
    const newTask = useTaskStore.getState().tasks.at(-1)
    if (newTask) {
      await updateTask(newTask.id, {
        priority,
        task_type: taskType,
        due_date: dueDate ?? null,
        reminder,
        contact_id: contactId,
        ...(recurrenceFreq ? { recurrence_freq: recurrenceFreq } : {}),
      })
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate()
    if (e.key === "Escape") onClose()
  }

  const closeAllDropdowns = () => {
    setShowDatePicker(false)
    setShowPriority(false)
    setShowType(false)
    setShowReminder(false)
    setShowContactPicker(false)
    setShowRecurrence(false)
  }

  const selectedContact = contacts.find((c) => c.id === contactId) ?? null
  const filteredContacts = contacts.filter((c) => {
    const q = contactSearch.toLowerCase()
    return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.primary_phone ?? '').includes(q)
  }).slice(0, 20)

  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#16161f] p-3 space-y-2.5">
      {/* Title input */}
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nombre de la tarea"
        className="w-full bg-transparent text-sm text-shell-text placeholder:text-zinc-600 outline-none"
      />

      {/* Description placeholder line */}
      <input
        placeholder="Descripcion"
        className="w-full bg-transparent text-xs text-zinc-600 placeholder:text-zinc-700 outline-none"
      />

      {/* Action row */}
      <div className="flex items-center gap-1 flex-wrap">

        {/* Date */}
        <div className="relative">
          <button
            onClick={() => { closeAllDropdowns(); setShowDatePicker(!showDatePicker) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              dueDate ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            <Calendar size={13} />
            {dateLabel ?? "Fecha"}
          </button>
          {showDatePicker && (
            <div className="absolute bottom-full mb-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-1 z-20 shadow-xl min-w-[160px]">
              {[
                { label: "Hoy", value: todayStr, sub: format(today, "EEE", { locale: es }) },
                { label: "Mañana", value: tomorrowStr, sub: format(addDays(today, 1), "EEE", { locale: es }) },
                { label: "Próx semana", value: nextWeekStr, sub: format(nextMonday(today), "d MMM", { locale: es }) },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDueDate(opt.value); setShowDatePicker(false) }}
                  className="flex items-center justify-between gap-3 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-300 cursor-pointer"
                >
                  <span>{opt.label}</span>
                  <span className="text-zinc-600">{opt.sub}</span>
                </button>
              ))}
              <div className="border-t border-white/[0.06] mt-1 pt-1 px-3 pb-2">
                <input
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(e) => { setDueDate(e.target.value); setShowDatePicker(false) }}
                  className="w-full bg-transparent text-xs text-zinc-400 outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="relative">
          <button
            onClick={() => { closeAllDropdowns(); setShowPriority(!showPriority) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              priority < 4 ? "bg-white/[0.06] border border-white/[0.06]" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            <Flag size={13} className={PRIORITY_OPTIONS.find(p => p.value === priority)?.color} />
            {priority < 4 ? `P${priority}` : "Prioridad"}
          </button>
          {showPriority && (
            <div className="absolute bottom-full mb-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-1 z-20 shadow-xl min-w-[140px]">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs cursor-pointer"
                >
                  <Flag size={13} className={opt.color} />
                  <span className={opt.color}>{opt.label}</span>
                  {priority === opt.value && <span className="ml-auto text-zinc-500">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Task type */}
        <div className="relative">
          <button
            onClick={() => { closeAllDropdowns(); setShowType(!showType) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              taskType !== "tarea" ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            <span className={taskType !== "tarea" ? "text-violet-400" : "text-zinc-500"}>
              {TYPE_ICONS[taskType]}
            </span>
            {taskType !== "tarea" ? TASK_TYPES[taskType].label : "Tipo"}
          </button>
          {showType && (
            <div className="absolute bottom-full mb-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-1 z-20 shadow-xl min-w-[140px]">
              {(Object.entries(TASK_TYPES) as [TaskType, typeof TASK_TYPES[TaskType]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setTaskType(key); setShowType(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-300 cursor-pointer"
                >
                  <span className="text-zinc-500">{TYPE_ICONS[key]}</span>
                  <span>{val.label}</span>
                  {taskType === key && <span className="ml-auto text-zinc-500">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reminder */}
        <div className="relative">
          <button
            onClick={() => { closeAllDropdowns(); setShowReminder(!showReminder) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              reminder ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            <Bell size={13} />
            {reminder ? format(new Date(reminder), "d MMM HH:mm", { locale: es }) : "Recordar"}
          </button>
          {showReminder && (
            <div className="absolute bottom-full mb-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] p-3 z-20 shadow-xl">
              <p className="text-[10px] text-zinc-600 mb-2">Fecha y hora del recordatorio</p>
              <input
                type="datetime-local"
                value={reminder ?? ""}
                onChange={(e) => { setReminder(e.target.value || null); setShowReminder(false) }}
                className="bg-transparent text-xs text-zinc-300 outline-none [color-scheme:dark]"
              />
            </div>
          )}
        </div>

        {/* Recurrence */}
        <div className="relative">
          <button
            onClick={() => { closeAllDropdowns(); setShowRecurrence(!showRecurrence) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              recurrenceFreq ? "bg-teal-500/15 text-teal-400 border border-teal-500/20" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            <Repeat size={13} />
            {recurrenceFreq ? { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' }[recurrenceFreq] ?? 'Recurrente' : 'Repetir'}
          </button>
          {showRecurrence && (
            <div className="absolute bottom-full mb-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-1 z-20 shadow-xl min-w-[140px]">
              {[
                { value: null, label: 'Sin repetición' },
                { value: 'daily', label: 'Diario' },
                { value: 'weekly', label: 'Semanal' },
                { value: 'biweekly', label: 'Quincenal' },
                { value: 'monthly', label: 'Mensual' },
              ].map((opt) => (
                <button
                  key={opt.value ?? 'none'}
                  onClick={() => { setRecurrenceFreq(opt.value); setShowRecurrence(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-300 cursor-pointer"
                >
                  {opt.label}
                  {recurrenceFreq === opt.value && <span className="ml-auto text-zinc-500">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contact */}
        {!hideContactPicker && (
        <div className="relative">
          <button
            onClick={() => { closeAllDropdowns(); setShowContactPicker(!showContactPicker); setContactSearch("") }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              contactId ? "bg-green-500/15 text-green-400 border border-green-500/20" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            <UserCircle size={13} />
            {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : "Contacto"}
          </button>
          {showContactPicker && (
            <div className="absolute bottom-full mb-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] z-20 shadow-xl w-52">
              <div className="p-2 border-b border-white/[0.06]">
                <input
                  autoFocus
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="w-full bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none"
                />
              </div>
              <div className="max-h-44 overflow-y-auto py-1">
                {contactId && (
                  <button
                    onClick={() => { setContactId(null); setShowContactPicker(false) }}
                    className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-500 cursor-pointer"
                  >
                    <UserCircle size={12} />
                    Sin contacto
                  </button>
                )}
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setContactId(c.id); setShowContactPicker(false) }}
                    className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-400 font-bold shrink-0">
                      {(c.first_name || c.last_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-zinc-300 truncate">{c.first_name} {c.last_name}</div>
                      <div className="text-zinc-600 truncate">{c.primary_phone}</div>
                    </div>
                    {contactId === c.id && <span className="text-zinc-600 ml-auto">✓</span>}
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-xs text-zinc-600 text-center py-3">Sin resultados</p>
                )}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
        <div className="text-[10px] text-zinc-600">
          {sectionId === null ? "(Sin sección)" : ""}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:bg-white/[0.06] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              title.trim()
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}
          >
            Crear
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
