"use client"

import { useState } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2, CheckSquare, MapPin, Phone, Users, PenLine, Coffee, Gift, Megaphone, CornerDownRight } from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"
import { useTaskStore, TASK_TYPES, type TaskType } from "@/lib/stores/taskStore"
import { QuickAddTask } from "./QuickAddTask"
import type { Task } from "@/lib/stores/taskStore"

const PRIORITY_BORDER: Record<number, string> = {
  1: "rgb(239 68 68)",
  2: "rgb(249 115 22)",
  3: "rgb(59 130 246)",
  4: "rgb(82 82 91)",
}

const PRIORITY_BG: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-blue-500",
  4: "bg-zinc-600",
}

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  tarea:             <CheckSquare size={12} />,
  visita:            <MapPin      size={12} />,
  llamada:           <Phone       size={12} />,
  reunion:           <Users       size={12} />,
  firma:             <PenLine     size={12} />,
  cafe:              <Coffee      size={12} />,
  item_valor:        <Gift        size={12} />,
  item_valor_masivo: <Megaphone   size={12} />,
}

interface BoardColumnProps {
  title: string
  sectionId: string | null
  tasks: Task[]
  showCompleted: boolean
  onSelectTask: (t: Task) => void
  draggedTaskId: string | null
  onDragStart: (id: string) => void
  onDrop: (sectionId: string | null) => void
  onToggleTask?: (id: string) => void
  onMobileAdd?: (sectionId: string | null) => void
  isMobile?: boolean
}

