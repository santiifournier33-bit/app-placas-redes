"use client"

import { useState, useRef, useEffect } from "react"
import {
  Calendar, Flag, Bell, X, ChevronRight, Repeat,
  CheckSquare, MapPin, Phone, Users, PenLine, UserCircle,
  Coffee, Gift, Megaphone,
} from "lucide-react"
import { useTaskStore, TASK_TYPES, type TaskType } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { PortalDropdown } from "@/components/ui/PortalDropdown"
import { format, addDays, nextMonday } from "date-fns"
import { es } from "date-fns/locale"

const PRIORITY_OPTIONS = [
  { value: 1 as const, label: "Prioridad 1", color: "text-red-400",    flag: "bg-red-500"    },
  { value: 2 as const, label: "Prioridad 2", color: "text-orange-400", flag: "bg-orange-500" },
  { value: 3 as const, label: "Prioridad 3", color: "text-blue-400",   flag: "bg-blue-500"   },
  { value: 4 as const, label: "Sin prioridad", color: "text-text-muted", flag: "bg-zinc-600"   },
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
  /** Initial section the task lands in. User can change it via the section picker in the footer. */
  initialSectionId: string | null
  onClose: () => void
  preselectedContactId?: string | null
  hideContactPicker?: boolean
  /** Pre-fill the due date (yyyy-MM-dd), e.g. when adding from a day column in Próximo. */
  initialDate?: string | null
}

