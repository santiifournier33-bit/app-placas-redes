"use client"

import { useState, useEffect, useRef } from "react"
import { motion, useAnimationControls, useReducedMotion } from "framer-motion"
import {
  X, Flag, Trash2, Plus, AlignLeft, Bell, Calendar,
  ChevronDown, ChevronRight, ChevronUp,
  CheckSquare, MapPin, Phone, Users, PenLine, UserCircle,
  Coffee, Gift, Megaphone, MoreHorizontal, Link2, Pencil,
} from "lucide-react"
import type { Task, TaskType } from "@/lib/stores/taskStore"
import { useTaskStore, TASK_TYPES } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { PortalDropdown } from "@/components/ui/PortalDropdown"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/lib/hooks/useIsMobile"
import { TaskScheduler } from "@/components/productividad/TaskScheduler"
import { ReminderPresetPicker } from "@/components/productividad/ReminderPresetPicker"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: "P1", color: "text-red-400" },
  2: { label: "P2", color: "text-orange-400" },
  3: { label: "P3", color: "text-blue-400" },
  4: { label: "P4", color: "text-text-muted" },
}

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

interface TaskDetailProps {
  task: Task
  onClose: () => void
  onToggleTask?: (id: string) => void
  /** Ordered task ids of sibling tasks in the same view for prev/next navigation. */
  siblingIds?: string[]
  onNavigate?: (taskId: string) => void
}

