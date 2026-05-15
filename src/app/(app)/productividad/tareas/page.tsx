"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Inbox, CalendarDays, CalendarRange, Plus, FolderPlus,
  LayoutDashboard, List, Columns, CheckSquare2, X,
} from "lucide-react"
import { useTaskStore, TASK_TYPES, type TaskType } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { TaskItem } from "@/components/productividad/TaskItem"
import { TaskDetail } from "@/components/productividad/TaskDetail"
import { SectionHeader } from "@/components/productividad/SectionHeader"
import { BoardView } from "@/components/productividad/BoardView"
import {
  isToday, isPast, isFuture, format, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isSameMonth
} from "date-fns"
import { es } from "date-fns/locale"
import type { Task } from "@/lib/stores/taskStore"
import {
  CheckSquare, MapPin, Phone, Users, PenLine, ChevronLeft, ChevronRight,
} from "lucide-react"

type View = "bandeja" | "hoy" | "proximo"
type DisplayMode = "lista" | "panel"

const viewConfig = [
  { key: "bandeja" as const, label: "Bandeja", icon: Inbox },
  { key: "hoy" as const, label: "Hoy", icon: CalendarDays },
  { key: "proximo" as const, label: "Proximo", icon: CalendarRange },
]

export default function TareasPage() {
  const [view, setView] = useState<View>("bandeja")
  const [displayMode, setDisplayMode] = useState<DisplayMode>("panel")
  const [showCompleted, setShowCompleted] = useState(true)
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newTaskText, setNewTaskText] = useState("")
  const [newTaskSection, setNewTaskSection] = useState<string | null>(null)
  const [newSectionName, setNewSectionName] = useState("")
  const [showNewSection, setShowNewSection] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)
  const [toast, setToast] = useState<{ count: number; undoIds: string[] } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const formatMenuRef = useRef<HTMLDivElement>(null)

  const { tasks, sections, addTask, addSection, toggleTask, init: initTasks } = useTaskStore()
  const { init: initContacts } = useContactStore()

  useEffect(() => {
    setMounted(true)
    initTasks()
    initContacts()
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(e.target as Node)) {
        setShowFormatMenu(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleToggleTask = useCallback((id: string) => {
    const currentTasks = useTaskStore.getState().tasks
    const task = currentTasks.find((t) => t.id === id)
    if (!task) return

    const completing = !task.completed

    if (completing) {
      const subtasks = currentTasks.filter((t) => t.parent_id === id && !t.completed)
      const totalCompleted = 1 + subtasks.length
      const idsToUndo = [id, ...subtasks.map((t) => t.id)]

      toggleTask(id)

      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      setToast((prev) => ({
        count: (prev?.count ?? 0) + totalCompleted,
        undoIds: [...(prev?.undoIds ?? []), ...idsToUndo],
      }))
      toastTimerRef.current = setTimeout(() => setToast(null), 4000)
    } else {
      toggleTask(id)
    }
  }, [toggleTask])

  const handleUndo = useCallback(() => {
    if (!toast) return
    toast.undoIds.forEach((id) => {
      const t = useTaskStore.getState().tasks.find((t) => t.id === id)
      if (t?.completed) toggleTask(id)
    })
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(null)
  }, [toast, toggleTask])

  if (!mounted) {
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-white/[0.04] rounded-xl" /></div>
  }

  const rootTasks = tasks.filter((t) => !t.parent_id)
  const getSubtasks = (id: string) => tasks.filter((t) => t.parent_id === id)

  const toggleCollapse = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddTask = (sectionId: string | null = null) => {
    if (!newTaskText.trim()) return
    addTask(newTaskText.trim(), sectionId)
    setNewTaskText("")
    setNewTaskSection(null)
  }

  const handleAddSection = () => {
    if (!newSectionName.trim()) return
    addSection(newSectionName.trim())
    setNewSectionName("")
    setShowNewSection(false)
  }

  const refreshSelected = () => {
    if (selectedTask) {
      const fresh = tasks.find((t) => t.id === selectedTask.id)
      if (fresh) setSelectedTask(fresh)
      else setSelectedTask(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header: view toggles + format menu */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] shrink-0">
        <div className="flex gap-1">
          {viewConfig.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                view === key
                  ? "text-shell-text bg-white/[0.08]"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>

        {/* Format menu */}
        <div className="relative" ref={formatMenuRef}>
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showFormatMenu ? "bg-white/[0.08] text-zinc-300" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
            }`}
          >
            <LayoutDashboard size={15} />
            Formato
          </button>
          {showFormatMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-2 z-30 shadow-xl w-52">
              {/* Vista section */}
              <div className="px-3 pb-1">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">Vista</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDisplayMode("lista")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center cursor-pointer transition-all ${
                      displayMode === "lista" ? "bg-white/[0.1] text-shell-text" : "text-zinc-500 hover:bg-white/[0.04]"
                    }`}
                  >
                    <List size={13} /> Lista
                  </button>
                  <button
                    onClick={() => setDisplayMode("panel")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center cursor-pointer transition-all ${
                      displayMode === "panel" ? "bg-white/[0.1] text-shell-text" : "text-zinc-500 hover:bg-white/[0.04]"
                    }`}
                  >
                    <Columns size={13} /> Panel
                  </button>
                </div>
              </div>

              <div className="border-t border-white/[0.06] mt-2 pt-2 px-3">
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1.5">Filtro</p>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center justify-between w-full cursor-pointer py-1"
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <CheckSquare2 size={13} className="text-zinc-500" />
                    Tareas completadas
                  </div>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${showCompleted ? "bg-blue-500" : "bg-zinc-700"}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showCompleted ? "left-4.5" : "left-0.5"}`} style={{ left: showCompleted ? "18px" : "2px" }} />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content + inline detail split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task list pane */}
        <div className="flex-1 overflow-y-auto">
          {view === "bandeja" && displayMode === "panel" && (
            <BoardView
              tasks={rootTasks}
              sections={sections}
              showCompleted={showCompleted}
              onSelectTask={setSelectedTask}
              onToggleTask={handleToggleTask}
            />
          )}

          {view === "bandeja" && displayMode === "lista" && (
            <BandejaView
              tasks={rootTasks}
              sections={sections}
              getSubtasks={getSubtasks}
              collapsedSections={collapsedSections}
              toggleCollapse={toggleCollapse}
              onSelectTask={setSelectedTask}
              showCompleted={showCompleted}
              newTaskText={newTaskText}
              newTaskSection={newTaskSection}
              setNewTaskText={setNewTaskText}
              setNewTaskSection={setNewTaskSection}
              handleAddTask={handleAddTask}
              showNewSection={showNewSection}
              setShowNewSection={setShowNewSection}
              newSectionName={newSectionName}
              setNewSectionName={setNewSectionName}
              handleAddSection={handleAddSection}
              onToggleTask={handleToggleTask}
            />
          )}

          {view === "hoy" && (
            <HoyView
              tasks={rootTasks}
              getSubtasks={getSubtasks}
              onSelectTask={setSelectedTask}
              onToggleTask={handleToggleTask}
            />
          )}

          {view === "proximo" && (
            <ProximoView
              tasks={rootTasks}
              onSelectTask={setSelectedTask}
            />
          )}
        </div>

        {/* Inline detail panel — desktop only, rendered alongside list */}
        {selectedTask && (
          <TaskDetail
            key={selectedTask.id}
            task={selectedTask}
            onClose={() => {
              refreshSelected()
              setSelectedTask(null)
            }}
            onToggleTask={handleToggleTask}
            inline={true}
          />
        )}
      </div>

      {/* Completion toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#1e1e2c] border border-white/[0.1] rounded-2xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 whitespace-nowrap">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4 8L11 1" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm text-zinc-300">
            {toast.count === 1 ? "1 tarea completada" : `${toast.count} tareas completadas`}
          </span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-red-400 hover:text-red-300 cursor-pointer ml-1"
          >
            Deshacer
          </button>
          <button
            onClick={() => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); setToast(null) }}
            className="text-zinc-600 hover:text-zinc-400 cursor-pointer ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── BANDEJA VIEW (lista) ─── */

function BandejaView({
  tasks, sections, getSubtasks, collapsedSections, toggleCollapse,
  onSelectTask, showCompleted, newTaskText, newTaskSection, setNewTaskText, setNewTaskSection,
  handleAddTask, showNewSection, setShowNewSection, newSectionName, setNewSectionName, handleAddSection,
  onToggleTask,
}: {
  tasks: Task[]
  sections: { id: string; name: string; position: number }[]
  getSubtasks: (id: string) => Task[]
  collapsedSections: Set<string>
  toggleCollapse: (id: string) => void
  onSelectTask: (t: Task) => void
  showCompleted: boolean
  newTaskText: string
  newTaskSection: string | null
  setNewTaskText: (v: string) => void
  setNewTaskSection: (v: string | null) => void
  handleAddTask: (sectionId?: string | null) => void
  showNewSection: boolean
  setShowNewSection: (v: boolean) => void
  newSectionName: string
  setNewSectionName: (v: string) => void
  handleAddSection: () => void
  onToggleTask?: (id: string) => void
}) {
  const unsectioned = tasks.filter((t) => !t.section_id && !t.completed)
  const completed = showCompleted ? tasks.filter((t) => t.completed) : []

  return (
    <div>
      {/* Unsectioned tasks */}
      {unsectioned.length > 0 && (
        <div>
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <span className="text-sm font-bold text-shell-text">(Sin seccion)</span>
            <span className="text-xs text-zinc-600 font-medium ml-2">{unsectioned.length}</span>
          </div>
          {unsectioned.map((task) => {
            const subs = getSubtasks(task.id)
            return (
              <TaskItem
                key={task.id}
                task={task}
                subtaskCount={subs.length}
                subtaskDone={subs.filter((s) => s.completed).length}
                onTap={() => onSelectTask(task)}
                onToggle={onToggleTask}
              />
            )
          })}
        </div>
      )}

      {/* Sectioned tasks */}
      {sections.map((sec) => {
        const sectionTasks = tasks.filter((t) => t.section_id === sec.id && !t.completed)
        const collapsed = collapsedSections.has(sec.id)
        return (
          <div key={sec.id}>
            <SectionHeader
              id={sec.id}
              name={sec.name}
              count={sectionTasks.length}
              collapsed={collapsed}
              onToggle={() => toggleCollapse(sec.id)}
            />
            {!collapsed &&
              sectionTasks.map((task) => {
                const subs = getSubtasks(task.id)
                return (
                  <TaskItem
                    key={task.id}
                    task={task}
                    subtaskCount={subs.length}
                    subtaskDone={subs.filter((s) => s.completed).length}
                    onTap={() => onSelectTask(task)}
                    onToggle={onToggleTask}
                  />
                )
              })}
            {!collapsed && newTaskSection === sec.id && (
              <div className="px-4 py-2 border-b border-white/[0.04]">
                <input
                  autoFocus
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTask(sec.id)
                    if (e.key === "Escape") setNewTaskSection(null)
                  }}
                  onBlur={() => { handleAddTask(sec.id); setNewTaskSection(null) }}
                  placeholder="Nombre de la tarea"
                  className="w-full bg-transparent text-sm text-shell-text placeholder:text-zinc-700 outline-none"
                />
              </div>
            )}
            {!collapsed && newTaskSection !== sec.id && (
              <button
                onClick={() => { setNewTaskSection(sec.id); setNewTaskText("") }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-600 hover:text-zinc-400 w-full border-b border-white/[0.04] cursor-pointer"
              >
                <Plus size={14} />
                Anadir tarea
              </button>
            )}
          </div>
        )
      })}

      {/* Add task (no section) */}
      {newTaskSection === "__none__" ? (
        <div className="px-4 py-2 border-b border-white/[0.04]">
          <input
            autoFocus
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTask(null)
              if (e.key === "Escape") setNewTaskSection(null)
            }}
            onBlur={() => { handleAddTask(null); setNewTaskSection(null) }}
            placeholder="Nombre de la tarea"
            className="w-full bg-transparent text-sm text-shell-text placeholder:text-zinc-700 outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => { setNewTaskSection("__none__"); setNewTaskText("") }}
          className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-300 w-full cursor-pointer"
        >
          <Plus size={16} />
          Anadir tarea
        </button>
      )}

      {/* Add section */}
      {showNewSection ? (
        <div className="px-4 py-2 border-t border-white/[0.06]">
          <input
            autoFocus
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSection()
              if (e.key === "Escape") setShowNewSection(false)
            }}
            onBlur={handleAddSection}
            placeholder="Nombre de la seccion"
            className="w-full bg-transparent text-sm font-bold text-shell-text placeholder:text-zinc-700 outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => setShowNewSection(true)}
          className="flex items-center gap-2 px-4 py-3 text-sm text-zinc-600 hover:text-zinc-400 w-full border-t border-white/[0.06] cursor-pointer"
        >
          <FolderPlus size={16} />
          Anadir seccion
        </button>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mt-4 border-t border-white/[0.06]">
          <div className="px-4 py-3">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">
              Completadas ({completed.length})
            </span>
          </div>
          {completed.map((task) => (
            <TaskItem key={task.id} task={task} onTap={() => onSelectTask(task)} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── HOY VIEW ─── */

function HoyView({
  tasks, getSubtasks, onSelectTask, onToggleTask,
}: {
  tasks: Task[]
  getSubtasks: (id: string) => Task[]
  onSelectTask: (t: Task) => void
  onToggleTask?: (id: string) => void
}) {
  const today = new Date()

  const overdue = tasks.filter(
    (t) => !t.completed && t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))
  )

  const todayTasks = tasks.filter(
    (t) => !t.completed && t.due_date && isToday(new Date(t.due_date))
  )

  const noDate = tasks.filter((t) => !t.completed && !t.due_date)

  return (
    <div>
      <div className="px-4 pt-6 pb-2">
        <h2 className="text-2xl font-bold text-shell-text">Hoy</h2>
        <p className="text-sm text-zinc-500 mt-1">
          {format(today, "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {overdue.length > 0 && (
        <div>
          <div className="px-4 py-2">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Vencidas</span>
          </div>
          {overdue.map((task) => {
            const subs = getSubtasks(task.id)
            return (
              <TaskItem
                key={task.id}
                task={task}
                subtaskCount={subs.length}
                subtaskDone={subs.filter((s) => s.completed).length}
                onTap={() => onSelectTask(task)}
                onToggle={onToggleTask}
              />
            )
          })}
        </div>
      )}

      {todayTasks.length > 0 && (
        <div>
          <div className="px-4 py-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Hoy</span>
          </div>
          {todayTasks.map((task) => {
            const subs = getSubtasks(task.id)
            return (
              <TaskItem
                key={task.id}
                task={task}
                subtaskCount={subs.length}
                subtaskDone={subs.filter((s) => s.completed).length}
                onTap={() => onSelectTask(task)}
                onToggle={onToggleTask}
              />
            )
          })}
        </div>
      )}

      {overdue.length === 0 && todayTasks.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-zinc-600 text-sm">Sin tareas para hoy</p>
        </div>
      )}

      {noDate.length > 0 && (
        <div className="mt-4 border-t border-white/[0.06]">
          <div className="px-4 py-2">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Sin fecha</span>
          </div>
          {noDate.map((task) => (
            <TaskItem key={task.id} task={task} onTap={() => onSelectTask(task)} onToggle={onToggleTask} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── PROXIMO VIEW — KiteProp-style calendar ─── */

const TYPE_COLORS: Record<TaskType, { dot: string; badge: string; label: string }> = {
  tarea:             { dot: "bg-zinc-500",    badge: "bg-zinc-500/15 text-zinc-400",      label: "Tarea"         },
  visita:            { dot: "bg-amber-400",   badge: "bg-amber-500/15 text-amber-400",    label: "Visita"        },
  llamada:           { dot: "bg-blue-400",    badge: "bg-blue-500/15 text-blue-400",      label: "Llamada"       },
  reunion:           { dot: "bg-violet-400",  badge: "bg-violet-500/15 text-violet-400",  label: "Reunión"       },
  firma:             { dot: "bg-emerald-400", badge: "bg-emerald-500/15 text-emerald-400", label: "Firma"        },
  cafe:              { dot: "bg-yellow-400",  badge: "bg-yellow-500/15 text-yellow-400",  label: "Café"          },
  item_valor:        { dot: "bg-pink-400",    badge: "bg-pink-500/15 text-pink-400",      label: "Item de valor" },
  item_valor_masivo: { dot: "bg-teal-400",    badge: "bg-teal-500/15 text-teal-400",      label: "Valor masivo"  },
}

const TYPE_ICON_MAP: Record<TaskType, React.ReactNode> = {
  tarea:             <CheckSquare size={12} />,
  visita:            <MapPin      size={12} />,
  llamada:           <Phone       size={12} />,
  reunion:           <Users       size={12} />,
  firma:             <PenLine     size={12} />,
  cafe:              <CheckSquare size={12} />,
  item_valor:        <CheckSquare size={12} />,
  item_valor_masivo: <CheckSquare size={12} />,
}

function ProximoView({
  tasks, onSelectTask,
}: {
  tasks: Task[]
  onSelectTask: (t: Task) => void
}) {
  const { contacts } = useContactStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterType, setFilterType] = useState<TaskType | "">("")
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [filterPriority, setFilterPriority] = useState<1|2|3|4|0>(0)
  const [showPrioDropdown, setShowPrioDropdown] = useState(false)
  const [hoveredTask, setHoveredTask] = useState<{ task: Task; x: number; y: number } | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const filteredTasks = tasks.filter((t) => {
    if (!t.due_date || t.completed) return false
    if (filterType && (t.task_type ?? "tarea") !== filterType) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const getTasksForDay = (day: Date) =>
    filteredTasks.filter((t) => isSameDay(new Date(t.due_date!), day))

  const getContact = (id: string | null | undefined) =>
    id ? contacts.find((c) => c.id === id) : null

  return (
    <div className="flex flex-col h-full">
      {/* Filters bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        {/* Tipo filter */}
        <div className="relative">
          <button
            onClick={() => { setShowTypeDropdown(!showTypeDropdown); setShowPrioDropdown(false) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
              filterType
                ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
            }`}
          >
            Tipo
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          {showTypeDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-1 z-30 shadow-xl min-w-[140px]">
              <button
                onClick={() => { setFilterType(""); setShowTypeDropdown(false) }}
                className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-300 cursor-pointer font-bold"
              >
                Tipo
              </button>
              {(Object.keys(TASK_TYPES) as TaskType[]).map((key) => (
                <button
                  key={key}
                  onClick={() => { setFilterType(key); setShowTypeDropdown(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-300 cursor-pointer"
                >
                  <span className={`w-2 h-2 rounded-full ${TYPE_COLORS[key].dot}`} />
                  {TASK_TYPES[key].label}
                  {filterType === key && <span className="ml-auto text-zinc-500">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Prioridad filter */}
        <div className="relative">
          <button
            onClick={() => { setShowPrioDropdown(!showPrioDropdown); setShowTypeDropdown(false) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
              filterPriority
                ? "border-blue-500/40 bg-blue-500/10 text-blue-400"
                : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
            }`}
          >
            {filterPriority ? `P${filterPriority}` : "Prioridad"}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          {showPrioDropdown && (
            <div className="absolute top-full mt-1 left-0 bg-[#1e1e2c] rounded-xl border border-white/[0.08] py-1 z-30 shadow-xl min-w-[120px]">
              <button
                onClick={() => { setFilterPriority(0); setShowPrioDropdown(false) }}
                className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs text-zinc-300 cursor-pointer font-bold"
              >
                Prioridad
              </button>
              {([1,2,3,4] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => { setFilterPriority(p); setShowPrioDropdown(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-white/[0.04] text-xs cursor-pointer"
                >
                  <span className={`text-xs font-bold ${p===1?"text-red-400":p===2?"text-orange-400":p===3?"text-blue-400":"text-zinc-500"}`}>
                    P{p}
                  </span>
                  {filterPriority === p && <span className="ml-auto text-zinc-500">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {(filterType || filterPriority > 0) && (
          <button
            onClick={() => { setFilterType(""); setFilterPriority(0) }}
            className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            Limpiar
          </button>
        )}

        {/* Month nav */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-shell-text capitalize min-w-[120px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </span>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-[11px] text-blue-400 hover:bg-blue-500/10 px-2 py-1 rounded-lg cursor-pointer"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-white/[0.06] rounded-lg text-zinc-400 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"].map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "minmax(80px, 1fr)" }}>
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth)
          const today = isToday(day)
          const dayTasks = getTasksForDay(day)
          const dateKey = format(day, "yyyy-MM-dd")

          return (
            <div
              key={dateKey}
              className={`border-r border-b border-white/[0.04] p-1 min-h-[80px] ${
                today ? "bg-blue-500/[0.04]" : ""
              } ${!inMonth ? "opacity-40" : ""}`}
            >
              {/* Day number */}
              <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                today ? "bg-blue-500 text-white" : "text-zinc-400"
              }`}>
                {format(day, "d")}
              </div>

              {/* Task chips */}
              <div className="flex flex-col gap-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const type = (task.task_type ?? "tarea") as TaskType
                  const colors = TYPE_COLORS[type]
                  return (
                    <button
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).closest("button")?.getBoundingClientRect()
                        if (rect) setHoveredTask({ task, x: rect.left, y: rect.top })
                      }}
                      onMouseLeave={() => setHoveredTask(null)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity w-full text-left truncate ${colors.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                      <span className="truncate">{task.title}</span>
                    </button>
                  )
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[9px] text-zinc-600 px-1">+{dayTasks.length - 3} más</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredTask && (() => {
        const { task, x, y } = hoveredTask
        const type = (task.task_type ?? "tarea") as TaskType
        const contact = getContact(task.contact_id)
        return (
          <div
            className="fixed z-50 bg-[#1e1e2c] border border-white/[0.1] rounded-xl p-3 shadow-2xl w-56 pointer-events-none"
            style={{ left: Math.min(x + 4, window.innerWidth - 240), top: Math.max(y - 8, 60) }}
          >
            <p className="text-sm font-semibold text-shell-text mb-2 leading-snug">{task.title}</p>
            {task.due_date && (
              <p className="text-[11px] text-zinc-500 mb-1">
                {format(new Date(task.due_date), "EEEE d 'de' MMMM", { locale: es })}
              </p>
            )}
            <div className="flex items-center gap-1 mb-2">
              <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${TYPE_COLORS[type].badge}`}>
                {TYPE_ICON_MAP[type]}
                {TYPE_COLORS[type].label}
              </span>
              {task.priority < 4 && (
                <span className={`text-[10px] font-bold ${
                  task.priority===1?"text-red-400":task.priority===2?"text-orange-400":"text-blue-400"
                }`}>P{task.priority}</span>
              )}
            </div>
            {contact && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 border-t border-white/[0.06] pt-2">
                <Users size={11} className="shrink-0 text-zinc-600" />
                {contact.first_name} {contact.last_name}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