export function QuickAddTask({ initialSectionId, onClose, preselectedContactId = null, hideContactPicker = false, initialDate = null }: QuickAddTaskProps) {
  const { addTask, tasks, sections } = useTaskStore()
  const { contacts } = useContactStore()

  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(4)
  const [taskType, setTaskType] = useState<TaskType>("tarea")
  const [dueDate, setDueDate] = useState<string | null>(initialDate)
  // reminder preset offset in minutes BEFORE due. null = no reminder.
  const [reminderOffsetMin, setReminderOffsetMin] = useState<number | null>(null)
  const [contactId, setContactId] = useState<string | null>(preselectedContactId)
  const [contactSearch, setContactSearch] = useState("")
  const [recurrenceFreq, setRecurrenceFreq] = useState<string | null>(null)
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(initialSectionId)

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const [showType, setShowType] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [showRecurrence, setShowRecurrence] = useState(false)
  const [showSectionPicker, setShowSectionPicker] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dateBtnRef = useRef<HTMLButtonElement>(null)
  const prioBtnRef = useRef<HTMLButtonElement>(null)
  const typeBtnRef = useRef<HTMLButtonElement>(null)
  const reminderBtnRef = useRef<HTMLButtonElement>(null)
  const recurrenceBtnRef = useRef<HTMLButtonElement>(null)
  const contactBtnRef = useRef<HTMLButtonElement>(null)
  const sectionBtnRef = useRef<HTMLButtonElement>(null)
  const PANEL = "bg-surface-2 rounded-xl border border-border-default py-1 shadow-2xl"

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

  const computeReminderAt = (): string | null => {
    if (reminderOffsetMin === null || !dueDate) return null
    // Default to 09:00 local time if no due_time set
    const dueIso = `${dueDate}T09:00:00`
    const due = new Date(dueIso)
    const reminderMs = due.getTime() - reminderOffsetMin * 60 * 1000
    return new Date(reminderMs).toISOString()
  }

  const handleCreate = async () => {
    if (!title.trim()) return
    // Atómico: todos los campos (incl. contact_id) se insertan en una sola llamada.
    // Evita la race de "agarrar la última tarea del store" para luego actualizarla.
    await addTask(title.trim(), currentSectionId, {
      priority,
      task_type: taskType,
      due_date: dueDate ?? null,
      reminder_at: computeReminderAt(),
      contact_id: contactId,
      ...(recurrenceFreq ? { recurrence_freq: recurrenceFreq } : {}),
    })
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
    setShowSectionPicker(false)
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
    <div className="rounded-xl border border-border-default bg-surface-1 p-3 space-y-2.5">
      {/* Title input */}
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nombre de la tarea"
        className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
      />

      {/* Description placeholder line */}
      <input
        placeholder="Descripcion"
        className="w-full bg-transparent text-xs text-text-muted placeholder:text-zinc-700 outline-none"
      />

      {/* Action row */}
      <div className="flex items-center gap-1 flex-wrap">

        {/* Date */}
        <div className="relative">
          <button
            ref={dateBtnRef}
            onClick={() => { closeAllDropdowns(); setShowDatePicker(!showDatePicker) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-[11px] font-medium transition-colors cursor-pointer ${
              dueDate ? "bg-blue-500/15 text-blue-400 border border-blue-500/20" : "text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary"
            }`}
          >
            <Calendar size={13} />
            {dateLabel ?? "Fecha"}
          </button>
          <PortalDropdown anchorRef={dateBtnRef} open={showDatePicker} onClose={() => setShowDatePicker(false)} className={`${PANEL} min-w-[160px]`}>
            <>
              {[
                { label: "Hoy", value: todayStr, sub: format(today, "EEE", { locale: es }) },
                { label: "Mañana", value: tomorrowStr, sub: format(addDays(today, 1), "EEE", { locale: es }) },
                { label: "Próx semana", value: nextWeekStr, sub: format(nextMonday(today), "d MMM", { locale: es }) },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setDueDate(opt.value); setShowDatePicker(false) }}
                  className="flex items-center justify-between gap-3 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                >
                  <span>{opt.label}</span>
                  <span className="text-text-muted">{opt.sub}</span>
                </button>
              ))}
              <div className="border-t border-border-subtle mt-1 pt-1 px-3 pb-2">
                <input
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(e) => { setDueDate(e.target.value); setShowDatePicker(false) }}
                  className="w-full bg-transparent text-xs text-text-secondary outline-none [color-scheme:dark]"
                />
              </div>
            </>
          </PortalDropdown>
        </div>

        {/* Priority */}
        <div className="relative">
          <button
            ref={prioBtnRef}
            onClick={() => { closeAllDropdowns(); setShowPriority(!showPriority) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-[11px] font-medium transition-colors cursor-pointer ${
              priority < 4 ? "bg-surface-overlay-hover border border-border-subtle" : "text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary"
            }`}
          >
            <Flag size={13} className={PRIORITY_OPTIONS.find(p => p.value === priority)?.color} />
            {priority < 4 ? `P${priority}` : "Prioridad"}
          </button>
          <PortalDropdown anchorRef={prioBtnRef} open={showPriority} onClose={() => setShowPriority(false)} className={`${PANEL} min-w-[140px]`}>
            <>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPriority(opt.value); setShowPriority(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs cursor-pointer"
                >
                  <Flag size={13} className={opt.color} />
                  <span className={opt.color}>{opt.label}</span>
                  {priority === opt.value && <span className="ml-auto text-text-muted">✓</span>}
                </button>
              ))}
            </>
          </PortalDropdown>
        </div>

        {/* Task type */}
        <div className="relative">
          <button
            ref={typeBtnRef}
            onClick={() => { closeAllDropdowns(); setShowType(!showType) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-[11px] font-medium transition-colors cursor-pointer ${
              taskType !== "tarea" ? "bg-violet-500/15 text-violet-400 border border-violet-500/20" : "text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary"
            }`}
          >
            <span className={taskType !== "tarea" ? "text-violet-400" : "text-text-muted"}>
              {TYPE_ICONS[taskType]}
            </span>
            {taskType !== "tarea" ? TASK_TYPES[taskType].label : "Tipo"}
          </button>
          <PortalDropdown anchorRef={typeBtnRef} open={showType} onClose={() => setShowType(false)} className={`${PANEL} min-w-[140px]`}>
            <>
              {(Object.entries(TASK_TYPES) as [TaskType, typeof TASK_TYPES[TaskType]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => { setTaskType(key); setShowType(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                >
                  <span className="text-text-muted">{TYPE_ICONS[key]}</span>
                  <span>{val.label}</span>
                  {taskType === key && <span className="ml-auto text-text-muted">✓</span>}
                </button>
              ))}
            </>
          </PortalDropdown>
        </div>

        {/* Reminder */}
        <div className="relative">
          <button
            ref={reminderBtnRef}
            onClick={() => { if (dueDate) { closeAllDropdowns(); setShowReminder(!showReminder) } }}
            disabled={!dueDate}
            title={!dueDate ? "Primero asigná una fecha a la tarea" : undefined}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-[11px] font-medium transition-colors ${
              !dueDate
                ? "text-zinc-700 cursor-not-allowed opacity-50"
                : reminderOffsetMin !== null
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 cursor-pointer"
                  : "text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary cursor-pointer"
            }`}
          >
            <Bell size={13} />
            {reminderOffsetMin === null
              ? "Recordar"
              : reminderOffsetMin === 0
                ? "A la hora"
                : reminderOffsetMin === 10
                  ? "10 min antes"
                  : reminderOffsetMin === 60
                    ? "1 h antes"
                    : "1 día antes"}
          </button>
          <PortalDropdown anchorRef={reminderBtnRef} open={showReminder} onClose={() => setShowReminder(false)} className={`${PANEL} min-w-[160px]`}>
            <>
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
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                >
                  {opt.label}
                  {reminderOffsetMin === opt.value && <span className="ml-auto text-text-muted">✓</span>}
                </button>
              ))}
            </>
          </PortalDropdown>
        </div>

        {/* Recurrence */}
        <div className="relative">
          <button
            ref={recurrenceBtnRef}
            onClick={() => { closeAllDropdowns(); setShowRecurrence(!showRecurrence) }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-[11px] font-medium transition-colors cursor-pointer ${
              recurrenceFreq ? "bg-teal-500/15 text-teal-400 border border-teal-500/20" : "text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary"
            }`}
          >
            <Repeat size={13} />
            {recurrenceFreq ? { daily: 'Diario', weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' }[recurrenceFreq] ?? 'Recurrente' : 'Repetir'}
          </button>
          <PortalDropdown anchorRef={recurrenceBtnRef} open={showRecurrence} onClose={() => setShowRecurrence(false)} className={`${PANEL} min-w-[140px]`}>
            <>
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
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                >
                  {opt.label}
                  {recurrenceFreq === opt.value && <span className="ml-auto text-text-muted">✓</span>}
                </button>
              ))}
            </>
          </PortalDropdown>
        </div>

        {/* Contact */}
        {!hideContactPicker && (
        <div className="relative">
          <button
            ref={contactBtnRef}
            onClick={() => { closeAllDropdowns(); setShowContactPicker(!showContactPicker); setContactSearch("") }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-[11px] font-medium transition-colors cursor-pointer ${
              contactId ? "bg-green-500/15 text-green-400 border border-green-500/20" : "text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary"
            }`}
          >
            <UserCircle size={13} />
            {selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name}` : "Contacto"}
          </button>
          <PortalDropdown anchorRef={contactBtnRef} open={showContactPicker} onClose={() => setShowContactPicker(false)} className="bg-surface-2 rounded-xl border border-border-default shadow-2xl w-56">
            <>
              <div className="p-2 border-b border-border-subtle">
                <input
                  autoFocus
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar contacto..."
                  className="w-full bg-transparent text-xs text-text-secondary placeholder:text-text-muted outline-none"
                />
              </div>
              <div className="max-h-44 overflow-y-auto py-1">
                {contactId && (
                  <button
                    onClick={() => { setContactId(null); setShowContactPicker(false) }}
                    className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-muted cursor-pointer"
                  >
                    <UserCircle size={12} />
                    Sin contacto
                  </button>
                )}
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setContactId(c.id); setShowContactPicker(false) }}
                    className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs cursor-pointer"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs md:text-[10px] text-blue-400 font-bold shrink-0">
                      {(c.first_name || c.last_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-text-secondary truncate">{c.first_name} {c.last_name}</div>
                      <div className="text-text-muted truncate">{c.primary_phone}</div>
                    </div>
                    {contactId === c.id && <span className="text-text-muted ml-auto">✓</span>}
                  </button>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-xs text-text-muted text-center py-3">Sin resultados</p>
                )}
              </div>
            </>
          </PortalDropdown>
        </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
        <div className="relative">
          <button
            ref={sectionBtnRef}
            onClick={() => { closeAllDropdowns(); setShowSectionPicker(!showSectionPicker) }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs md:text-[11px] font-medium text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary cursor-pointer"
          >
            {(() => {
              const sec = sections.find(s => s.id === currentSectionId)
              return sec ? sec.name : "(Sin sección)"
            })()}
            <span className="text-text-muted">▾</span>
          </button>
          <PortalDropdown anchorRef={sectionBtnRef} open={showSectionPicker} onClose={() => setShowSectionPicker(false)} className={`${PANEL} min-w-[180px] max-h-60 overflow-y-auto`}>
            <>
              <button
                onClick={() => { setCurrentSectionId(null); setShowSectionPicker(false) }}
                className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
              >
                (Sin sección)
                {currentSectionId === null && <span className="ml-auto text-text-muted">✓</span>}
              </button>
              {sections
                .sort((a, b) => a.position - b.position)
                .map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setCurrentSectionId(s.id); setShowSectionPicker(false) }}
                    className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                  >
                    <span className="truncate">{s.name}</span>
                    {currentSectionId === s.id && <span className="ml-auto text-text-muted shrink-0">✓</span>}
                  </button>
                ))}
            </>
          </PortalDropdown>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:bg-surface-overlay-hover cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              title.trim()
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-zinc-800 text-text-muted cursor-not-allowed"
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