export function BoardColumn({
  title, sectionId, tasks, showCompleted, onSelectTask,
  draggedTaskId, onDragStart, onDrop, onToggleTask,
  onMobileAdd, isMobile,
}: BoardColumnProps) {
  const { renameSection, deleteSection, toggleTask, tasks: allTasks } = useTaskStore()
  const doToggle = (id: string) => onToggleTask ? onToggleTask(id) : toggleTask(id)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameName, setRenameName] = useState(title)
  const [isDragOver, setIsDragOver] = useState(false)

  const incomplete = tasks.filter((t) => !t.completed)
  const completed = showCompleted ? tasks.filter((t) => t.completed) : []

  const handleRename = () => {
    if (sectionId && renameName.trim()) renameSection(sectionId, renameName.trim())
    setRenaming(false)
    setShowMenu(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDrop(sectionId)
  }

  const getSubtasks = (taskId: string) => allTasks.filter((t) => t.parent_id === taskId)

  return (
    <div
      className={`flex flex-col self-start shrink-0 w-[92vw] lg:w-72 rounded-2xl border transition-colors ${
        isDragOver
          ? "bg-blue-500/[0.04] border-blue-500/30"
          : "bg-surface-overlay border-border-subtle"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 h-10 shrink-0">
        <div className="flex items-center gap-2">
          {renaming ? (
            <input
              autoFocus
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename()
                if (e.key === "Escape") { setRenaming(false); setRenameName(title) }
              }}
              className="bg-transparent text-sm font-bold text-text-primary outline-none w-36"
            />
          ) : (
            <span className="text-xs font-bold text-text-primary uppercase tracking-widest">{title}</span>
          )}
          <span className="text-xs text-text-muted font-medium">{incomplete.length}</span>
        </div>
        {sectionId && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-surface-overlay-hover rounded-lg cursor-pointer text-text-muted hover:text-text-secondary"
            >
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#1e1e2c] rounded-xl border border-border-default py-1 z-20 shadow-xl min-w-[140px]">
                <button
                  onClick={() => { setRenaming(true); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-surface-overlay text-xs text-text-secondary cursor-pointer"
                >
                  <Pencil size={13} /> Renombrar
                </button>
                <button
                  onClick={() => { if (sectionId) deleteSection(sectionId); setShowMenu(false) }}
                  className="flex items-center gap-2 px-3 py-2 w-full hover:bg-red-500/10 text-xs text-red-400 cursor-pointer"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 px-2 pb-2">
        {incomplete.map((task) => {
          const subs = getSubtasks(task.id)
          return (
            <TaskCard
              key={task.id}
              task={task}
              subtaskCount={subs.length}
              subtaskDone={subs.filter((s) => s.completed).length}
              onTap={() => onSelectTask(task)}
              onToggle={() => doToggle(task.id)}
              onDragStart={() => onDragStart(task.id)}
              isDragging={draggedTaskId === task.id}
            />
          )
        })}

        {completed.length > 0 && (
          <>
            <div className="px-1 pt-1">
              <span className="text-xs md:text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                Completadas {completed.length}
              </span>
            </div>
            {completed.map((task) => {
              const subs = getSubtasks(task.id)
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  subtaskCount={subs.length}
                  subtaskDone={subs.filter((s) => s.completed).length}
                  onTap={() => onSelectTask(task)}
                  onToggle={() => doToggle(task.id)}
                  onDragStart={() => onDragStart(task.id)}
                  isDragging={draggedTaskId === task.id}
                />
              )
            })}
          </>
        )}

        {/* Quick add */}
        {showQuickAdd && (
          <QuickAddTask initialSectionId={sectionId} onClose={() => setShowQuickAdd(false)} />
        )}
      </div>

      {/* Footer add button (inline Add Task) */}
      {!showQuickAdd && (
        <button
          onClick={() => {
            if (isMobile && onMobileAdd) {
              onMobileAdd(sectionId)
            } else {
              setShowQuickAdd(true)
            }
          }}
          className="flex items-center gap-2.5 px-3 py-2.5 mx-2 mb-2 rounded-xl text-sm text-text-muted hover:bg-surface-overlay transition-colors cursor-pointer border border-dashed border-border-subtle hover:border-border-default"
        >
          <Plus size={18} className="text-text-muted" />
          Añadir tarea
        </button>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  subtaskCount: number
  subtaskDone: number
  onTap: () => void
  onToggle: () => void
  onDragStart: () => void
  isDragging: boolean
}

export function TaskCard({ task, subtaskCount, subtaskDone, onTap, onToggle, onDragStart, isDragging }: TaskCardProps) {
  const dueLocal = task.due_date ? new Date(task.due_date.slice(0, 10) + "T12:00:00") : null
  const overdue = dueLocal && isPast(dueLocal) && !isToday(dueLocal) && !task.completed
  const effectiveType = (task.task_type ?? "tarea") as TaskType

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        onDragStart()
      }}
      onClick={onTap}
      className={`rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? "opacity-40 scale-[0.97]"
          : task.completed
            ? "bg-white/[0.01] border-border-subtle opacity-60 cursor-pointer"
            : "bg-surface-overlay border-border-subtle hover:border-border-default hover:bg-surface-overlay-hover"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Priority circle */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
            task.completed ? `${PRIORITY_BG[task.priority ?? 4]} border-transparent` : ""
          }`}
          style={{
            borderColor: !task.completed ? PRIORITY_BORDER[task.priority ?? 4] : undefined,
          }}
        >
          {task.completed && (
            <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
              <path d="M1 3.5L3.5 6L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${task.completed ? "line-through text-text-muted" : "text-text-primary"}`}>
            {task.title}
          </p>

          {task.description && (
            <p className="text-xs text-text-muted truncate mt-0.5 max-w-[95%]">
              {task.description}
            </p>
          )}

          {/* Meta row */}
          {(task.due_date || subtaskCount > 0 || effectiveType !== "tarea") && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {task.due_date && (
                <span className={`text-xs ${overdue ? "text-red-400" : "text-text-muted"}`}>
                  {format(new Date(task.due_date.slice(0, 10) + "T12:00:00"), "d MMM", { locale: es })}
                </span>
              )}
              {subtaskCount > 0 && (
                <span className="text-xs md:text-[10px] text-text-muted flex items-center gap-0.5">
                  <CornerDownRight size={10} className="shrink-0" />
                  {subtaskDone}/{subtaskCount}
                </span>
              )}
              {effectiveType !== "tarea" && TASK_TYPES[effectiveType] && (
                <span className="text-xs md:text-[10px] text-text-muted flex items-center gap-0.5">
                  {TYPE_ICONS[effectiveType]}
                  {TASK_TYPES[effectiveType].label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