export function TaskDetail({ task: initialTask, onClose, onToggleTask, siblingIds, onNavigate }: TaskDetailProps) {
  const { updateTask, deleteTask, addSubtask, toggleTask, tasks, sections } = useTaskStore()
  const doToggle = (id: string) => onToggleTask ? onToggleTask(id) : toggleTask(id)
  const reduceMotion = useReducedMotion()
  const checkboxControls = useAnimationControls()
  const { contacts } = useContactStore()
  const isMobile = useIsMobile()
  // Always read live from store so sidebar reflects updates immediately
  const task = tasks.find((t) => t.id === initialTask.id) ?? initialTask
  const subtasks = tasks.filter((t) => t.parent_id === task.id)
  const section = sections.find((s) => s.id === task.section_id)
  const linkedContact = contacts.find((c) => c.id === task.contact_id) ?? null

  const [newSubtask, setNewSubtask] = useState("")
  const [showPriority, setShowPriority] = useState(false)
  const [showType, setShowType] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [contactSearch, setContactSearch] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [showDesc, setShowDesc] = useState(!!task.description)
  const [subtasksOpen, setSubtasksOpen] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  // Mobile bottom-sheet height: false = half (peek), true = near-full.
  const [expanded, setExpanded] = useState(false)
  const [schedOpen, setSchedOpen] = useState(false)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const reminderBtnRef = useRef<HTMLButtonElement>(null)
  const prioBtnRef = useRef<HTMLButtonElement>(null)
  const typeBtnRef = useRef<HTMLButtonElement>(null)
  const contactBtnRef = useRef<HTMLButtonElement>(null)

  const effectiveType = (task.task_type ?? "tarea") as TaskType

  const handleSubtaskAdd = () => {
    if (!newSubtask.trim()) return
    addSubtask(task.id, newSubtask.trim())
    setNewSubtask("")
  }

  // Prev / next navigation
  const currentIndex = siblingIds?.indexOf(task.id) ?? -1
  const prevId = currentIndex > 0 ? siblingIds![currentIndex - 1] : null
  const nextId = currentIndex >= 0 && siblingIds && currentIndex < siblingIds.length - 1
    ? siblingIds[currentIndex + 1]
    : null

  const goPrev = () => { if (prevId && onNavigate) onNavigate(prevId) }
  const goNext = () => { if (nextId && onNavigate) onNavigate(nextId) }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowUp" && !editingTitle && !showDesc) { e.preventDefault(); goPrev() }
      else if (e.key === "ArrowDown" && !editingTitle && !showDesc) { e.preventDefault(); goNext() }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [prevId, nextId, editingTitle, showDesc])

  // Reminder presets (mirrors QuickAddTask)
  const reminderOffsetMin: number | null = (() => {
    if (!task.reminder_at || !task.due_date) return null
    const due = new Date(`${task.due_date}T${task.due_time ?? "09:00"}:00`).getTime()
    const r = new Date(task.reminder_at).getTime()
    return Math.round((due - r) / 60000)
  })()

  const setReminderPreset = (offsetMin: number | null) => {
    if (offsetMin === null || !task.due_date) {
      updateTask(task.id, { reminder_at: null, reminder_sent_at: null })
      return
    }
    const due = new Date(`${task.due_date}T${task.due_time ?? "09:00"}:00`).getTime()
    const reminderAt = new Date(due - offsetMin * 60 * 1000).toISOString()
    updateTask(task.id, { reminder_at: reminderAt, reminder_sent_at: null })
  }

  const reminderLabel = (() => {
    if (reminderOffsetMin === null) return "Sin recordatorio"
    if (reminderOffsetMin === 0) return "A la hora"
    if (reminderOffsetMin === 10) return "10 min antes"
    if (reminderOffsetMin === 60) return "1 h antes"
    if (reminderOffsetMin === 1440) return "1 día antes"
    return "Personalizado"
  })()

  const handleCopyLink = () => {
    if (typeof window === "undefined") return
    navigator.clipboard.writeText(`${window.location.origin}/productividad/tareas?id=${task.id}`)
    setShowMenu(false)
  }

  // Radix Sheet/Dialog need an internal open state so that exit animations
  // can play before the parent unmounts the component. Parent passes
  // `task=null` to unmount; we mirror that with a brief delay so the slide-
  // out/fade-out is visible. onOpenChange fires for Escape, click-outside,
  // and the built-in close button — all forward to onClose.
  const [open, setOpen] = useState(true)
  const handleOpenChange = (next: boolean) => {
    if (next) return
    setOpen(false)
    // Match Sheet's 300ms exit duration before signalling the parent
    setTimeout(onClose, 280)
  }

  if (isMobile) {
    return (
      <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          showClose={false}
          className="rounded-t-2xl p-0 bg-surface-1 overflow-hidden flex flex-col transition-[height] duration-300 ease-out"
          style={{ height: expanded ? "92dvh" : "62dvh" }}
        >
          <SheetTitle className="sr-only">{task.title || "Detalle de tarea"}</SheetTitle>
          {/* Draggable grabber: drag up → expand, drag down → collapse, or close
              when already collapsed. Tap toggles too. Mirrors the native sheet. */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.5}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y < -50) setExpanded(true)
              else if (info.offset.y > 50) { expanded ? setExpanded(false) : handleOpenChange(false) }
            }}
            onClick={() => setExpanded((e) => !e)}
            className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="w-10 h-1 rounded-full bg-border-strong/40" />
          </motion.div>
          <div className="flex-1 overflow-y-auto overscroll-contain">
          <MobileHeader task={task} onClose={() => handleOpenChange(false)} onDelete={() => { deleteTask(task.id); handleOpenChange(false) }} />
          <TaskBody
            task={task} subtasks={subtasks} section={section}
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            showDesc={showDesc} setShowDesc={setShowDesc}
            subtasksOpen={subtasksOpen} setSubtasksOpen={setSubtasksOpen}
            newSubtask={newSubtask} setNewSubtask={setNewSubtask}
            showPriority={showPriority} setShowPriority={setShowPriority}
            showType={showType} setShowType={setShowType}
            effectiveType={effectiveType}
            onOpenScheduler={() => setSchedOpen(true)}
            updateTask={updateTask} toggleTask={doToggle} handleSubtaskAdd={handleSubtaskAdd}
          />
          </div>
        </SheetContent>
      </Sheet>
      <TaskScheduler taskId={task.id} currentDate={task.due_date} currentTime={task.due_time} open={schedOpen} onOpenChange={setSchedOpen} />
      </>
    )
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[760px] max-h-[90vh] p-0 sm:rounded-2xl bg-surface-1 flex-col overflow-hidden border-border-default shadow-2xl" showClose={false}>
          <DialogTitle className="sr-only">{task.title || "Detalle de tarea"}</DialogTitle>
          {/* Header bar */}
          <div className="flex items-center justify-between px-5 h-12 border-b border-border-subtle shrink-0">
            <div className="flex items-center gap-1 text-xs text-text-muted">
              <span>Bandeja de entrada</span>
              {section && (
                <>
                  <span>/</span>
                  <span>{section.name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                disabled={!prevId}
                title="Tarea anterior"
                className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={goNext}
                disabled={!nextId}
                title="Tarea siguiente"
                className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer text-text-muted hover:text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <ChevronDown size={16} />
              </button>
              <div className="w-px h-4 bg-surface-overlay-hover mx-1" />
              <button
                ref={menuBtnRef}
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer text-text-muted hover:text-text-secondary"
              >
                <MoreHorizontal size={16} />
              </button>
              <PortalDropdown
                anchorRef={menuBtnRef}
                open={showMenu}
                onClose={() => setShowMenu(false)}
                placement="bottom-end"
                className="bg-surface-2 border border-border-default rounded-xl shadow-2xl py-1 min-w-[200px]"
              >
                <button
                  onClick={() => { setEditingTitle(true); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                >
                  <Pencil size={13} className="text-text-muted" /> Editar tarea
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                >
                  <Link2 size={13} className="text-text-muted" /> Copiar enlace a la tarea
                </button>
                <div className="border-t border-border-subtle my-1" />
                <button
                  onClick={() => { deleteTask(task.id); setShowMenu(false); onClose() }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-red-500/10 text-xs text-red-400 cursor-pointer"
                >
                  <Trash2 size={13} /> Eliminar tarea
                </button>
              </PortalDropdown>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer text-text-muted hover:text-text-secondary"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: main content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Title */}
              <div className="flex items-start gap-3 mb-4">
                <motion.button
                  animate={checkboxControls}
                  onClick={() => {
                    if (!task.completed && !reduceMotion) checkboxControls.start({ scale: [1, 1.25, 1] }, { duration: 0.22, ease: "easeOut" })
                    doToggle(task.id)
                  }}
                  aria-label={task.completed ? "Marcar como pendiente" : "Completar tarea"}
                  className={`mt-1.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    task.completed ? "bg-blue-500 border-transparent" : "border-zinc-600"
                  }`}
                >
                  {task.completed && (
                    <motion.svg
                      width="10" height="8" viewBox="0 0 10 8" fill="none"
                      initial={reduceMotion ? false : { scale: 0.3 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 520, damping: 18 }}
                    >
                      <motion.path
                        d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        initial={reduceMotion ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut", delay: reduceMotion ? 0 : 0.04 }}
                      />
                    </motion.svg>
                  )}
                </motion.button>
                {editingTitle ? (
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => {
                      if (title.trim()) updateTask(task.id, { title: title.trim() })
                      setEditingTitle(false)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                    }}
                    className="flex-1 bg-transparent text-xl font-semibold text-text-primary outline-none"
                  />
                ) : (
                  <h2
                    onClick={() => setEditingTitle(true)}
                    className={`flex-1 text-xl font-semibold cursor-text leading-snug ${
                      task.completed ? "line-through text-text-muted" : "text-text-primary"
                    }`}
                  >
                    {task.title}
                  </h2>
                )}
              </div>

              {/* Description */}
              <div className="ml-8 mb-5">
                {showDesc ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => updateTask(task.id, { description })}
                    placeholder="Descripción"
                    rows={3}
                    className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted outline-none resize-none"
                  />
                ) : (
                  <button
                    onClick={() => setShowDesc(true)}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary cursor-pointer"
                  >
                    <AlignLeft size={14} />
                    Descripción
                  </button>
                )}
              </div>

              {/* Subtasks */}
              <div className="ml-8 border-t border-border-subtle pt-4">
                <button
                  onClick={() => setSubtasksOpen(!subtasksOpen)}
                  className="flex items-center gap-2 text-sm font-semibold text-text-secondary mb-3 cursor-pointer hover:text-text-primary"
                >
                  {subtasksOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  Subtareas
                  {subtasks.length > 0 && (
                    <span className="text-xs font-normal text-text-muted">
                      {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                    </span>
                  )}
                </button>

                {subtasksOpen && (
                  <div className="space-y-1">
                    {subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-3 py-1.5 group">
                        <button
                          onClick={() => doToggle(sub.id)}
                          className={`w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center ${
                            sub.completed ? "bg-blue-500 border-transparent" : "border-zinc-600"
                          }`}
                        >
                          {sub.completed && (
                            <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                              <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-sm flex-1 ${sub.completed ? "line-through text-text-muted" : "text-text-secondary"}`}>
                          {sub.title}
                        </span>
                      </div>
                    ))}

                    {/* Add subtask */}
                    <div className="flex items-center gap-3 py-1">
                      <Plus size={14} className="text-text-muted shrink-0" />
                      <input
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSubtaskAdd() }}
                        placeholder="Añadir subtarea"
                        className="flex-1 bg-transparent text-sm text-text-secondary placeholder:text-zinc-700 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Comment field (bottom) */}
              <div className="ml-8 mt-6 flex items-center gap-3 border border-border-subtle rounded-xl px-3 py-2.5 bg-surface-overlay">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  S
                </div>
                <input
                  placeholder="Comentar"
                  className="flex-1 bg-transparent text-sm text-text-secondary placeholder:text-text-muted outline-none"
                />
              </div>
            </div>

            {/* Right: metadata sidebar */}
            <div className="w-56 border-l border-border-subtle px-4 py-5 space-y-4 overflow-y-auto shrink-0">
              {/* Proyecto */}
              <MetaRow label="Proyecto">
                <span className="text-xs text-text-secondary">
                  {section ? section.name : "Bandeja de entrada"}
                </span>
              </MetaRow>

              {/* Fecha */}
              <MetaRow label="Fecha">
                <button
                  onClick={() => setSchedOpen(true)}
                  className="text-xs text-text-secondary hover:text-text-primary cursor-pointer w-full text-left"
                >
                  {task.due_date ? format(new Date(task.due_date.slice(0, 10) + "T12:00:00"), "d MMM yyyy", { locale: es }) : "Sin fecha"}
                </button>
              </MetaRow>

              {/* Prioridad */}
              <MetaRow label="Prioridad">
                <div className="relative">
                  <button
                    ref={prioBtnRef}
                    onClick={() => { setShowPriority(!showPriority); setShowType(false) }}
                    className={`flex items-center gap-1.5 text-xs cursor-pointer ${priorityLabels[task.priority ?? 4].color}`}
                  >
                    <Flag size={13} />
                    {priorityLabels[task.priority ?? 4].label}
                  </button>
                  <PortalDropdown anchorRef={prioBtnRef} open={showPriority} onClose={() => setShowPriority(false)} placement="bottom-end" className="bg-surface-2 rounded-xl border border-border-default py-1 shadow-2xl min-w-[140px]">
                    <>
                      {([1, 2, 3, 4] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => { updateTask(task.id, { priority: p }); setShowPriority(false) }}
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs cursor-pointer"
                        >
                          <Flag size={12} className={priorityLabels[p].color} />
                          <span className={priorityLabels[p].color}>Prioridad {p}</span>
                        </button>
                      ))}
                    </>
                  </PortalDropdown>
                </div>
              </MetaRow>

              {/* Tipo */}
              <MetaRow label="Tipo">
                <div className="relative">
                  <button
                    ref={typeBtnRef}
                    onClick={() => { setShowType(!showType); setShowPriority(false) }}
                    className={`flex items-center gap-1.5 text-xs cursor-pointer ${
                      effectiveType !== "tarea" ? "text-violet-400" : "text-text-muted"
                    }`}
                  >
                    {TYPE_ICONS[effectiveType]}
                    {TASK_TYPES[effectiveType]?.label ?? "Tarea"}
                  </button>
                  <PortalDropdown anchorRef={typeBtnRef} open={showType} onClose={() => setShowType(false)} placement="bottom-end" className="bg-surface-2 rounded-xl border border-border-default py-1 shadow-2xl min-w-[150px]">
                    <>
                      {(Object.entries(TASK_TYPES) as [TaskType, typeof TASK_TYPES[TaskType]][]).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => { updateTask(task.id, { task_type: key }); setShowType(false) }}
                          className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                        >
                          <span className="text-text-muted">{TYPE_ICONS[key]}</span>
                          {val.label}
                          {effectiveType === key && <span className="ml-auto text-text-muted">✓</span>}
                        </button>
                      ))}
                    </>
                  </PortalDropdown>
                </div>
              </MetaRow>

              {/* Recordatorio */}
              <MetaRow label="Recordatorio">
                <button
                  ref={reminderBtnRef}
                  onClick={() => {
                    if (!task.due_date) return
                    setShowReminder(!showReminder)
                  }}
                  disabled={!task.due_date}
                  title={!task.due_date ? "Asigná una fecha primero" : undefined}
                  className={`flex items-center gap-1.5 text-xs cursor-pointer w-full text-left ${
                    !task.due_date
                      ? "text-zinc-700 cursor-not-allowed"
                      : reminderOffsetMin !== null
                        ? "text-amber-400"
                        : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <Bell size={13} className="shrink-0" />
                  {reminderLabel}
                </button>
                <PortalDropdown
                  anchorRef={reminderBtnRef}
                  open={showReminder}
                  onClose={() => setShowReminder(false)}
                  className="bg-surface-2 border border-border-default rounded-xl shadow-2xl py-1 min-w-[160px]"
                >
                  {[
                    { value: null, label: "Sin recordatorio" },
                    { value: 0, label: "A la hora" },
                    { value: 10, label: "10 min antes" },
                    { value: 60, label: "1 h antes" },
                    { value: 1440, label: "1 día antes" },
                  ].map((opt) => (
                    <button
                      key={opt.value ?? "none"}
                      onClick={() => { setReminderPreset(opt.value); setShowReminder(false) }}
                      className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                    >
                      {opt.label}
                      {reminderOffsetMin === opt.value && <span className="ml-auto text-text-muted">✓</span>}
                    </button>
                  ))}
                </PortalDropdown>
              </MetaRow>

              {/* Contacto */}
              <MetaRow label="Contacto">
                <div className="relative">
                  <button
                    ref={contactBtnRef}
                    onClick={() => { setShowContactPicker(!showContactPicker); setContactSearch("") }}
                    className="flex items-center gap-1.5 text-xs cursor-pointer text-text-secondary hover:text-text-primary w-full text-left"
                  >
                    <UserCircle size={13} className="shrink-0 text-text-muted" />
                    <span className="truncate">
                      {linkedContact
                        ? `${linkedContact.first_name} ${linkedContact.last_name}`
                        : "Sin contacto"}
                    </span>
                  </button>
                  <PortalDropdown anchorRef={contactBtnRef} open={showContactPicker} onClose={() => setShowContactPicker(false)} placement="bottom-end" className="bg-surface-2 rounded-xl border border-border-default shadow-2xl w-56">
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
                      <div className="max-h-48 overflow-y-auto py-1">
                        {task.contact_id && (
                          <button
                            onClick={() => { updateTask(task.id, { contact_id: null }); setShowContactPicker(false) }}
                            className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-muted cursor-pointer"
                          >
                            <UserCircle size={12} />
                            Sin contacto
                          </button>
                        )}
                        {contacts
                          .filter((c) => {
                            const q = contactSearch.toLowerCase()
                            return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.primary_phone ?? '').includes(q)
                          })
                          .slice(0, 20)
                          .map((c) => (
                            <button
                              key={c.id}
                              onClick={() => { updateTask(task.id, { contact_id: c.id }); setShowContactPicker(false) }}
                              className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs cursor-pointer"
                            >
                              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-bold shrink-0">
                                {(c.first_name || c.last_name || "?")[0]}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="text-text-secondary truncate">{c.first_name} {c.last_name}</div>
                                <div className="text-text-muted truncate">{c.primary_phone}</div>
                              </div>
                              {task.contact_id === c.id && <span className="text-text-muted ml-auto">✓</span>}
                            </button>
                          ))}
                        {contacts.filter((c) => {
                          const q = contactSearch.toLowerCase()
                          return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || (c.primary_phone ?? '').includes(q)
                        }).length === 0 && (
                          <p className="text-xs text-text-muted text-center py-3">Sin resultados</p>
                        )}
                      </div>
                    </>
                  </PortalDropdown>
                </div>
              </MetaRow>

              {/* Delete */}
              <div className="pt-4 border-t border-border-subtle">
                <button
                  onClick={() => { deleteTask(task.id); onClose() }}
                  className="flex items-center gap-2 text-xs text-text-muted hover:text-red-400 cursor-pointer transition-colors"
                >
                  <Trash2 size={13} />
                  Eliminar tarea
                </button>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
    <TaskScheduler taskId={task.id} currentDate={task.due_date} currentTime={task.due_time} open={schedOpen} onOpenChange={setSchedOpen} />
    </>
  )
}

/* ─── Helpers ─── */

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}

function MobileHeader({ task, onClose, onDelete }: { task: Task; onClose: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border-subtle">
      <button onClick={onClose} className="p-1.5 hover:bg-surface-overlay-hover rounded-lg cursor-pointer">
        <X size={20} className="text-text-secondary" />
      </button>
      <button onClick={onDelete} className="p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer">
        <Trash2 size={18} className="text-text-muted hover:text-red-400" />
      </button>
    </div>
  )
}

function TaskBody({
  task, subtasks, section,
  title, setTitle, description, setDescription,
  showDesc, setShowDesc,
  subtasksOpen, setSubtasksOpen,
  newSubtask, setNewSubtask,
  showPriority, setShowPriority,
  showType, setShowType,
  effectiveType,
  onOpenScheduler,
  updateTask, toggleTask, handleSubtaskAdd,
}: {
  task: Task
  subtasks: Task[]
  section: { id: string; name: string; position: number } | undefined
  onOpenScheduler: () => void
  title: string
  setTitle: (v: string) => void
  description: string
  setDescription: (v: string) => void
  showDesc: boolean
  setShowDesc: (v: boolean) => void
  subtasksOpen: boolean
  setSubtasksOpen: (v: boolean) => void
  newSubtask: string
  setNewSubtask: (v: string) => void
  showPriority: boolean
  setShowPriority: (v: boolean) => void
  showType: boolean
  setShowType: (v: boolean) => void
  effectiveType: TaskType
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  toggleTask: (id: string) => void
  handleSubtaskAdd: () => void
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleTask(task.id)}
          className={`mt-1 w-[22px] h-[22px] rounded-full border-[1.5px] shrink-0 task-checkbox flex items-center justify-center ${
            task.completed ? "bg-blue-500 border-transparent" : "border-zinc-600"
          }`}
        >
          {task.completed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <h2 className={`flex-1 text-lg font-semibold ${task.completed ? "line-through text-text-muted" : "text-text-primary"}`}>
          {task.title}
        </h2>
      </div>

      {/* Date — opens the chip scheduler (1-tap reschedule) */}
      <button
        onClick={onOpenScheduler}
        className="flex items-center gap-2 w-full text-left active:scale-[0.99] transition-transform"
      >
        <Calendar size={15} className={task.due_date ? "text-blue-400" : "text-text-muted"} />
        <span className={`text-sm ${task.due_date ? "text-text-secondary" : "text-text-muted"}`}>
          {task.due_date ? format(new Date(task.due_date.slice(0, 10) + "T12:00:00"), "EEE d MMM yyyy", { locale: es }) : "Agregar fecha"}
        </span>
      </button>

      {/* Priority */}
      <div className="relative flex items-center gap-2">
        <Flag size={15} className={priorityLabels[task.priority ?? 4].color} />
        <button
          onClick={() => { setShowPriority(!showPriority); setShowType(false) }}
          className={`text-sm cursor-pointer ${priorityLabels[task.priority ?? 4].color}`}
        >
          {priorityLabels[task.priority ?? 4].label}
        </button>
        {showPriority && (
          <div className="absolute left-0 top-8 bg-surface-2 rounded-xl border border-border-default py-1 z-10 shadow-xl">
            {([1, 2, 3, 4] as const).map((p) => (
              <button
                key={p}
                onClick={() => { updateTask(task.id, { priority: p }); setShowPriority(false) }}
                className="flex items-center gap-2 px-4 py-2 w-full hover:bg-surface-overlay text-sm cursor-pointer"
              >
                <Flag size={14} className={priorityLabels[p].color} />
                <span className={priorityLabels[p].color}>Prioridad {p}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reminder (unified on reminder_at) */}
      <ReminderPresetPicker task={task} updateTask={updateTask} />

      {/* Description */}
      {showDesc ? (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => updateTask(task.id, { description })}
          placeholder="Descripcion..."
          rows={2}
          className="w-full bg-surface-overlay rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none resize-none border border-border-subtle focus:border-blue-500/30"
        />
      ) : (
        <button
          onClick={() => setShowDesc(true)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary cursor-pointer"
        >
          <AlignLeft size={15} />
          Descripcion
        </button>
      )}

      {/* Subtasks */}
      <div className="space-y-1 pt-1 border-t border-border-subtle">
        <button
          onClick={() => setSubtasksOpen(!subtasksOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-text-secondary mb-2 cursor-pointer"
        >
          {subtasksOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Subtareas
          {subtasks.length > 0 && (
            <span className="text-xs font-normal text-text-muted">
              {subtasks.filter((s) => s.completed).length}/{subtasks.length}
            </span>
          )}
        </button>

        {subtasksOpen && (
          <>
            {subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center gap-3 py-1.5">
                <button
                  onClick={() => toggleTask(sub.id)}
                  className={`w-4 h-4 rounded-full border-[1.5px] shrink-0 flex items-center justify-center ${
                    sub.completed ? "bg-blue-500 border-transparent" : "border-zinc-600"
                  }`}
                >
                  {sub.completed && (
                    <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                      <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm ${sub.completed ? "line-through text-text-muted" : "text-text-secondary"}`}>
                  {sub.title}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <Plus size={14} className="text-text-muted shrink-0" />
              <input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubtaskAdd() }}
                placeholder="Anadir subtarea"
                className="flex-1 bg-transparent text-sm text-text-secondary placeholder:text-zinc-700 outline-none"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
