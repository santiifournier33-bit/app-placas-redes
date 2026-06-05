"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  Inbox, CalendarDays, CalendarRange, Plus, FolderPlus,
  LayoutDashboard, List, Columns, CheckSquare2, X,
} from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTaskStore, NO_SESSION } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { TaskItem } from "@/components/productividad/TaskItem"
import { TaskDetail } from "@/components/productividad/TaskDetail"
import { SectionHeader } from "@/components/productividad/SectionHeader"
import { BoardView } from "@/components/productividad/BoardView"
import { MobileAddTaskSheet } from "@/components/productividad/MobileAddTaskSheet"
import { ProximoView } from "@/components/productividad/ProximoView"
import { useIsMobile } from "@/lib/hooks/useIsMobile"
import { useHydrated } from "@/lib/hooks/useHydrated"
import { isToday, isPast, format } from "date-fns"
import { es } from "date-fns/locale"
import type { Task } from "@/lib/stores/taskStore"

type View = "bandeja" | "hoy" | "proximo"
type DisplayMode = "lista" | "panel"

const viewConfig = [
  { key: "bandeja" as const, label: "Bandeja", icon: Inbox },
  { key: "hoy" as const, label: "Hoy", icon: CalendarDays },
  { key: "proximo" as const, label: "Próximo", icon: CalendarRange },
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
  const mounted = useHydrated()
  const [toast, setToast] = useState<{ count: number; undoIds: string[] } | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const [mobileAddOpen, setMobileAddOpen] = useState(false)
  const [mobileAddSectionId, setMobileAddSectionId] = useState<string | null>(null)
  const [mobileAddDate, setMobileAddDate] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const handleAddForDay = useCallback((dateStr: string) => {
    setMobileAddSectionId(null)
    setMobileAddDate(dateStr)
    setMobileAddOpen(true)
  }, [])

  const formatMenuRef = useRef<HTMLDivElement>(null)

  const { tasks, sections, addTask, addSection, toggleTask, init: initTasks } = useTaskStore()
  const error = useTaskStore((s) => s.error)
  const clearError = useTaskStore((s) => s.clearError)
  const { init: initContacts } = useContactStore()

  useEffect(() => {
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

  // ContextualFAB ("Nueva tarea") dispatches this event on tap → open the
  // mobile add sheet. Keeps the FAB decoupled from this page's state.
  useEffect(() => {
    const open = () => {
      setMobileAddSectionId(null)
      setMobileAddDate(null)
      setMobileAddOpen(true)
    }
    window.addEventListener("fab:new-task", open)
    return () => window.removeEventListener("fab:new-task", open)
  }, [])

  // Auto-dismiss store errors after a few seconds (user can also tap to close).
  // Session-expired errors persist so the re-login action stays reachable.
  useEffect(() => {
    if (!error || error === NO_SESSION) return
    const t = setTimeout(() => clearError(), 6000)
    return () => clearTimeout(t)
  }, [error, clearError])

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
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <div className="animate-pulse h-8 w-40 bg-surface-overlay rounded-xl" />
          <div className="animate-pulse h-7 w-20 bg-surface-overlay rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          <div className="animate-pulse h-4 w-32 bg-surface-overlay rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="animate-pulse h-[22px] w-[22px] rounded-full bg-surface-overlay shrink-0" />
              <div className="animate-pulse h-4 bg-surface-overlay rounded" style={{ width: `${55 + ((i * 13) % 35)}%` }} />
            </div>
          ))}
        </div>
      </div>
    )
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
      {/* View toggles + format menu */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="bg-surface-2">
            {viewConfig.map(({ key, label, icon: Icon }) => (
              <TabsTrigger key={key} value={key} className="gap-1.5 data-[state=active]:bg-surface-1">
                <Icon size={14} strokeWidth={1.8} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Format menu */}
        <div className="relative" ref={formatMenuRef}>
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showFormatMenu ? "bg-surface-overlay-hover text-text-secondary" : "text-text-muted hover:bg-surface-overlay-hover hover:text-text-secondary"
            }`}
          >
            <LayoutDashboard size={15} />
            Formato
          </button>
          {showFormatMenu && (
            <div className="absolute right-0 top-full mt-1 bg-surface-2 rounded-xl border border-border-default py-2 z-30 shadow-xl w-52">
              {/* Vista section */}
              <div className="px-3 pb-1">
                <p className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Vista</p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setDisplayMode("lista")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center cursor-pointer transition-all ${
                      displayMode === "lista" ? "bg-surface-overlay-hover text-text-primary" : "text-text-muted hover:bg-surface-overlay"
                    }`}
                  >
                    <List size={13} /> Lista
                  </button>
                  <button
                    onClick={() => setDisplayMode("panel")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center cursor-pointer transition-all ${
                      displayMode === "panel" ? "bg-surface-overlay-hover text-text-primary" : "text-text-muted hover:bg-surface-overlay"
                    }`}
                  >
                    <Columns size={13} /> Panel
                  </button>
                </div>
              </div>

              <div className="border-t border-border-subtle mt-2 pt-2 px-3">
                <p className="text-xs md:text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Filtro</p>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center justify-between w-full cursor-pointer py-1"
                >
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <CheckSquare2 size={13} className="text-text-muted" />
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
              onMobileAdd={(secId) => {
                setMobileAddSectionId(secId)
                setMobileAddOpen(true)
              }}
              isMobile={isMobile}
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
              displayMode={displayMode}
              isMobile={isMobile}
              getSubtasks={getSubtasks}
              onSelectTask={setSelectedTask}
              onToggleTask={handleToggleTask}
              onAddForDay={handleAddForDay}
            />
          )}

        </div>

      </div>

      {/* Centered task detail modal (desktop) / bottom sheet (mobile) */}
      {selectedTask && (
        <TaskDetail
          key={selectedTask.id}
          task={selectedTask}
          onClose={() => {
            refreshSelected()
            setSelectedTask(null)
          }}
          onToggleTask={handleToggleTask}
          siblingIds={rootTasks.map(t => t.id)}
          onNavigate={(id) => {
            const next = tasks.find(t => t.id === id)
            if (next) setSelectedTask(next)
          }}
        />
      )}

      {/* Mobile Add Task Bottom Sheet (FAB + per-day add in Próximo). Desktop uses
          the inline QuickAddTask instead (rendered by BoardColumn / ProximoView). */}
      {isMobile && (
        <MobileAddTaskSheet
          open={mobileAddOpen}
          onOpenChange={setMobileAddOpen}
          initialSectionId={mobileAddSectionId}
          initialDate={mobileAddDate}
        />
      )}

      {/* Completion toast */}
      {toast && (
        <div
          className="fixed left-3 right-3 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 z-[200] flex items-center gap-3 bg-surface-2 border border-border-default rounded-2xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 lg:bottom-6"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom) + 12px)" }}
        >
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4 8L11 1" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm text-text-secondary flex-1 lg:flex-none">
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
            className="text-text-muted hover:text-text-secondary cursor-pointer ml-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Error toast — surfaces silent write/session failures (no more silent no-ops) */}
      {error && (
        <div
          role="alert"
          className="fixed left-3 right-3 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 z-[210] flex items-center gap-3 bg-red-500/15 border border-red-500/30 rounded-2xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 text-left lg:bottom-6"
          style={{ bottom: "calc(72px + env(safe-area-inset-bottom) + 12px)" }}
        >
          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <X size={14} className="text-red-400" />
          </div>
          <span className="text-sm text-red-200 flex-1">{error}</span>
          {error === NO_SESSION && (
            <Link
              href="/login"
              className="shrink-0 inline-flex items-center min-h-[44px] px-3 rounded-lg bg-red-500/25 text-xs font-semibold text-red-100 hover:bg-red-500/35 active:scale-95 transition-all touch-manipulation"
            >
              Volver a iniciar sesión
            </Link>
          )}
          <button
            onClick={clearError}
            className="shrink-0 inline-flex items-center min-h-[44px] px-2 text-xs font-semibold text-red-300 hover:text-red-200 active:scale-95 transition-all touch-manipulation"
          >
            Cerrar
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
  const isEmpty = tasks.length === 0 && sections.length === 0

  return (
    <div>
      {/* Empty state (no tasks, no sections) */}
      {isEmpty && newTaskSection !== "__none__" && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <Inbox size={28} className="text-text-muted" strokeWidth={1.5} />
          </div>
          <p className="text-base font-semibold text-text-primary">Bandeja vacía</p>
          <p className="text-sm text-text-muted mt-1 max-w-[16rem]">
            Agregá tu primera tarea con el botón <span className="text-brand-gold font-medium">+</span> o desde un contacto.
          </p>
        </div>
      )}

      {/* Unsectioned tasks */}
      {unsectioned.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
            <div className="w-4 shrink-0" /> {/* Spacer matching chevron width */}
            <span className="text-sm font-bold text-text-primary">(Sin sección)</span>
            <span className="text-xs text-text-muted font-medium">{unsectioned.length}</span>
          </div>
          <AnimatePresence initial={false}>
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
          </AnimatePresence>
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
            <AnimatePresence initial={false}>
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
            </AnimatePresence>
            {!collapsed && newTaskSection === sec.id && (
              <div className="px-4 py-2 border-b border-border-subtle">
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
                  className="w-full bg-transparent text-sm text-text-primary placeholder:text-zinc-700 outline-none"
                />
              </div>
            )}
            {!collapsed && newTaskSection !== sec.id && (
              <button
                onClick={() => { setNewTaskSection(sec.id); setNewTaskText("") }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text-secondary w-full border-b border-border-subtle cursor-pointer"
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
        <div className="px-4 py-2 border-b border-border-subtle">
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
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-zinc-700 outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => { setNewTaskSection("__none__"); setNewTaskText("") }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted hover:text-text-secondary w-full cursor-pointer"
        >
          <Plus size={14} />
          Añadir tarea
        </button>
      )}

      {/* Add section */}
      {showNewSection ? (
        <div className="px-4 py-2 border-t border-border-subtle">
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
            className="w-full bg-transparent text-sm font-bold text-text-primary placeholder:text-zinc-700 outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => setShowNewSection(true)}
          className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted hover:text-text-secondary w-full border-t border-border-subtle cursor-pointer"
        >
          <FolderPlus size={16} />
          Anadir seccion
        </button>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mt-4 border-t border-border-subtle">
          <div className="px-4 py-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Completadas ({completed.length})
            </span>
          </div>
          <AnimatePresence initial={false}>
            {completed.map((task) => (
              <TaskItem key={task.id} task={task} onTap={() => onSelectTask(task)} />
            ))}
          </AnimatePresence>
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
        <h2 className="text-2xl font-bold text-text-primary">Hoy</h2>
        <p className="text-sm text-text-muted mt-1">
          {format(today, "EEEE d 'de' MMMM", { locale: es })}
        </p>
      </div>

      {overdue.length > 0 && (
        <div>
          <div className="px-4 py-2">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Vencidas</span>
          </div>
          <AnimatePresence initial={false}>
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
          </AnimatePresence>
        </div>
      )}

      {todayTasks.length > 0 && (
        <div>
          <div className="px-4 py-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Hoy</span>
          </div>
          <AnimatePresence initial={false}>
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
          </AnimatePresence>
        </div>
      )}

      {overdue.length === 0 && todayTasks.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-text-muted text-sm">Sin tareas para hoy</p>
        </div>
      )}

      {noDate.length > 0 && (
        <div className="mt-4 border-t border-border-subtle">
          <div className="px-4 py-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Sin fecha</span>
          </div>
          <AnimatePresence initial={false}>
            {noDate.map((task) => (
              <TaskItem key={task.id} task={task} onTap={() => onSelectTask(task)} onToggle={onToggleTask} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
