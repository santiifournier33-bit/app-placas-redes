"use client"

import { useState, useEffect } from "react"
import {
  Calendar, Flag, Bell, ChevronRight, Repeat,
  CheckSquare, MapPin, Phone, Users, PenLine, UserCircle,
  Coffee, Gift, Megaphone,
} from "lucide-react"
import { useTaskStore, TASK_TYPES, type TaskType } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { format, addDays, nextMonday } from "date-fns"
import { es } from "date-fns/locale"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"

const PRIORITY_OPTIONS = [
  { value: 1 as const, label: "Prioridad 1", color: "text-red-400" },
  { value: 2 as const, label: "Prioridad 2", color: "text-orange-400" },
  { value: 3 as const, label: "Prioridad 3", color: "text-blue-400" },
  { value: 4 as const, label: "Sin prioridad", color: "text-text-muted" },
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

interface MobileAddTaskSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSectionId: string | null
  /** Pre-fill the due date (yyyy-MM-dd), e.g. when adding from a day column in Próximo. */
  initialDate?: string | null
}

export function MobileAddTaskSheet({ open, onOpenChange, initialSectionId, initialDate = null }: MobileAddTaskSheetProps) {
  const { addTask, updateTask, sections } = useTaskStore()
  const { contacts } = useContactStore()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4)
  const [taskType, setTaskType] = useState<TaskType>("tarea")
  const [dueDate, setDueDate] = useState<string | null>(null)
  const [reminderOffsetMin, setReminderOffsetMin] = useState<number | null>(null)
  const [contactId, setContactId] = useState<string | null>(null)
  const [contactSearch, setContactSearch] = useState("")
  const [recurrenceFreq, setRecurrenceFreq] = useState<string | null>(null)
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(initialSectionId)

  // Internal popovers
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const [showType, setShowType] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrentSectionId(initialSectionId)
      setTitle("")
      setDescription("")
      setPriority(4)
      setTaskType("tarea")
      setDueDate(initialDate)
      setReminderOffsetMin(null)
      setContactId(null)
      setRecurrenceFreq(null)
      closeAllDropdowns()
    }
  }, [open, initialSectionId, initialDate])

  const today = new Date()
  const todayStr = format(today, "yyyy-MM-dd")
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd")
  const nextWeekStr = format(nextMonday(today), "yyyy-MM-dd")

  const dateLabel = dueDate
    ? dueDate === todayStr ? "Hoy"
    : dueDate === tomorrowStr ? "Mañana"
    : format(new Date(dueDate + "T12:00:00"), "d MMM", { locale: es })
    : null

  const computeReminderAt = (): string | null => {
    if (reminderOffsetMin === null || !dueDate) return null
    const dueIso = `${dueDate}T09:00:00`
    const due = new Date(dueIso)
    const reminderMs = due.getTime() - reminderOffsetMin * 60 * 1000
    return new Date(reminderMs).toISOString()
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    await addTask(title.trim(), currentSectionId)
    const newTask = useTaskStore.getState().tasks.at(-1)
    if (newTask) {
      await updateTask(newTask.id, {
        description: description.trim() || undefined,
        priority,
        task_type: taskType,
        due_date: dueDate ?? null,
        reminder_at: computeReminderAt(),
        contact_id: contactId,
        ...(recurrenceFreq ? { recurrence_freq: recurrenceFreq } : {}),
      })
    }
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleCreate()
    }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-0 pt-2 bg-surface-1" showClose={false}>
        {/* Grabber handle (native bottom-sheet affordance) */}
        <div className="flex justify-center pt-1 pb-2">
          <div className="w-10 h-1 rounded-full bg-border-strong/40" />
        </div>
        <SheetHeader className="sr-only">
          <SheetTitle>Nueva tarea</SheetTitle>
          <SheetDescription>Añadir nueva tarea con opciones avanzadas</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 max-h-[85vh] overflow-y-auto hide-scrollbar">
          
          {/* Main inputs */}
          <div className="px-4 flex flex-col gap-1">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nombre de la tarea"
              className="w-full bg-transparent text-base font-medium text-text-primary placeholder:text-text-muted outline-none caret-red-500"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descripción"
              className="w-full bg-transparent text-sm text-text-muted placeholder:text-zinc-600 outline-none"
            />
          </div>

          {/* Horizontally scrollable actions row */}
          <div className="overflow-x-auto hide-scrollbar px-4 pb-2 pt-1">
            <div className="flex items-center gap-2 w-max">
              {/* Date */}
              <div className="relative">
                <button
                  onClick={() => { closeAllDropdowns(); setShowDatePicker(!showDatePicker) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    dueDate ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "text-text-muted hover:bg-surface-overlay border border-border-subtle"
                  }`}
                >
                  <Calendar size={14} />
                  {dateLabel ?? "Fecha"}
                </button>
                {showDatePicker && (
                  <div className="absolute bottom-full mb-2 left-0 bg-surface-2 rounded-xl border border-border-default py-1 z-20 shadow-xl min-w-[160px]">
                    {[
                      { label: "Hoy", value: todayStr, sub: format(today, "EEE", { locale: es }) },
                      { label: "Mañana", value: tomorrowStr, sub: format(addDays(today, 1), "EEE", { locale: es }) },
                      { label: "Próx semana", value: nextWeekStr, sub: format(nextMonday(today), "d MMM", { locale: es }) },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setDueDate(opt.value); setShowDatePicker(false) }}
                        className="flex items-center justify-between gap-3 px-3 py-3 w-full hover:bg-surface-overlay text-sm text-text-secondary cursor-pointer"
                      >
                        <span>{opt.label}</span>
                        <span className="text-xs text-text-muted">{opt.sub}</span>
                      </button>
                    ))}
                    <div className="border-t border-border-subtle mt-1 pt-2 px-3 pb-2">
                      <input
                        type="date"
                        value={dueDate ?? ""}
                        onChange={(e) => { setDueDate(e.target.value); setShowDatePicker(false) }}
                        className="w-full bg-transparent text-sm text-text-secondary outline-none [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Priority */}
              <div className="relative">
                <button
                  onClick={() => { closeAllDropdowns(); setShowPriority(!showPriority) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    priority < 4 ? "bg-surface-overlay-hover border border-border-subtle" : "text-text-muted hover:bg-surface-overlay border border-border-subtle"
                  }`}
                >
                  <Flag size={14} className={PRIORITY_OPTIONS.find(p => p.value === priority)?.color} />
                  {priority < 4 ? `P${priority}` : "Prioridad"}
                </button>
                {showPriority && (
                  <div className="absolute bottom-full mb-2 left-0 bg-surface-2 rounded-xl border border-border-default py-1 z-20 shadow-xl min-w-[160px]">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                        className="flex items-center gap-3 px-3 py-3 w-full hover:bg-surface-overlay text-sm cursor-pointer"
                      >
                        <Flag size={14} className={opt.color} />
                        <span className={opt.color}>{opt.label}</span>
                        {priority === opt.value && <span className="ml-auto text-text-muted">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Task Type */}
              <div className="relative">
                <button
                  onClick={() => { closeAllDropdowns(); setShowType(!showType) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    taskType !== "tarea" ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-text-muted hover:bg-surface-overlay border border-border-subtle"
                  }`}
                >
                  <span className={taskType !== "tarea" ? "text-violet-400" : "text-text-muted"}>
                    {TYPE_ICONS[taskType]}
                  </span>
                  {taskType !== "tarea" ? TASK_TYPES[taskType].label : "Tipo"}
                </button>
                {showType && (
                  <div className="absolute bottom-full mb-2 left-0 bg-surface-2 rounded-xl border border-border-default py-1 z-20 shadow-xl min-w-[160px]">
                    {(Object.entries(TASK_TYPES) as [TaskType, typeof TASK_TYPES[TaskType]][]).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => { setTaskType(key); setShowType(false) }}
                        className="flex items-center gap-3 px-3 py-3 w-full hover:bg-surface-overlay text-sm text-text-secondary cursor-pointer"
                      >
                        <span className="text-text-muted">{TYPE_ICONS[key]}</span>
                        <span>{val.label}</span>
                        {taskType === key && <span className="ml-auto text-text-muted">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reminder */}
              <div className="relative">
                <button
                  onClick={() => { if (dueDate) { closeAllDropdowns(); setShowReminder(!showReminder) } }}
                  disabled={!dueDate}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 ${
                    !dueDate
                      ? "text-zinc-700 cursor-not-allowed opacity-50 border border-border-subtle"
                      : reminderOffsetMin !== null
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 cursor-pointer"
                        : "text-text-muted hover:bg-surface-overlay border border-border-subtle cursor-pointer"
                  }`}
                >
                  <Bell size={14} />
                  {reminderOffsetMin === null
                    ? "Recordar"
                    : reminderOffsetMin === 0
                      ? "A la hora"
                      : reminderOffsetMin === 10
                        ? "10 min"
                        : reminderOffsetMin === 60
                          ? "1 hora"
                          : "1 día"}
                </button>
                {showReminder && (
                  <div className="absolute bottom-full mb-2 left-0 bg-surface-2 rounded-xl border border-border-default py-1 z-20 shadow-xl min-w-[160px]">
                    {[
                      { value: null, label: 'Sin recordatorio' },
                      { value: 0, label: 'A la hora' },
                      { value: 10, label: '10 min antes' },
                      { value: 60, label: '1 h antes' },
                      { value: 1440, label: '1 día antes' },
                    ].map((opt) => (
                      <button
                        key={opt.value ?? 'none'}
                        onClick={() => { setReminderOffsetMin(opt.value); setShowReminder(false) }}
                        className="flex items-center gap-3 px-3 py-3 w-full hover:bg-surface-overlay text-sm text-text-secondary cursor-pointer"
                      >
                        {opt.label}
                        {reminderOffsetMin === opt.value && <span className="ml-auto text-text-muted">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recurrence */}
              <div className="relative">
                <button
                  onClick={() => { closeAllDropdowns(); setShowRecurrence(!showRecurrence) }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    recurrenceFreq ? "bg-teal-500/15 text-teal-400 border border-teal-500/20" : "text-text-muted hover:bg-surface-overlay border border-border-subtle"
                  }`}
                >
                  <Repeat size={14} />
                  {recurrenceFreq ? { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincen.', monthly: 'Mensual' }[recurrenceFreq] ?? 'Recurr.' : 'Repetir'}
                </button>
                {showRecurrence && (
                  <div className="absolute bottom-full mb-2 right-0 bg-surface-2 rounded-xl border border-border-default py-1 z-20 shadow-xl min-w-[160px]">
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
                        className="flex items-center gap-3 px-3 py-3 w-full hover:bg-surface-overlay text-sm text-text-secondary cursor-pointer"
                      >
                        {opt.label}
                        {recurrenceFreq === opt.value && <span className="ml-auto text-text-muted">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="relative">
                <button
                  onClick={() => { closeAllDropdowns(); setShowContactPicker(!showContactPicker); setContactSearch("") }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                    contactId ? "bg-green-500/15 text-green-400 border border-green-500/20" : "text-text-muted hover:bg-surface-overlay border border-border-subtle"
                  }`}
                >
                  <UserCircle size={14} />
                  {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : "Contacto"}
                </button>
                {showContactPicker && (
                  <div className="absolute bottom-full mb-2 right-0 bg-surface-2 rounded-xl border border-border-default z-20 shadow-xl w-64">
                    <div className="p-2 border-b border-border-subtle">
                      <input
                        autoFocus
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        placeholder="Buscar contacto..."
                        className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted outline-none"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {contactId && (
                        <button
                          onClick={() => { setContactId(null); setShowContactPicker(false) }}
                          className="flex items-center gap-3 px-3 py-3 w-full hover:bg-surface-overlay text-sm text-text-muted cursor-pointer"
                        >
                          <UserCircle size={14} />
                          Sin contacto
                        </button>
                      )}
                      {filteredContacts.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setContactId(c.id); setShowContactPicker(false) }}
                          className="flex items-center gap-3 px-3 py-3 w-full hover:bg-surface-overlay text-sm cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-bold shrink-0">
                            {(c.first_name || c.last_name || "?")[0]}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-text-secondary truncate">{c.first_name} {c.last_name}</div>
                            <div className="text-xs text-text-muted truncate">{c.primary_phone}</div>
                          </div>
                          {contactId === c.id && <span className="text-text-muted ml-auto">✓</span>}
                        </button>
                      ))}
                      {filteredContacts.length === 0 && (
                        <p className="text-sm text-text-muted text-center py-4">Sin resultados</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Footer: Section selector & CTA */}
          <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-surface-1">
            <select
              value={currentSectionId ?? ""}
              onChange={(e) => setCurrentSectionId(e.target.value === "" ? null : e.target.value)}
              className="bg-transparent text-sm font-medium text-text-secondary hover:text-text-primary outline-none appearance-none cursor-pointer pr-4 max-w-[60%]"
              style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right center", backgroundSize: "14px" }}
            >
              <option value="" className="bg-surface-2">Bandeja de entrada</option>
              {sections
                .sort((a, b) => a.position - b.position)
                .map(s => (
                  <option key={s.id} value={s.id} className="bg-surface-2">
                    {s.name}
                  </option>
                ))}
            </select>

            <button
              onClick={handleCreate}
              disabled={!title.trim()}
              aria-label="Crear tarea"
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-all shadow-md active:scale-95 ${
                title.trim()
                  ? "bg-red-500 hover:bg-red-600 text-white cursor-pointer"
                  : "bg-zinc-800 text-text-muted cursor-not-allowed opacity-50"
              }`}
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  )
}
