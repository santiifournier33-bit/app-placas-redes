"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Inbox, CalendarDays, Plus, FolderPlus,
  LayoutDashboard, List, Columns, CheckSquare2, X,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useTaskStore, TASK_TYPES, type TaskType } from "@/lib/stores/taskStore"
import { useContactStore } from "@/lib/stores/contactStore"
import { TaskItem } from "@/components/productividad/TaskItem"
import { TaskDetail } from "@/components/productividad/TaskDetail"
import { SectionHeader } from "@/components/productividad/SectionHeader"
import { BoardView } from "@/components/productividad/BoardView"
import { isToday, isPast, format } from "date-fns"
import { es } from "date-fns/locale"
import type { Task } from "@/lib/stores/taskStore"
import {
  CheckSquare, MapPin, Phone, Users, PenLine,
} from "lucide-react"

type View = "bandeja" | "hoy"
type DisplayMode = "lista" | "panel"

const viewConfig = [
  { key: "bandeja" as const, label: "Bandeja", icon: Inbox },
  { key: "hoy" as const, label: "Hoy", icon: CalendarDays },
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
  const [fabOpen, setFabOpen] = useState(false)
  const [fabText, setFabText] = useState("")

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

  // ContextualFAB on mobile dispatches `fab:new-task` from the bottom-right
  // FAB; we open a Sheet with a quick-create input. Keyboard auto-focuses
  // via Radix Sheet's initial focus, no manual ref needed.
  useEffect(() => {
    const open = () => setFabOpen(true)
    window.addEventListener("fab:new-task", open)
    return () => window.removeEventListener("fab:new-task", open)
  }, [])

  const handleFabSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fabText.trim()) return
    addTask(fabText.trim(), null)
    setFabText("")
    setFabOpen(false)
  }

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
    return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-surface-overlay rounded-xl" /></div>
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
            <div className="absolute right-0 top-full mt-1 bg-[#1e1e2c] rounded-xl border border-border-default py-2 z-30 shadow-xl w-52">
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

      {/* Quick-add Sheet (triggered by mobile FAB fab:new-task) */}
      <Sheet open={fabOpen} onOpenChange={setFabOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Nueva tarea</SheetTitle>
            <SheetDescription>Se agrega a la bandeja sin sección.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleFabSubmit} className="px-6 pb-6 flex flex-col gap-3">
            <Input
              autoFocus
              value={fabText}
              onChange={(e) => setFabText(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              className="text-base"
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setFabOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!fabText.trim()}>
                Crear
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Completion toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#1e1e2c] border border-border-default rounded-2xl px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 whitespace-nowrap">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5L4 8L11 1" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm text-text-secondary">
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
          <div className="px-4 py-3 border-b border-border-subtle">
            <span className="text-sm font-bold text-text-primary">(Sin seccion)</span>
            <span className="text-xs text-text-muted font-medium ml-2">{unsectioned.length}</span>
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
          className="flex items-center gap-2 px-4 py-3 text-sm text-text-muted hover:text-text-secondary w-full cursor-pointer"
        >
          <Plus size={16} />
          Anadir tarea
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
          <p className="text-text-muted text-sm">Sin tareas para hoy</p>
        </div>
      )}

      {noDate.length > 0 && (
        <div className="mt-4 border-t border-border-subtle">
          <div className="px-4 py-2">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Sin fecha</span>
          </div>
          {noDate.map((task) => (
            <TaskItem key={task.id} task={task} onTap={() => onSelectTask(task)} onToggle={onToggleTask} />
          ))}
        </div>
      )}
    </div>
  )
}
